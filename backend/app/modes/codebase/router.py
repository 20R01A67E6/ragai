import time
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String
from loguru import logger

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import Document, QueryLog
from app.engine.vector_store import VectorStore
from app.engine.storage import upload_file
from app.engine.chunker import chunk_code
from app.engine.llm_factory import generate
from app.utils.prompts import build_code_prompt
from app.schemas.common import QueryRequest, QueryResponse, DocumentResponse, SourceDocument

router = APIRouter(prefix="/codebase", tags=["Codebase Assistant"])
MODE = "codebase"

CODE_EXTENSIONS = {
    ".py": "python", ".js": "javascript", ".ts": "typescript",
    ".java": "java", ".go": "go", ".rs": "rust",
    ".cpp": "cpp", ".c": "c", ".cs": "csharp",
    ".rb": "ruby", ".php": "php", ".swift": "swift",
    ".kt": "kotlin", ".sh": "bash", ".yml": "yaml", ".yaml": "yaml",
}


@router.post("/upload", response_model=DocumentResponse)
async def upload_code_file(
    file: UploadFile = File(...),
    namespace: str = Form(default="default"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = Path(file.filename).suffix.lower()
    language = CODE_EXTENSIONS.get(ext, "text")
    content = await file.read()
    code_text = content.decode("utf-8", errors="replace")

    r2_key, file_url = upload_file(content, file.filename, user_id)

    doc = Document(
        user_id=user_id,
        filename=r2_key,
        original_name=file.filename,
        file_url=file_url,
        mode=MODE, namespace=namespace,
        file_type=language, status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    try:
        chunks_with_meta = chunk_code(code_text, language=language)
        store = VectorStore(mode=MODE, namespace=namespace, user_id=user_id)

        ids = [f"{user_id}_{doc.id}_{i}" for i in range(len(chunks_with_meta))]
        texts = [c[0] for c in chunks_with_meta]
        metadatas = [
            {**c[1], "source": file.filename, "doc_id": str(doc.id), "chunk": str(i)}
            for i, c in enumerate(chunks_with_meta)
        ]
        await store.upsert(ids=ids, texts=texts, metadatas=metadatas)

        doc.chunk_count = len(chunks_with_meta)
        doc.status = "ready"
        await db.commit()
        await db.refresh(doc)
        logger.info(f"Indexed {file.filename} as {language}: {len(chunks_with_meta)} chunks [user={user_id}]")
    except Exception as e:
        doc.status = "error"
        doc.error_message = str(e)
        await db.commit()
        raise HTTPException(500, f"Code indexing failed: {e}")

    return doc


@router.post("/query", response_model=QueryResponse)
async def query_codebase(
    req: QueryRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t0 = time.monotonic()
    store = VectorStore(mode=MODE, namespace=req.namespace, user_id=user_id)
    results = await store.query(req.query, n_results=req.top_k)

    if not results:
        raise HTTPException(404, "No code indexed in this namespace.")

    system, prompt = build_code_prompt(results, req.query)
    llm_resp = await generate(prompt=prompt, system=system, provider=req.llm_provider)
    latency = (time.monotonic() - t0) * 1000

    log = QueryLog(
        user_id=user_id, mode=MODE, namespace=req.namespace,
        query=req.query, answer=llm_resp.content, sources_count=len(results),
        llm_provider=llm_resp.provider, llm_model=llm_resp.model, latency_ms=latency,
    )
    db.add(log)
    await db.commit()

    return QueryResponse(
        answer=llm_resp.content,
        sources=[SourceDocument(**r) for r in results],
        query=req.query, mode=MODE,
        llm_provider=llm_resp.provider, llm_model=llm_resp.model, latency_ms=latency,
        fallback_notice=llm_resp.fallback_notice,
    )


@router.get("/documents", response_model=list[DocumentResponse])
async def list_code_files(
    namespace: str = "default",
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(
            cast(Document.user_id, String) == str(user_id),
            Document.mode == MODE,
            Document.namespace == namespace,
        )
    )
    return result.scalars().all()
