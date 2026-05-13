-- ============================================================
-- RAGAI Platform — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_url    TEXT,
    mode        TEXT NOT NULL,
    namespace   TEXT NOT NULL DEFAULT 'default',
    file_type   TEXT NOT NULL,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'processing',
    error_message TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_mode    ON documents(user_id, mode, namespace);

-- ============================================================
-- Query Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS query_logs (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode         TEXT NOT NULL,
    namespace    TEXT NOT NULL DEFAULT 'default',
    query        TEXT NOT NULL,
    answer       TEXT NOT NULL,
    sources_count INTEGER NOT NULL DEFAULT 0,
    llm_provider TEXT NOT NULL,
    llm_model    TEXT NOT NULL,
    latency_ms   DOUBLE PRECISION NOT NULL DEFAULT 0,
    document_id  BIGINT REFERENCES documents(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);

-- ============================================================
-- RSS Feeds
-- ============================================================
CREATE TABLE IF NOT EXISTS rss_feeds (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url          TEXT NOT NULL,
    name         TEXT NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    last_fetched TIMESTAMPTZ,
    article_count INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, url)
);

CREATE INDEX IF NOT EXISTS idx_rss_feeds_user_id ON rss_feeds(user_id);

-- ============================================================
-- Vector Embeddings (replaces ChromaDB)
-- 384 dimensions = all-MiniLM-L6-v2 output size
-- ============================================================
CREATE TABLE IF NOT EXISTS embeddings (
    id          TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode        TEXT NOT NULL,
    namespace   TEXT NOT NULL DEFAULT 'default',
    document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}',
    embedding   VECTOR(384) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_user_mode_ns
    ON embeddings(user_id, mode, namespace);

-- IVFFlat index for fast approximate nearest-neighbour search.
-- Increase lists= when you have >100k rows per user.
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
    ON embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================
-- Row Level Security — users can only access their own data
-- ============================================================
ALTER TABLE documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feeds    ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings   ENABLE ROW LEVEL SECURITY;

-- Documents RLS
CREATE POLICY "users_own_documents" ON documents
    FOR ALL USING (auth.uid() = user_id);

-- Query Logs RLS
CREATE POLICY "users_own_query_logs" ON query_logs
    FOR ALL USING (auth.uid() = user_id);

-- RSS Feeds RLS
CREATE POLICY "users_own_rss_feeds" ON rss_feeds
    FOR ALL USING (auth.uid() = user_id);

-- Embeddings RLS
CREATE POLICY "users_own_embeddings" ON embeddings
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- updated_at trigger for documents
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
