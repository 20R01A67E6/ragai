import hashlib
from typing import List

# Must match the VECTOR(384) column in the pgvector schema.
# SHA-256 yields 32 bytes per round; 12 rounds × 32 = 384 floats exactly.
EMBED_DIM = 384


def _hash_embed(text: str) -> List[float]:
    """
    Deterministic 384-dim embedding via repeated SHA-256.
    Same text always produces the same vector. Zero startup memory, no ML deps.

    Limitation: not semantic — similar texts will NOT have similar vectors,
    so retrieval quality is low. Replace with a real embedding API or a small
    model once the deployment memory budget allows.
    """
    vector: List[float] = []
    chunk = text.encode("utf-8", errors="replace")
    while len(vector) < EMBED_DIM:
        chunk = hashlib.sha256(chunk).digest()          # 32 bytes per round
        vector.extend((b - 128) / 128.0 for b in chunk) # normalise to [-1, 1]
    return vector[:EMBED_DIM]


def embed_texts(texts: List[str]) -> List[List[float]]:
    return [_hash_embed(t) for t in texts]


def embed_query(query: str) -> List[float]:
    return _hash_embed(query)
