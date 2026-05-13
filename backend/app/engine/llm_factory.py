from loguru import logger
from app.core.config import settings


BOTH_RATE_LIMITED_MSG = (
    "Both AI providers are currently at capacity. "
    "Groq resets at midnight UTC, Gemini resets at midnight Pacific time. "
    "Please try again in a few minutes."
)


class LLMResponse:
    def __init__(
        self,
        content: str,
        provider: str,
        model: str,
        fallback_notice: str | None = None,
    ):
        self.content = content
        self.provider = provider
        self.model = model
        self.fallback_notice = fallback_notice


VALID_PROVIDERS = {"groq", "gemini", "ollama"}

# Runtime-mutable provider — initialized from .env, switchable without restart
_current_provider: str = settings.llm_provider


def get_current_provider() -> str:
    return _current_provider


def set_provider(provider: str) -> None:
    global _current_provider
    if provider not in VALID_PROVIDERS:
        raise ValueError(f"Unknown provider '{provider}'. Valid: {', '.join(sorted(VALID_PROVIDERS))}")
    _current_provider = provider
    logger.info(f"LLM provider switched to: {provider}")


def _is_rate_limit(exc: Exception) -> bool:
    """Return True when exc signals a 429 / quota exhaustion from any provider."""
    try:
        from groq import RateLimitError as GroqRateLimit
        if isinstance(exc, GroqRateLimit):
            return True
    except ImportError:
        pass

    import httpx
    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429:
        return True

    msg = str(exc).lower()
    return any(kw in msg for kw in (
        "rate limit", "ratelimit", "quota", "resource_exhausted", "429", "too many requests"
    ))


async def _call_groq(prompt: str, system: str, stream: bool) -> str:
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.groq_api_key)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = await client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.2,
        max_tokens=2048,
    )
    return response.choices[0].message.content


async def _call_gemini(prompt: str, system: str) -> str:
    from google import genai

    client = genai.Client(api_key=settings.gemini_api_key)
    full_prompt = f"{system}\n\n{prompt}" if system else prompt
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=full_prompt,
    )
    return response.text


async def _call_ollama(prompt: str, system: str) -> str:
    import httpx

    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "system": system,
        "stream": False,
    }
    async with httpx.AsyncClient(base_url=settings.ollama_base_url, timeout=120.0) as client:
        resp = await client.post("/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json()["response"]


async def _dispatch(prompt: str, system: str, provider: str) -> tuple[str, str]:
    """Call a provider and return (content, model_name)."""
    if provider == "groq":
        return await _call_groq(prompt, system, stream=False), settings.groq_model
    if provider == "gemini":
        return await _call_gemini(prompt, system), settings.gemini_model
    if provider == "ollama":
        return await _call_ollama(prompt, system), settings.ollama_model
    raise ValueError(f"Unknown LLM provider: {provider}. Use groq | gemini | ollama")


async def generate(
    prompt: str,
    system: str = "",
    provider: str | None = None,
) -> LLMResponse:
    resolved = provider or _current_provider
    logger.debug(f"LLM call via provider={resolved}")

    # Ollama has no cloud fallback peer — call directly, let errors surface
    if resolved == "ollama":
        content, model = await _dispatch(prompt, system, "ollama")
        return LLMResponse(content=content, provider="ollama", model=model)

    # For groq / gemini: try primary, fall back to the other on rate limit only
    primary = resolved
    fallback = "gemini" if primary == "groq" else "groq"
    primary_label = primary.capitalize()
    fallback_label = fallback.capitalize()

    try:
        content, model = await _dispatch(prompt, system, primary)
        return LLMResponse(content=content, provider=primary, model=model)
    except Exception as exc:
        if not _is_rate_limit(exc):
            raise
        notice = f"{primary_label} is at capacity, using {fallback_label} instead"
        logger.warning(f"{notice} — original error: {exc}")

    # Primary was rate-limited — try the fallback
    try:
        content, model = await _dispatch(prompt, system, fallback)
        return LLMResponse(content=content, provider=fallback, model=model, fallback_notice=notice)
    except Exception as exc2:
        if not _is_rate_limit(exc2):
            raise

    # Both rate-limited
    logger.error("Both Groq and Gemini are rate-limited")
    return LLMResponse(
        content=BOTH_RATE_LIMITED_MSG,
        provider="none",
        model="none",
        fallback_notice=BOTH_RATE_LIMITED_MSG,
    )
