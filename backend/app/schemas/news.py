from pydantic import BaseModel, HttpUrl, Field
from typing import Optional
from datetime import datetime


class RssFeedCreate(BaseModel):
    url: str = Field(..., description="RSS feed URL")
    name: str = Field(..., min_length=1, max_length=256)


class RssFeedResponse(BaseModel):
    id: int
    url: str
    name: str
    is_active: bool
    last_fetched: Optional[datetime]
    article_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class NewsSummaryRequest(BaseModel):
    topic: Optional[str] = None
    namespace: str = "default"
    top_k: int = Field(default=10, ge=1, le=30)
    llm_provider: Optional[str] = None


class NewsSummaryResponse(BaseModel):
    summary: str
    articles_used: int
    topic: Optional[str]
    llm_provider: str
    llm_model: str
    fallback_notice: Optional[str] = None
