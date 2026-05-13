from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from loguru import logger
from sqlalchemy import select

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.db.models import RssFeed
from app.modes.news_feed.router import fetch_and_index_feed
from app.scheduler.cleanup import run_monthly_cleanup

scheduler = AsyncIOScheduler()


async def _scheduled_refresh() -> None:
    logger.info("Scheduler: refreshing all active RSS feeds")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(RssFeed).where(RssFeed.is_active == True))
        feeds = result.scalars().all()
        for feed in feeds:
            count = await fetch_and_index_feed(feed.url, "default", feed.user_id)
            feed.last_fetched = datetime.utcnow()
            feed.article_count = count
        await db.commit()
    logger.info(f"Scheduler: refreshed {len(feeds)} feeds across all users")


def start_scheduler() -> None:
    scheduler.add_job(
        _scheduled_refresh,
        trigger=IntervalTrigger(minutes=settings.news_refresh_interval_minutes),
        id="news_refresh",
        replace_existing=True,
        misfire_grace_time=60,
    )
    scheduler.add_job(
        run_monthly_cleanup,
        trigger=CronTrigger(day=1, hour=0, minute=0),
        id="monthly_cleanup",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info(f"Scheduler started — news every {settings.news_refresh_interval_minutes} min, cleanup on 1st of each month")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("News scheduler stopped")
