-- ============================================================
-- Migration: 384-dim hash embeddings  ->  768-dim BGE + hybrid search
-- Run in: Supabase Dashboard -> SQL Editor
--
-- The old vectors were hash-based placeholders (not semantic), so they are
-- discarded. Users must RE-UPLOAD / RE-INGEST their documents after this runs
-- to repopulate real BGE embeddings.
-- ============================================================

-- 1. Drop the ANN index (it is bound to the old vector dimensionality).
DROP INDEX IF EXISTS idx_embeddings_vector;

-- 2. Clear stale placeholder vectors (documents rows are kept; re-ingest to refill).
TRUNCATE TABLE embeddings;

-- 3. Add the chunk_index column used for ordering/citations.
ALTER TABLE embeddings
    ADD COLUMN IF NOT EXISTS chunk_index INTEGER NOT NULL DEFAULT 0;

-- 4. Widen the vector column to BGE's 768 dimensions.
ALTER TABLE embeddings
    ALTER COLUMN embedding TYPE VECTOR(768);

-- 5. Recreate the IVFFlat index for cosine similarity.
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
    ON embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
