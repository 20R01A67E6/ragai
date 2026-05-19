import time
import hashlib
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, cast, String
import feedparser
import httpx
from loguru import logger

from app.auth.dependencies import get_current_user
from app.db.database import get_db, AsyncSessionLocal
from app.db.models import RssFeed, QueryLog
from app.engine.vector_store import VectorStore
from app.engine.chunker import chunk_text
from app.engine.llm_factory import generate
from app.utils.prompts import build_news_prompt
from app.schemas.news import RssFeedCreate, RssFeedResponse, NewsSummaryRequest, NewsSummaryResponse

router = APIRouter(prefix="/news-feed", tags=["News Feed Summarizer"])
MODE = "news_feed"


def _article_id(url: str, title: str) -> str:
    return hashlib.md5(f"{url}{title}".encode()).hexdigest()


async def fetch_and_index_feed(feed_url: str, namespace: str, user_id: str) -> int:
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(feed_url)
            resp.raise_for_status()
            raw = resp.text

        parsed = feedparser.parse(raw)
        store = VectorStore(mode=MODE, namespace=namespace, user_id=user_id)

        ids, texts, metadatas = [], [], []
        for entry in parsed.entries:
            title = entry.get("title", "")
            summary = entry.get("summary", entry.get("description", ""))
            link = entry.get("link", "")
            published = entry.get("published", "")

            if not summary:
                continue

            article_text = f"{title}\n\n{summary}"
            chunks = chunk_text(article_text, chunk_size=256, chunk_overlap=32)

            for i, chunk in enumerate(chunks):
                art_id = f"{user_id}_{_article_id(link, title)}_{i}"
                ids.append(art_id)
                texts.append(chunk)
                metadatas.append({
                    "title": title, "link": link,
                    "published": published, "feed": feed_url, "chunk": str(i),
                })

        if ids:
            await store.upsert(ids=ids, texts=texts, metadatas=metadatas)

        logger.info(f"Indexed {len(ids)} chunks from {feed_url} [user={user_id}]")
        return len(parsed.entries)
    except Exception as e:
        logger.error(f"Feed fetch error {feed_url}: {e}")
        return 0


async def _index_feed_bg(feed_url: str, namespace: str, feed_id: int, user_id: str) -> None:
    async with AsyncSessionLocal() as db:
        count = await fetch_and_index_feed(feed_url, namespace, user_id)
        feed = await db.get(RssFeed, feed_id)
        if feed:
            feed.last_fetched = datetime.utcnow()
            feed.article_count = count
            await db.commit()


@router.post("/feeds", response_model=RssFeedResponse)
async def add_feed(
    feed: RssFeedCreate,
    background_tasks: BackgroundTasks,
    namespace: str = "default",
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(RssFeed).where(and_(cast(RssFeed.user_id, String) == str(user_id), RssFeed.url == feed.url))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Feed already exists")

    db_feed = RssFeed(user_id=user_id, url=feed.url, name=feed.name)
    db.add(db_feed)
    await db.commit()
    await db.refresh(db_feed)

    background_tasks.add_task(_index_feed_bg, feed.url, namespace, db_feed.id, user_id)
    return db_feed


@router.get("/feeds", response_model=List[RssFeedResponse])
async def list_feeds(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RssFeed).where(cast(RssFeed.user_id, String) == str(user_id)).order_by(RssFeed.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/feeds/{feed_id}")
async def delete_feed(
    feed_id: int,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    feed = await db.get(RssFeed, feed_id)
    if not feed or feed.user_id != user_id:
        raise HTTPException(404, "Feed not found")
    await db.delete(feed)
    await db.commit()
    return {"deleted": feed_id}


@router.post("/refresh")
async def refresh_feeds(
    namespace: str = "default",
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RssFeed).where(cast(RssFeed.user_id, String) == str(user_id), RssFeed.is_active == True)
    )
    feeds = result.scalars().all()
    for feed in feeds:
        background_tasks.add_task(_index_feed_bg, feed.url, namespace, feed.id, user_id)
    return {"refreshing": len(feeds), "feeds": [f.url for f in feeds]}


@router.post("/summarize", response_model=NewsSummaryResponse)
async def summarize_news(
    req: NewsSummaryRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t0 = time.monotonic()
    store = VectorStore(mode=MODE, namespace=req.namespace, user_id=user_id)

    query = req.topic or "latest news summary"
    results = await store.query(query, n_results=req.top_k)

    if not results:
        raise HTTPException(404, "No news articles indexed. Add feeds and refresh first.")

    system, prompt = build_news_prompt(results, req.topic)
    llm_resp = await generate(prompt=prompt, system=system, provider=req.llm_provider)
    latency = (time.monotonic() - t0) * 1000

    log = QueryLog(
        user_id=user_id, mode=MODE, namespace=req.namespace, query=query,
        answer=llm_resp.content, sources_count=len(results),
        llm_provider=llm_resp.provider, llm_model=llm_resp.model, latency_ms=latency,
    )
    db.add(log)
    await db.commit()

    return NewsSummaryResponse(
        summary=llm_resp.content,
        articles_used=len(results), topic=req.topic,
        llm_provider=llm_resp.provider, llm_model=llm_resp.model,
        fallback_notice=llm_resp.fallback_notice,
    )
