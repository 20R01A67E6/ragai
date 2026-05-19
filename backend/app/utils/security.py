import os
from fastapi import HTTPException, UploadFile

BLOCKED_PATTERNS = [
    "ignore previous", "ignore instructions",
    "system prompt", "jailbreak", "forget everything",
    "you are now", "act as", "pretend you are",
    "disregard", "override instructions",
]

ALLOWED_EXTENSIONS = {
    '.pdf', '.docx', '.txt', '.md',
    '.csv', '.json', '.py', '.js',
    '.ts', '.jsx', '.tsx', '.html',
    '.css', '.java', '.cpp', '.c',
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_query(query: str) -> str:
    if len(query) > 500:
        raise HTTPException(400, "Query too long")
    query_lower = query.lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern in query_lower:
            raise HTTPException(400, "Invalid query")
    return query.strip()


def validate_file(file: UploadFile) -> None:
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type {ext} not allowed")
    if ".." in file.filename or "/" in file.filename:
        raise HTTPException(400, "Invalid filename")
