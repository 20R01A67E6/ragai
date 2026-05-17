from loguru import logger
from app.core.config import settings


OPENROUTER_MODELS: dict[str, str] = {
    "deepseek-r1":   "deepseek/deepseek-r1:free",
    "llama-3.3-70b": "meta-llama/llama-3.3-70b-instruct:free",
    "qwen-2.5-72b":  "qwen/qwen-2.5-72b-instruct:free",
    "gemma-2-27b":   "google/gemma-2-27b-it:free",
    "mistral-7b":    "mistralai/mistral-7b-instruct:free",
}

# Ordered retry sequence when an OR model returns 429
OR_RETRY_SEQUENCE: list[str] = [
    OPENROUTER_MODELS["deepseek-r1"],
    OPENROUTER_MODELS["llama-3.3-70b"],
    OPENROUTER_MODELS["qwen-2.5-72b"],
]

ALL_RATE_LIMITED_MSG = (
    "All AI providers are currently at capacity. "
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


VALID_PROVIDERS = {"groq", "gemini", "ollama", "openrouter"}

# Runtime-mutable state — initialized from .env, switchable without restart
_current_provider: str = settings.llm_provider
_current_openrouter_model: str = settings.openrouter_model


def get_current_provider() -> str:
    return _current_provider


def set_provider(provider: str) -> None:
    global _current_provider
    if provider not in VALID_PROVIDERS:
        raise ValueError(f"Unknown provider '{provider}'. Valid: {', '.join(sorted(VALID_PROVIDERS))}")
    _current_provider = provider
    logger.info(f"LLM provider switched to: {provider}")


def get_current_openrouter_model() -> str:
    return _current_openrouter_model


def set_openrouter_model(model_id: str) -> None:
    """Accept either a short key ('deepseek-r1') or a full model ID ('deepseek/deepseek-r1:free')."""
    global _current_openrouter_model
    if model_id in OPENROUTER_MODELS:
        _current_openrouter_model = OPENROUTER_MODELS[model_id]
    elif model_id in OPENROUTER_MODELS.values():
        _current_openrouter_model = model_id
    else:
        raise ValueError(
            f"Unknown OpenRouter model '{model_id}'. "
            f"Valid keys: {', '.join(OPENROUTER_MODELS)}"
        )
    logger.info(f"OpenRouter model switched to: {_current_openrouter_model}")


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


def _or_model_key(full_id: str) -> str:
    """Return the short key for a full OR model ID, falling back to the full ID."""
    return next((k for k, v in OPENROUTER_MODELS.items() if v == full_id), full_id)


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


async def _call_openrouter(prompt: str, system: str, model: str | None = None) -> str:
    import httpx

    model_id = model or _current_openrouter_model
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "HTTP-Referer": "https://ragaii.vercel.app",
                "X-Title": "RAGaii",
            },
            json={"model": model_id, "messages": messages},
        )
        if resp.status_code >= 400:
            print(f"OpenRouter error: {resp.status_code} {resp.text}")
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def _call_openrouter_with_fallback(
    prompt: str,
    system: str,
    start_model: str | None = None,
) -> tuple[str, str, str | None]:
    """
    Try OR models in sequence when a 429 is returned.

    Attempt order: start_model first (defaults to _current_openrouter_model),
    then OR_RETRY_SEQUENCE (deepseek-r1 → llama-3.3-70b → qwen-2.5-72b),
    skipping any model already tried.

    Returns (content, model_full_id, fallback_notice | None).
    Raises the last 429 exception when all candidates are exhausted.
    """
    first = start_model or _current_openrouter_model
    # Build a de-duplicated ordered list: user's model first, then the retry sequence
    ordered: list[str] = [first] + [m for m in OR_RETRY_SEQUENCE if m != first]

    last_exc: Exception | None = None
    switched = False

    for model_id in ordered:
        try:
            content = await _call_openrouter(prompt, system, model=model_id)
            notice = (
                f"OpenRouter rate limit hit, switched to {_or_model_key(model_id)}"
                if switched
                else None
            )
            return content, model_id, notice
        except Exception as exc:
            if not _is_rate_limit(exc):
                raise
            last_exc = exc
            switched = True
            logger.warning(f"OpenRouter {_or_model_key(model_id)} rate-limited, trying next model")

    raise last_exc  # type: ignore[misc]


