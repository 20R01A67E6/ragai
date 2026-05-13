import os
from typing import List
from loguru import logger
from app.core.config import settings

# Suppress HuggingFace tokenizer parallelism warnings and reduce memory overhead
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Loaded on first call, cached for the lifetime of the process
_model = None


def get_embedding_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading embedding model: {settings.embedding_model}")
        _model = SentenceTransformer(settings.embedding_model, device=settings.embedding_device)
        logger.info("Embedding model loaded.")
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    model = get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    return embed_texts([query])[0]
