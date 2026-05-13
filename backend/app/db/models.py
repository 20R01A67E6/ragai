from datetime import datetime
from sqlalchemy import String, Integer, BigInteger, DateTime, Text, Boolean, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(512))
    original_name: Mapped[str] = mapped_column(String(512))
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    mode: Mapped[str] = mapped_column(String(64))
    namespace: Mapped[str] = mapped_column(String(128), default="default")
    file_type: Mapped[str] = mapped_column(String(32))
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="processing")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    queries: Mapped[list["QueryLog"]] = relationship("QueryLog", back_populates="document", cascade="all, delete")


class QueryLog(Base):
    __tablename__ = "query_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    mode: Mapped[str] = mapped_column(String(64))
    namespace: Mapped[str] = mapped_column(String(128), default="default")
    query: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    sources_count: Mapped[int] = mapped_column(Integer, default=0)
    llm_provider: Mapped[str] = mapped_column(String(32))
    llm_model: Mapped[str] = mapped_column(String(128))
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    document_id: Mapped[int | None] = mapped_column(ForeignKey("documents.id"), nullable=True)

    document: Mapped["Document | None"] = relationship("Document", back_populates="queries")


class RssFeed(Base):
    __tablename__ = "rss_feeds"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(1024))
    name: Mapped[str] = mapped_column(String(256))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_fetched: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    article_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
