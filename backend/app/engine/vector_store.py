"""
pgvector-backed VectorStore — replaces ChromaDB.
Each vector row is scoped to (user_id, mode, namespace) for full data isolation.
"""
from __future__ import annotations

import json
from typing import List, Dict, Any, Optional

import asyncpg
import numpy as np
from pgvector.asyncpg import register_vector
from loguru import logger

from app.core.config import settings
from app.engine.embeddings import embed_texts, embed_query

_pool: asyncpg.Pool | None = None


async def _init_conn(conn: asyncpg.Connection) -> None:
    await register_vector(conn)


async def get_pg_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            settings.asyncpg_db_url,
            min_size=2,
            max_size=10,
            init=_init_conn,
            statement_cache_size=0,
            max_cached_statement_lifetime=0,
        )
    return _pool


async def close_pg_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def _to_jsonb_str(meta: Dict[str, Any]) -> str:
    """Stringify all values — consistent with ChromaDB's string-only metadata."""
    return json.dumps({k: str(v) for k, v in meta.items()})


def _from_jsonb(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, str):
        return json.loads(raw)
    if isinstance(raw, dict):
        return raw
    return {}


class VectorStore:
    def __init__(self, mode: str, namespace: str = "default", user_id: str = ""):
        self.mode = mode
        self.namespace = namespace
        self.user_id = user_id
        self.collection_name = f"{mode}_{namespace}"

    async def upsert(
        self,
        ids: List[str],
        texts: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        embeddings = embed_texts(texts)
        pool = await get_pg_pool()

        rows = [
            (
                ids[i],
                self.user_id,
                self.mode,
                self.namespace,
                texts[i],
                _to_jsonb_str(metadatas[i] if metadatas else {}),
                np.array(embeddings[i], dtype=np.float32),
            )
            for i in range(len(ids))
        ]

        async with pool.acquire() as conn:
            await conn.executemany(
                """
                INSERT INTO embeddings (id, user_id, mode, namespace, text, metadata, embedding)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
                ON CONFLICT (id) DO UPDATE
                    SET text = EXCLUDED.text,
                        metadata = EXCLUDED.metadata,
                        embedding = EXCLUDED.embedding
                """,
                rows,
            )
        logger.info(f"Upserted {len(ids)} vectors [user={self.user_id} mode={self.mode} ns={self.namespace}]")

    async def query(
        self,
        query_text: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        embedding = np.array(embed_query(query_text), dtype=np.float32)
        pool = await get_pg_pool()

        extra_filter = ""
        params: list = [self.user_id, self.mode, self.namespace, embedding, n_results]
        if where:
            # Use JSONB containment: metadata @> '{"key": "val"}'
            params.append(_to_jsonb_str(where))
            extra_filter = f"AND metadata @> ${len(params)}::jsonb"

        sql = f"""
            SELECT id, text, metadata,
                   1 - (embedding <=> $4) AS score
            FROM embeddings
            WHERE user_id::text = $1
              AND mode    = $2
              AND namespace = $3
              {extra_filter}
            ORDER BY embedding <=> $4
            LIMIT $5
        """

        async with pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)

        return [
            {
                "id": row["id"],
                "text": row["text"],
                "metadata": _from_jsonb(row["metadata"]),
                "score": float(row["score"]),
            }
            for row in rows
        ]

    async def delete_by_metadata(self, where: Dict[str, Any]) -> None:
        pool = await get_pg_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM embeddings
                WHERE user_id::text = $1
                  AND mode          = $2
                  AND namespace     = $3
                  AND metadata @> $4::jsonb
                """,
                self.user_id,
                self.mode,
                self.namespace,
                _to_jsonb_str(where),
            )
        logger.info(f"Deleted vectors [user={self.user_id} where={where}]")

    async def count(self) -> int:
        pool = await get_pg_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT COUNT(*) AS n FROM embeddings WHERE user_id::text=$1 AND mode=$2 AND namespace=$3",
                self.user_id, self.mode, self.namespace,
            )
        return int(row["n"])

    async def reset_collection(self) -> None:
        pool = await get_pg_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM embeddings WHERE user_id::text=$1 AND mode=$2 AND namespace=$3",
                self.user_id, self.mode, self.namespace,
            )
        logger.warning(f"Reset [user={self.user_id} mode={self.mode} ns={self.namespace}]")


async def list_all_collections(user_id: str) -> List[str]:
    """Return distinct mode_namespace strings for the given user."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT DISTINCT mode || '_' || namespace AS col FROM embeddings WHERE user_id::text=$1",
            user_id,
        )
    return [row["col"] for row in rows]