async def _dispatch(prompt: str, system: str, provider: str, openrouter_model: str | None = None) -> tuple[str, str]:
    """Call a provider and return (content, model_name)."""
    if provider == "groq":
        return await _call_groq(prompt, system, stream=False), settings.groq_model
    if provider == "gemini":
        return await _call_gemini(prompt, system), settings.gemini_model
    if provider == "ollama":
        return await _call_ollama(prompt, system), settings.ollama_model
    if provider == "openrouter":
        model = openrouter_model or _current_openrouter_model
        return await _call_openrouter(prompt, system, model=model), model
    raise ValueError(f"Unknown LLM provider: {provider}. Use groq | gemini | ollama | openrouter")


async def generate(
    prompt: str,
    system: str = "",
    provider: str | None = None,
) -> LLMResponse:
    resolved = provider or _current_provider
    logger.debug(f"LLM call via provider={resolved}")

    # Ollama: local only, no cloud fallback
    if resolved == "ollama":
        content, model = await _dispatch(prompt, system, "ollama")
        return LLMResponse(content=content, provider="ollama", model=model)

    # OpenRouter primary: retry across free models on 429, then fall back to Groq → Gemini
    if resolved == "openrouter":
        try:
            content, model, notice = await _call_openrouter_with_fallback(
                prompt, system, start_model=_current_openrouter_model
            )
            return LLMResponse(content=content, provider="openrouter", model=model, fallback_notice=notice)
        except Exception as exc:
            if not _is_rate_limit(exc):
                raise

        # All OR models rate-limited — fall back to Groq
        logger.warning("All OpenRouter models rate-limited, falling back to Groq")
        try:
            content, model = await _dispatch(prompt, system, "groq")
            return LLMResponse(
                content=content,
                provider="groq",
                model=model,
                fallback_notice="All OpenRouter models are at capacity, switched to Groq",
            )
        except Exception as groq_exc:
            if not _is_rate_limit(groq_exc):
                raise

        # Groq also rate-limited — try Gemini
        logger.warning("Groq also rate-limited, trying Gemini")
        try:
            content, model = await _dispatch(prompt, system, "gemini")
            return LLMResponse(
                content=content,
                provider="gemini",
                model=model,
                fallback_notice="All OpenRouter models and Groq are at capacity, switched to Gemini",
            )
        except Exception as gemini_exc:
            if not _is_rate_limit(gemini_exc):
                raise

        logger.error("All providers exhausted")
        return LLMResponse(
            content=ALL_RATE_LIMITED_MSG,
            provider="none",
            model="none",
            fallback_notice=ALL_RATE_LIMITED_MSG,
        )

    # groq / gemini primary: try primary → other cloud → OR retry chain → error
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

    try:
        content, model = await _dispatch(prompt, system, fallback)
        return LLMResponse(content=content, provider=fallback, model=model, fallback_notice=notice)
    except Exception as exc2:
        if not _is_rate_limit(exc2):
            raise

    # Both cloud providers rate-limited — walk OR retry sequence as final fallback
    if settings.openrouter_api_key:
        base_notice = f"Both {primary_label} and {fallback_label} are at capacity"
        logger.warning(f"{base_notice}, trying OpenRouter fallback chain")
        try:
            content, or_model, or_switch_notice = await _call_openrouter_with_fallback(
                prompt, system, start_model=OPENROUTER_MODELS["deepseek-r1"]
            )
            final_notice = (
                f"{base_notice}, using OpenRouter ({or_switch_notice})"
                if or_switch_notice
                else f"{base_notice}, using OpenRouter as fallback"
            )
            return LLMResponse(
                content=content,
                provider="openrouter",
                model=or_model,
                fallback_notice=final_notice,
            )
        except Exception as exc3:
            logger.error(f"OpenRouter fallback chain also exhausted: {exc3}")

    logger.error("All LLM providers are rate-limited or unavailable")
    return LLMResponse(
        content=ALL_RATE_LIMITED_MSG,
        provider="none",
        model="none",
        fallback_notice=ALL_RATE_LIMITED_MSG,
    )
