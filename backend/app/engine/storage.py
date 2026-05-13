"""
Supabase Storage file backend.
Bucket: ragai-uploads  (create it in the Supabase dashboard with public or private access)
"""
import uuid
from pathlib import Path

from loguru import logger
from supabase import create_client, Client

from app.core.config import settings

_supabase: Client | None = None
_BUCKET = "ragai-uploads"


def _get_client() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.supabase_url, settings.supabase_service_key)
    return _supabase


def upload_file(content: bytes, original_filename: str, user_id: str) -> tuple[str, str]:
    """
    Upload bytes to Supabase Storage.
    Returns (storage_path, public_url).
    """
    ext = Path(original_filename).suffix.lower()
    path = f"{user_id}/{uuid.uuid4()}{ext}"

    client = _get_client()
    client.storage.from_(_BUCKET).upload(
        path=path,
        file=content,
        file_options={"content-type": _content_type(ext), "upsert": "false"},
    )

    url = client.storage.from_(_BUCKET).get_public_url(path)
    logger.info(f"Uploaded to Supabase Storage: {path}")
    return path, url


def delete_file(storage_path: str) -> None:
    try:
        _get_client().storage.from_(_BUCKET).remove([storage_path])
        logger.info(f"Deleted from Supabase Storage: {storage_path}")
    except Exception as e:
        logger.warning(f"Storage delete failed for {storage_path}: {e}")


def _content_type(ext: str) -> str:
    return {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".csv": "text/csv",
        ".json": "application/json",
    }.get(ext, "application/octet-stream")
