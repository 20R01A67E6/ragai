from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import Document, QueryLog
from app.engine.vector_store import VectorStore
from app.engine.storage import delete_file
from app.schemas.common import DocumentResponse, QueryLogResponse

router = APIRouter(prefix="/history", tags=["User History"])


@router.get("/queries", response_model=list[QueryLogResponse])
async def get_query_history(
    limit: int = 50,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QueryLog)
        .where(QueryLog.user_id == user_id)
        .order_by(QueryLog.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.delete("/queries/{query_id}")
async def delete_query_log(
    query_id: int,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log = await db.get(QueryLog, query_id)
    if not log or log.user_id != user_id:
        raise HTTPException(404, "Query log not found")
    await db.delete(log)
    await db.commit()
    return {"deleted": query_id}


@router.get("/documents", response_model=list[DocumentResponse])
async def get_all_documents(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: int,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if not doc or doc.user_id != user_id:
        raise HTTPException(404, "Document not found")

    store = VectorStore(mode=doc.mode, namespace=doc.namespace, user_id=user_id)
    await store.delete_by_metadata({"doc_id": str(doc_id)})
    if doc.filename:
        delete_file(doc.filename)
    await db.delete(doc)
    await db.commit()
    return {"deleted": doc_id}


@router.delete("/all")
async def delete_all_history(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(delete(QueryLog).where(QueryLog.user_id == user_id))
    await db.commit()
    return {"cleared": True}
