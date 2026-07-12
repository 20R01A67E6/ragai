"""
Local cross-encoder reranking with FlashRank (no external API).

The model (~34 MB, ms-marco-MiniLM-L-12-v2) is downloaded and loaded lazily on
first use so app startup stays fast and offline boots don't fail. Any reranking
error degrades gracefully to the input (hybrid-search) order.
"""
from typing import Dict, List

from loguru import logger

_MODEL_NAME = "ms-marco-MiniLM-L-12-v2"
_ranker = None


def _get_ranker():
    global _ranker
    if _ranker is None:
        from flashrank import Ranker

        _ranker = Ranker(model_name=_MODEL_NAME)
        logger.info(f"Loaded FlashRank reranker: {_MODEL_NAME}")
    return _ranker


def rerank(query: str, chunks: List[Dict], top_n: int = 5) -> List[Dict]:
    """Reorder `chunks` by cross-encoder relevance to `query`, keeping the top_n."""
    if not chunks:
        return []
    if len(chunks) <= top_n:
        return chunks

    try:
        from flashrank import RerankRequest

        passages = [
            {"id": i, "text": c.get("content") or c.get("text", "")}
            for i, c in enumerate(chunks)
        ]
        results = _get_ranker().rerank(RerankRequest(query=query, passages=passages))

        ranked: List[Dict] = []
        for r in results[:top_n]:
            chunk = dict(chunks[r["id"]])
            # Surface the cross-encoder relevance as the reported score.
            chunk["score"] = float(r.get("score", chunk.get("score", 0.0)))
            ranked.append(chunk)
        return ranked
    except Exception as e:  # pragma: no cover - resilience path
        logger.warning(f"Rerank failed ({e}); falling back to hybrid order")
        return chunks[:top_n]
