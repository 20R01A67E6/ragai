import time
from pathlib import Path
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.db.database import get_db, AsyncSessionLocal
from app.db.models import Document, QueryLog
from app.engine.vector_store import VectorStore
from app.engine.storage import upload_file
from app.engine.chunker import chunk_text
from app.engine.llm_factory import generate
from app.utils.file_parser import parse_file, SUPPORTED_EXTENSIONS
from app.utils.prompts import build_rag_prompt
from app.schemas.common import QueryRequest, QueryResponse, DocumentResponse, SourceDocument, CollectionStats

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base Bot"])
MODE = "knowledge_base"


async def _ingest_file(content: bytes, filename: str, namespace: str, doc_id: int, user_id: str) -> None:
    async with AsyncSessionLocal() as db:
        try:
            text, file_type = await parse_file(content, filename)
            chunks = chunk_text(text)
            store = VectorStore(mode=MODE, namespace=namespace, user_id=user_id)
            ids = [f"{user_id}_{doc_id}_{i}" for i in range(len(chunks))]
            metadatas = [{"source": filename, "doc_id": str(doc_id), "chunk": str(i)} for i in range(len(chunks))]
            await store.upsert(ids=ids, texts=chunks, metadatas=metadatas)

            doc = await db.get(Document, doc_id)
            doc.chunk_count = len(chunks)
            doc.file_type = file_type
            doc.status = "ready"
            await db.commit()
        except Exception as e:
            doc = await db.get(Document, doc_id)
            if doc:
                doc.status = "error"
                doc.error_message = str(e)
                await db.commit()
            logger.error(f"KB ingestion error for doc {doc_id}: {e}")


@router.post("/ingest", response_model=List[DocumentResponse])
async def bulk_ingest(
    files: List[UploadFile] = File(...),
    namespace: str = Form(default="default"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    docs = []
    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            continue

        content = await file.read()
        r2_key, file_url = upload_file(content, file.filename, user_id)

        doc = Document(
            user_id=user_id,
            filename=r2_key,
            original_name=file.filename,
            file_url=file_url,
            mode=MODE, namespace=namespace,
            file_type=ext.lstrip("."), status="processing",
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        background_tasks.add_task(_ingest_file, content, file.filename, namespace, doc.id, user_id)
        docs.append(doc)

    return docs


@router.post("/query", response_model=QueryResponse)
async def query_kb(
    req: QueryRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t0 = time.monotonic()
    store = VectorStore(mode=MODE, namespace=req.namespace, user_id=user_id)
    results = await store.query(req.query, n_results=req.top_k)

    if not results:
        raise HTTPException(404, "Knowledge base is empty. Ingest documents first.")

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


@router.get("/stats", response_model=CollectionStats)
async def collection_stats(
    namespace: str = "default",
    user_id: str = Depends(get_current_user),
):
    store = VectorStore(mode=MODE, namespace=namespace, user_id=user_id)
    return CollectionStats(
        collection_name=store.collection_name,
        document_count=await store.count(),
        mode=MODE, namespace=namespace,
    )


@router.delete("/reset")
async def reset_kb(
    namespace: str = "default",
    user_id: str = Depends(get_current_user),
):
    store = VectorStore(mode=MODE, namespace=namespace, user_id=user_id)
    await store.reset_collection()
    return {"reset": True, "namespace": namespace}
