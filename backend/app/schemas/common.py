from pydantic import BaseModel, Field
from typing import Any, List, Optional
from datetime import datetime


class SourceDocument(BaseModel):
    id: str
    text: str
    metadata: dict[str, Any] = {}
    score: float


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    namespace: str = Field(default="default")
    top_k: int = Field(default=5, ge=1, le=20)
    llm_provider: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceDocument]
    query: str
    mode: str
    llm_provider: str
    llm_model: str
    latency_ms: float
    fallback_notice: Optional[str] = None


class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    file_url: Optional[str] = None
    mode: str
    namespace: str
    file_type: str
    chunk_count: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CollectionStats(BaseModel):
    collection_name: str
    document_count: int
    mode: str
    namespace: str


class HealthResponse(BaseModel):
    status: str
    llm_provider: str
    embedding_model: str
    vector_db: str


class QueryLogResponse(BaseModel):
    id: int
    mode: str
    namespace: str
    query: str
    answer: str
    sources_count: int
    llm_provider: str
    llm_model: str
    latency_ms: float
    created_at: datetime

    model_config = {"from_attributes": True}
