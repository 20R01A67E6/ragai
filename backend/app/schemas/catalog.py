from pydantic import BaseModel, Field
from typing import Optional, Any


class ProductQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    namespace: str = "default"
    top_k: int = Field(default=5, ge=1, le=20)
    filters: Optional[dict[str, Any]] = None
    llm_provider: Optional[str] = None


class ProductResult(BaseModel):
    id: str
    name: str
    description: str
    metadata: dict[str, Any]
    score: float
    recommendation: Optional[str] = None


class ProductQueryResponse(BaseModel):
    recommendation: str
    products: list[ProductResult]
    query: str
    llm_provider: str
    llm_model: str
    fallback_notice: Optional[str] = None
