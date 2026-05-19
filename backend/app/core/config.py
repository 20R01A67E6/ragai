from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List


class Settings(BaseSettings):
    # LLM
    llm_provider: str = Field(default="groq", alias="LLM_PROVIDER")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.1-8b-instant", alias="GROQ_MODEL")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-1.5-flash", alias="GEMINI_MODEL")
    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    ollama_model: str = Field(default="llama3.2", alias="OLLAMA_MODEL")
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    openrouter_model: str = Field(default="deepseek/deepseek-r1:free", alias="OPENROUTER_MODEL")
    cloudflare_account_id: str = Field(default="", alias="CLOUDFLARE_ACCOUNT_ID")
    cloudflare_api_token: str = Field(default="", alias="CLOUDFLARE_API_TOKEN")
    cloudflare_model: str = Field(default="llama-3.1-8b", alias="CLOUDFLARE_MODEL")

    # Embeddings
    embedding_model: str = Field(default="all-MiniLM-L6-v2", alias="EMBEDDING_MODEL")
    embedding_device: str = Field(default="cpu", alias="EMBEDDING_DEVICE")

    # Supabase
    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", alias="SUPABASE_ANON_KEY")
    supabase_service_key: str = Field(default="", alias="SUPABASE_SERVICE_KEY")
    supabase_jwt_secret: str = Field(default="", alias="SUPABASE_JWT_SECRET")
    supabase_db_url: str = Field(default="", alias="SUPABASE_DB_URL")
    # Primary connection URL — accepts both postgresql:// and postgresql+asyncpg://
    database_url: str = Field(default="", alias="DATABASE_URL")

    # File limits
    max_upload_size_mb: int = Field(default=50, alias="MAX_UPLOAD_SIZE_MB")

    # News
    news_refresh_interval_minutes: int = Field(default=30, alias="NEWS_REFRESH_INTERVAL_MINUTES")

    # API
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    # Chunking
    default_chunk_size: int = Field(default=512, alias="DEFAULT_CHUNK_SIZE")
    default_chunk_overlap: int = Field(default=64, alias="DEFAULT_CHUNK_OVERLAP")
    code_chunk_size: int = Field(default=256, alias="CODE_CHUNK_SIZE")
    code_chunk_overlap: int = Field(default=32, alias="CODE_CHUNK_OVERLAP")

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def _resolved_db_url(self) -> str:
        """Return DATABASE_URL if set, else fall back to SUPABASE_DB_URL."""
        return self.database_url or self.supabase_db_url

    @property
    def sqlalchemy_db_url(self) -> str:
        """SQLAlchemy asyncpg-compatible URL (postgresql+asyncpg://...)."""
        url = self._resolved_db_url
        if url.startswith("postgresql+asyncpg://"):
            return url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    @property
    def asyncpg_db_url(self) -> str:
        """Bare asyncpg URL (postgresql://...) for the asyncpg connection pool."""
        url = self._resolved_db_url
        if url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql+asyncpg://", "postgresql://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        return url

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "populate_by_name": True}


settings = Settings()
