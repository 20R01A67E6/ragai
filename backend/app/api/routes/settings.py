from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.engine.llm_factory import get_current_provider, set_provider

router = APIRouter(prefix="/settings", tags=["Settings"])


class ProviderRequest(BaseModel):
    provider: Literal["groq", "gemini", "ollama"]


class ProviderResponse(BaseModel):
    provider: str


@router.get("/llm-provider", response_model=ProviderResponse)
async def get_llm_provider():
    return ProviderResponse(provider=get_current_provider())


@router.post("/llm-provider", response_model=ProviderResponse)
async def update_llm_provider(body: ProviderRequest):
    try:
        set_provider(body.provider)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ProviderResponse(provider=body.provider)
