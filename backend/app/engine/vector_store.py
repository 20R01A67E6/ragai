"""
pgvector-backed VectorStore with hybrid retrieval.

Each vector row is scoped to (user_id, mode, namespace) for full data isolation.

Query pipeline:
  1. Semantic search   — pgvector cosine ANN over 768-dim BGE embeddings
  2. Keyword search    — BM25 over the stored chunk text
  3. Fusion            — 0.7 * semantic + 0.3 * BM25 (both min-max normalised)
  4. Rerank            — FlashRank cross-encoder trims the fused pool to top-k
"""
from __future__ import annotations

import json
import re
from typing import List, Dict, Any, Optional

import asyncpg
import numpy as np
from pgvector.asyncpg import register_vector
from rank_bm25 import BM25Okapi
from loguru import logger

from app.core.config import settings
from app.engine.embeddings import get_embedding, get_embeddings_batch
from app.engine.reranker import rerank

_pool: asyncpg.Pool | None = None

# Retrieval tuning ------------------------------------------------------------
SEMANTIC_WEIGHT = 0.7
BM25_WEIGHT = 0.3
CANDIDATE_MULTIPLIER = 4       # over-fetch this * top_k before reranking
MIN_CANDIDATES = 20            # ...but always consider at least this many
BM25_CORPUS_CAP = 5000         # bound in-memory BM25 index size per query


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


def _tokenize(text: str) -> List[str]:
    return re.findall(r"\w+", text.lower())


async def bm25_search(
    query: str,
    user_id: str,
    mode: str,
    namespace: str,
    top_k: int = 10,
    where: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Keyword search: build a BM25 index over the user's chunks and rank them.

    Scores are min-max normalised to [0, 1] so they fuse cleanly with cosine
    similarity. Only rows with a positive BM25 score are returned.
    """
    pool = await get_pg_pool()

    params: list = [user_id, mode, namespace]
    extra_filter = ""
    if where:
        params.append(_to_jsonb_str(where))
        extra_filter = f"AND metadata @> ${len(params)}::jsonb"
    params.append(BM25_CORPUS_CAP)

    sql = f"""
        SELECT id, text, metadata
        FROM embeddings
        WHERE user_id::text = $1
          AND mode      = $2
          AND namespace = $3
          {extra_filter}
        LIMIT ${len(params)}
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *params)

    if not rows:
        return []
    if len(rows) >= BM25_CORPUS_CAP:
        logger.warning(
            f"BM25 corpus capped at {BM25_CORPUS_CAP} rows "
            f"[user={user_id} mode={mode} ns={namespace}]"
        )

    corpus = [_tokenize(r["text"]) for r in rows]
    bm25 = BM25Okapi(corpus)
    scores = bm25.get_scores(_tokenize(query))
    top_score = float(max(scores)) if len(scores) else 0.0
    if top_score <= 0:
        return []

    ranked_idx = sorted(range(len(rows)), key=lambda i: scores[i], reverse=True)[:top_k]
    return [
        {
            "id": rows[i]["id"],
            "text": rows[i]["text"],
            "metadata": _from_jsonb(rows[i]["metadata"]),
            "score": float(scores[i]) / top_score,
        }
        for i in ranked_idx
        if scores[i] > 0
    ]


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
        # Store the real BGE embedding *and* the chunk content/index alongside it,
        # so both semantic and BM25 retrieval read from the same rows.
        embeddings = await get_embeddings_batch(texts)
        pool = await get_pg_pool()

        rows = []
        for i in range(len(ids)):
            meta = metadatas[i] if metadatas else {}
            try:
                chunk_index = int(meta.get("chunk", i))
            except (TypeError, ValueError):
                chunk_index = i
            rows.append(
                (
                    ids[i],
                    self.user_id,
                    self.mode,
                    self.namespace,
                    texts[i],
                    chunk_index,
                    _to_jsonb_str(meta),
                    np.array(embeddings[i], dtype=np.float32),
                )
            )

        async with pool.acquire() as conn:
            await conn.executemany(
                """
                INSERT INTO embeddings
                    (id, user_id, mode, namespace, text, chunk_index, metadata, embedding)
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
                ON CONFLICT (id) DO UPDATE
                    SET text        = EXCLUDED.text,
                        chunk_index = EXCLUDED.chunk_index,
                        metadata    = EXCLUDED.metadata,
                        embedding   = EXCLUDED.embedding
                """,
                rows,
            )
        logger.info(f"Upserted {len(ids)} vectors [user={self.user_id} mode={self.mode} ns={self.namespace}]")

    async def _semantic_search(
        self,
        query_text: str,
        candidate_k: int,
        where: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        embedding = np.array(await get_embedding(query_text), dtype=np.float32)
        pool = await get_pg_pool()

        params: list = [self.user_id, self.mode, self.namespace, embedding, candidate_k]
        extra_filter = ""
        if where:
            params.append(_to_jsonb_str(where))
            extra_filter = f"AND metadata @> ${len(params)}::jsonb"

        sql = f"""
            SELECT id, text, metadata,
                   1 - (embedding <=> $4) AS score
            FROM embeddings
            WHERE user_id::text = $1
              AND mode      = $2
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

    async def query(
        self,
        query_text: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
        rerank_results: bool = True,
    ) -> List[Dict[str, Any]]:
        """Hybrid semantic + BM25 retrieval, fused and reranked to `n_results`."""
        candidate_k = max(n_results * CANDIDATE_MULTIPLIER, MIN_CANDIDATES)

        semantic = await self._semantic_search(query_text, candidate_k, where)
        keyword = await bm25_search(
            query_text, self.user_id, self.mode, self.namespace,
            top_k=candidate_k, where=where,
        )

        # Weighted fusion over the union of both candidate sets.
        fused: Dict[str, Dict[str, Any]] = {}
        for r in semantic:
            fused[r["id"]] = {**r, "_sem": r["score"], "_bm25": 0.0}
        for r in keyword:
            entry = fused.get(r["id"])
            if entry:
                entry["_bm25"] = r["score"]
            else:
                fused[r["id"]] = {**r, "_sem": 0.0, "_bm25": r["score"]}

        candidates: List[Dict[str, Any]] = []
        for entry in fused.values():
            hybrid = SEMANTIC_WEIGHT * entry["_sem"] + BM25_WEIGHT * entry["_bm25"]
            candidates.append(
                {
                    "id": entry["id"],
                    "text": entry["text"],
                    "metadata": entry["metadata"],
                    "score": float(hybrid),
                }
            )
        candidates.sort(key=lambda c: c["score"], reverse=True)

        if rerank_results:
            return rerank(query_text, candidates, top_n=n_results)
        return candidates[:n_results]

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
