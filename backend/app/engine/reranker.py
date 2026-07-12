"""
Lightweight, memory-free reranking.

Replaces the FlashRank cross-encoder (which loaded a model that blew the 512MB
Render free-tier limit) with a pure-Python keyword-overlap rerank: no model
download, no extra memory, no external API.
"""
from typing import Dict, List


def rerank(query: str, chunks: List[Dict], top_n: int = 5) -> List[Dict]:
    """
    Simple reranking based on keyword overlap score.
    No external model needed - works within 512MB limit.
    """
    if len(chunks) <= top_n:
        return chunks

    query_words = set(query.lower().split())

    def score_chunk(chunk: dict) -> float:
        content = chunk.get("content", chunk.get("text", "")).lower()
        content_words = set(content.split())

        # Keyword overlap score
        overlap = len(query_words & content_words)
        overlap_score = overlap / max(len(query_words), 1)

        # Existing hybrid score
        existing_score = chunk.get("score", 0.5)

        # Combined score
        return 0.6 * existing_score + 0.4 * overlap_score

    scored = sorted(chunks, key=score_chunk, reverse=True)
    return scored[:top_n]
