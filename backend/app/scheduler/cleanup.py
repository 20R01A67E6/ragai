"""
Monthly cleanup job — runs on the 1st of every month at midnight.
Deletes documents (+ their storage files and embeddings) older than 30 days.
query_logs and user accounts are never touched.
"""
from datetime import datetime, timedelta, timezone

from loguru import logger
from sqlalchemy import select, delete

from app.db.database import AsyncSessionLocal
from app.db.models import Document
from app.engine.storage import delete_file
from app.engine.vector_store import get_pg_pool


async def run_monthly_cleanup() -> None:
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=30)
    logger.info(f"Monthly cleanup: removing documents created before {cutoff.date()}")

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Document).where(Document.created_at < cutoff)
        )
        old_docs = result.scalars().all()

        if not old_docs:
            logger.info("Monthly cleanup: nothing to delete")
            return

        pool = await get_pg_pool()

        for doc in old_docs:
            # 1. Remove file from Supabase Storage
            if doc.filename:
                delete_file(doc.filename)

            # 2. Remove embeddings from pgvector
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    DELETE FROM embeddings
                    WHERE user_id  = $1
                      AND mode     = $2
                      AND namespace = $3
                      AND metadata @> $4::jsonb
                    """,
                    doc.user_id,
                    doc.mode,
                    doc.namespace,
                    f'{{"document_id": "{doc.id}"}}',
                )

            # 3. Remove document record (cascade deletes its query_logs FK rows)
            await db.delete(doc)

        await db.commit()
        logger.info(f"Monthly cleanup: removed {len(old_docs)} document(s) and their data")
