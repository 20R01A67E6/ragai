from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.database import init_db
from app.engine.vector_store import get_pg_pool, close_pg_pool
from app.modes.personal_docs.router import router as personal_docs_router
from app.modes.knowledge_base.router import router as kb_router
from app.modes.product_catalog.router import router as catalog_router
from app.modes.codebase.router import router as codebase_router
from app.modes.news_feed.router import router as news_router
from app.modes.news_feed.scheduler import start_scheduler, stop_scheduler
from app.api.routes.history import router as history_router
from app.api.routes.settings import router as settings_router
from app.schemas.common import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()

    logger.info("Initializing Supabase PostgreSQL tables...")
    await init_db()

    logger.info("Warming up pgvector pool...")
    await get_pg_pool()

    logger.info(f"LLM provider: {settings.llm_provider}")
    start_scheduler()

    yield

    stop_scheduler()
    await close_pg_pool()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="RAGAI Platform",
    description="Multi-mode Retrieval-Augmented Generation platform with auth and cloud storage",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(personal_docs_router, prefix="/api")
app.include_router(kb_router, prefix="/api")
app.include_router(catalog_router, prefix="/api")
app.include_router(codebase_router, prefix="/api")
app.include_router(news_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health():
    try:
        pool = await get_pg_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        vector_db = "ok (pgvector)"
    except Exception as e:
        vector_db = f"error: {e}"

    return HealthResponse(
        status="ok",
        llm_provider=settings.llm_provider,
        embedding_model=settings.embedding_model,
        vector_db=vector_db,
    )


@app.get("/", tags=["System"])
async def root():
    return {"message": "RAGAI Platform API v2", "docs": "/api/docs"}
