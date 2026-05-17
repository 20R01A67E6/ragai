from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.engine.llm_factory import (
    get_current_provider, set_provider,
    get_current_openrouter_model, set_openrouter_model,
    OPENROUTER_MODELS,
)

router = APIRouter(prefix="/settings", tags=["Settings"])


class ProviderRequest(BaseModel):
    provider: Literal["groq", "gemini", "ollama", "openrouter"]


class ProviderResponse(BaseModel):
    provider: str


class OpenRouterModelRequest(BaseModel):
    model: str


class OpenRouterModelInfo(BaseModel):
    id: str
    model_id: str


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


@router.get("/openrouter-models", response_model=list[OpenRouterModelInfo])
async def get_openrouter_models():
    return [OpenRouterModelInfo(id=k, model_id=v) for k, v in OPENROUTER_MODELS.items()]


@router.get("/openrouter-model")
async def get_openrouter_model():
    full_model = get_current_openrouter_model()
    model_key = next(
        (k for k, v in OPENROUTER_MODELS.items() if v == full_model),
        "deepseek-r1",
    )
    return {"model": full_model, "model_key": model_key}


@router.post("/openrouter-model")
async def update_openrouter_model(body: OpenRouterModelRequest):
    try:
        set_openrouter_model(body.model)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    full_model = get_current_openrouter_model()
    model_key = next(
        (k for k, v in OPENROUTER_MODELS.items() if v == full_model),
        body.model,
    )
    return {"model": full_model, "model_key": model_key}
