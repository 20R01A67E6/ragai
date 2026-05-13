# RAG Platform

A professional, multi-mode **Retrieval-Augmented Generation** platform with a Next.js frontend and FastAPI backend. All components run locally with no mandatory paid APIs.

## Modes

| Mode | Description |
|---|---|
| **Personal Docs Q&A** | Upload PDFs, DOCX, TXT and ask questions |
| **Knowledge Base Bot** | Bulk-ingest documents, query the whole collection |
| **Product Catalog Recommender** | Upload CSV/JSON catalogs, get AI-powered recommendations |
| **Codebase Assistant** | Index source code files with code-aware chunking |
| **News Feed Summarizer** | Add RSS feeds, auto-refresh on a schedule, summarize by topic |

## Tech Stack

- **Backend**: FastAPI (Python) + SQLAlchemy + SQLite
- **Vector DB**: ChromaDB (local persistent)
- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2` (runs 100% locally)
- **LLM**: Switchable via `LLM_PROVIDER` env var → Groq | Gemini | Ollama
- **Scheduler**: APScheduler (news feed auto-refresh)
- **Frontend**: Next.js 14 + Tailwind CSS

## Quickstart

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt

# Copy and configure env
cp ../.env.example .env
# Edit .env — set LLM_PROVIDER and the matching API key

python run.py
# → http://localhost:8000
# → Swagger docs: http://localhost:8000/api/docs
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## LLM Provider Setup

Set `LLM_PROVIDER` in `.env` to one of:

| Provider | Key needed | Where to get |
|---|---|---|
| `groq` | `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — free tier |
| `gemini` | `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) — free tier |
| `ollama` | none | [ollama.com](https://ollama.com) — fully local |

For Ollama: install Ollama, then `ollama pull llama3.2` before starting.

## API Reference

Full interactive docs at `http://localhost:8000/api/docs`

### Endpoints

```
POST /api/personal-docs/upload        Upload a document
POST /api/personal-docs/query         Q&A over uploaded docs
GET  /api/personal-docs/documents     List documents
DELETE /api/personal-docs/documents/{id}

POST /api/knowledge-base/ingest       Bulk ingest (background)
POST /api/knowledge-base/query        Q&A over KB
GET  /api/knowledge-base/stats

POST /api/product-catalog/upload      Upload CSV/JSON catalog
POST /api/product-catalog/recommend   Get recommendations

POST /api/codebase/upload             Index a code file
POST /api/codebase/query              Ask about the codebase

POST /api/news-feed/feeds             Add RSS feed
GET  /api/news-feed/feeds             List feeds
POST /api/news-feed/refresh           Refresh all feeds
POST /api/news-feed/summarize         Summarize by topic

GET  /api/health                      System health
```

## Project Structure

```
rag-platform/
├── backend/
│   ├── app/
│   │   ├── core/          # Config, logging
│   │   ├── db/            # SQLAlchemy models, session
│   │   ├── engine/        # Embeddings, LLM factory, ChromaDB, Chunker
│   │   ├── modes/         # One router per mode
│   │   ├── schemas/       # Pydantic request/response models
│   │   └── utils/         # File parser, prompt templates
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   └── src/
│       ├── app/           # Next.js App Router pages
│       ├── components/
│       │   ├── modes/     # One component per mode
│       │   └── ui/        # Shared UI (dropzone, answer card)
│       ├── lib/           # API client, utilities
│       └── types/         # TypeScript types
├── data/                  # Local data (gitignored)
│   ├── chroma_db/
│   ├── sqlite/
│   └── uploads/
└── .env.example
```
