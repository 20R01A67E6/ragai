"""
Real semantic embeddings via Cloudflare Workers AI (BGE base v1.5).

Replaces the previous hash-based placeholder. BGE-base-en-v1.5 returns
768-dimensional vectors — the `embeddings.embedding` column must be VECTOR(768).
"""
from typing import List

import httpx
from loguru import logger
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.core.config import settings

# BGE-base-en-v1.5 output size. Must match the VECTOR(768) column in pgvector.
EMBED_DIM = 768

_MODEL = "@cf/baai/bge-base-en-v1.5"

# Cloudflare accepts a batched `text` array; keep sub-batches modest so a single
# request stays under size/timeout limits even for large uploads.
_MAX_BATCH = 100


def _endpoint() -> str:
    if not settings.cloudflare_account_id or not settings.cloudflare_api_token:
        raise RuntimeError(
            "Cloudflare embeddings not configured — set CLOUDFLARE_ACCOUNT_ID "
            "and CLOUDFLARE_API_TOKEN in the environment."
        )
    return (
        f"https://api.cloudflare.com/client/v4/accounts/"
        f"{settings.cloudflare_account_id}/ai/run/{_MODEL}"
    )


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
    retry=retry_if_exception_type(httpx.HTTPError),
)
async def _embed_request(texts: List[str]) -> List[List[float]]:
    headers = {
        "Authorization": f"Bearer {settings.cloudflare_api_token}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(_endpoint(), headers=headers, json={"text": texts})
        resp.raise_for_status()
        payload = resp.json()

    if not payload.get("success", True):
        raise RuntimeError(f"Cloudflare embedding error: {payload.get('errors')}")
    return payload["result"]["data"]


async def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Get 768-dim BGE embeddings for many texts, sub-batched for reliability."""
    if not texts:
        return []
    out: List[List[float]] = []
    for i in range(0, len(texts), _MAX_BATCH):
        out.extend(await _embed_request(texts[i : i + _MAX_BATCH]))
    logger.debug(f"Embedded {len(texts)} texts via Cloudflare BGE")
    return out


async def get_embedding(text: str) -> List[float]:
    """Get a single 768-dim BGE embedding (e.g. for a query)."""
    data = await _embed_request([text])
    return data[0]
