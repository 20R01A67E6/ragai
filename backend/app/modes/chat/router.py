import time
from typing import List, Literal, Optional

from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from loguru import logger

from app.auth.dependencies import get_current_user
from app.core.limiter import limiter
from app.db.database import get_db
from app.db.models import QueryLog
from app.engine.llm_factory import generate

router = APIRouter(prefix="/chat", tags=["AI Chat"])
MODE = "chat"

# Bound context sent to the LLM so a long conversation can't blow up token usage.
MAX_MESSAGE_CHARS = 4000
MAX_HISTORY_MESSAGES = 20

SYSTEM_PROMPT = (
    "You are a helpful, knowledgeable AI assistant. "
    "Answer clearly and concisely, using Markdown for code and lists when useful."
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CHARS)
    conversation_history: List[ChatMessage] = Field(default_factory=list)
    llm_provider: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    model_used: str
    latency_ms: float
    llm_provider: str
    fallback_notice: Optional[str] = None


def _build_prompt(message: str, history: List[ChatMessage]) -> str:
    """Fold prior turns + the new message into a single conversational prompt.

    `generate()` takes a plain prompt string (not a messages array), so we render
    the transcript inline. Only the most recent turns are kept for context.
    """
    recent = history[-MAX_HISTORY_MESSAGES:]
    lines: List[str] = []
    for turn in recent:
        speaker = "User" if turn.role == "user" else "Assistant"
        lines.append(f"{speaker}: {turn.content.strip()}")
    lines.append(f"User: {message.strip()}")
    lines.append("Assistant:")
    return "\n".join(lines)


@router.post("/message", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat_message(
    request: Request,
    req: ChatRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    message = req.message.strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty")

    t0 = time.monotonic()
    prompt = _build_prompt(message, req.conversation_history)
    llm_resp = await generate(prompt=prompt, system=SYSTEM_PROMPT, provider=req.llm_provider)
    latency = (time.monotonic() - t0) * 1000

    log = QueryLog(
        user_id=user_id,
        mode=MODE,
        namespace="default",
        query=message,
        answer=llm_resp.content,
        sources_count=0,
        llm_provider=llm_resp.provider,
        llm_model=llm_resp.model,
        latency_ms=latency,
    )
    db.add(log)
    await db.commit()
    logger.info(f"Chat message answered [user={user_id} provider={llm_resp.provider} {latency:.0f}ms]")

    return ChatResponse(
        response=llm_resp.content,
        model_used=llm_resp.model,
        latency_ms=latency,
        llm_provider=llm_resp.provider,
        fallback_notice=llm_resp.fallback_notice,
    )
