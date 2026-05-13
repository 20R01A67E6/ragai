import io
import json
import time
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
import pandas as pd

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import Document, QueryLog
from app.engine.vector_store import VectorStore
from app.engine.storage import upload_file
from app.engine.llm_factory import generate
from app.utils.prompts import build_product_prompt
from app.schemas.catalog import ProductQueryRequest, ProductQueryResponse, ProductResult
from app.schemas.common import DocumentResponse

router = APIRouter(prefix="/product-catalog", tags=["Product Catalog Recommender"])
MODE = "product_catalog"


def _row_to_text(row: dict) -> str:
    return " | ".join(f"{k}: {v}" for k, v in row.items() if v is not None and str(v).strip())


@router.post("/upload", response_model=DocumentResponse)
async def upload_catalog(
    file: UploadFile = File(...),
    namespace: str = Form(default="default"),
    name_column: str = Form(default="name"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith(".json"):
            data = json.loads(content.decode())
            df = pd.DataFrame(data if isinstance(data, list) else data.get("products", [data]))
        else:
            raise HTTPException(400, "Only CSV and JSON supported for product catalog")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {e}")

    r2_key, file_url = upload_file(content, file.filename, user_id)

    doc = Document(
        user_id=user_id,
        filename=r2_key,
        original_name=file.filename,
        file_url=file_url,
        mode=MODE, namespace=namespace,
        file_type=filename.split(".")[-1], status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    try:
        records = df.to_dict(orient="records")
        texts, ids, metadatas = [], [], []
        for i, row in enumerate(records):
            text = _row_to_text(row)
            product_id = str(row.get("id", f"{doc.id}_{i}"))
            meta = {k: str(v) for k, v in row.items() if v is not None}
            meta.update({"doc_id": str(doc.id), "name": str(row.get(name_column, f"Product {i}"))})
            texts.append(text)
            ids.append(f"{user_id}_prod_{product_id}")
            metadatas.append(meta)

        store = VectorStore(mode=MODE, namespace=namespace, user_id=user_id)
        await store.upsert(ids=ids, texts=texts, metadatas=metadatas)

        doc.chunk_count = len(records)
        doc.status = "ready"
        await db.commit()
        await db.refresh(doc)
    except Exception as e:
        doc.status = "error"
        doc.error_message = str(e)
        await db.commit()
        raise HTTPException(500, f"Ingestion failed: {e}")

    return doc


@router.post("/recommend", response_model=ProductQueryResponse)
async def recommend_products(
    req: ProductQueryRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t0 = time.monotonic()
    store = VectorStore(mode=MODE, namespace=req.namespace, user_id=user_id)
    results = await store.query(req.query, n_results=req.top_k, where=req.filters)

    if not results:
        raise HTTPException(404, "No products found. Upload a catalog first.")

    system, prompt = build_product_prompt(results, req.query)
    llm_resp = await generate(prompt=prompt, system=system, provider=req.llm_provider)
    latency = (time.monotonic() - t0) * 1000

    log = QueryLog(
        user_id=user_id, mode=MODE, namespace=req.namespace,
        query=req.query, answer=llm_resp.content, sources_count=len(results),
        llm_provider=llm_resp.provider, llm_model=llm_resp.model, latency_ms=latency,
    )
    db.add(log)
    await db.commit()

    products = [
        ProductResult(
            id=r["id"], name=r["metadata"].get("name", "Unknown"),
            description=r["text"], metadata=r["metadata"], score=r["score"],
        )
        for r in results
    ]

    return ProductQueryResponse(
        recommendation=llm_resp.content,
        products=products, query=req.query,
        llm_provider=llm_resp.provider, llm_model=llm_resp.model,
        fallback_notice=llm_resp.fallback_notice,
    )
