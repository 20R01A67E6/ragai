import time
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String
from loguru import logger

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.db.models import Document, QueryLog
from app.engine.vector_store import VectorStore
from app.engine.storage import upload_file, delete_file
from app.engine.chunker import chunk_text
from app.engine.llm_factory import generate
from app.utils.file_parser import parse_file, SUPPORTED_EXTENSIONS
from app.utils.prompts import build_rag_prompt
from app.schemas.common import QueryRequest, QueryResponse, DocumentResponse, SourceDocument

router = APIRouter(prefix="/personal-docs", tags=["Personal Docs Q&A"])
MODE = "personal_docs"


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    namespace: str = Form(default="default"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    content = await file.read()
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(413, "File too large")

    r2_key, file_url = upload_file(content, file.filename, user_id)

    doc = Document(
        user_id=user_id,
        filename=r2_key,
        original_name=file.filename,
        file_url=file_url,
        mode=MODE,
        namespace=namespace,
        file_type=ext.lstrip("."),
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    try:
        text, file_type = await parse_file(content, file.filename)
        chunks = chunk_text(text)

        store = VectorStore(mode=MODE, namespace=namespace, user_id=user_id)
        ids = [f"{user_id}_{doc.id}_{i}" for i in range(len(chunks))]
        metadatas = [{"source": file.filename, "doc_id": str(doc.id), "chunk": str(i)} for i in range(len(chunks))]
        await store.upsert(ids=ids, texts=chunks, metadatas=metadatas)

        doc.chunk_count = len(chunks)
        doc.file_type = file_type
        doc.status = "ready"
        await db.commit()
        await db.refresh(doc)
        logger.info(f"Uploaded {file.filename} → {len(chunks)} chunks [user={user_id}]")
    except Exception as e:
        doc.status = "error"
        doc.error_message = str(e)
        await db.commit()
        raise HTTPException(500, f"Processing failed: {e}")

    return doc


@router.post("/query", response_model=QueryResponse)
async def query_docs(
    req: QueryRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t0 = time.monotonic()
    store = VectorStore(mode=MODE, namespace=req.namespace, user_id=user_id)
    results = await store.query(req.query, n_results=req.top_k)

    if not results:
        raise HTTPException(404, "No documents found. Upload documents first.")

    system, prompt = build_rag_prompt(results, req.query)
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
async def list_documents(
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


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: int,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if not doc or doc.mode != MODE or doc.user_id != user_id:
        raise HTTPException(404, "Document not found")

    store = VectorStore(mode=MODE, namespace=doc.namespace, user_id=user_id)
    await store.delete_by_metadata({"doc_id": str(doc_id)})
    if doc.filename:
        delete_file(doc.filename)
    await db.delete(doc)
    await db.commit()
    return {"deleted": doc_id}
