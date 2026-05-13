import io
from pathlib import Path
from typing import Tuple
from loguru import logger


SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".docx", ".md", ".csv", ".json", ".py", ".js", ".ts", ".java", ".go", ".rs"}


def detect_file_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    type_map = {
        ".pdf": "pdf", ".txt": "text", ".md": "text",
        ".docx": "docx", ".csv": "csv", ".json": "json",
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".java": "java", ".go": "go", ".rs": "rust",
    }
    return type_map.get(ext, "text")


async def parse_file(content: bytes, filename: str) -> Tuple[str, str]:
    """Returns (extracted_text, file_type)."""
    file_type = detect_file_type(filename)

    if file_type == "pdf":
        return _parse_pdf(content), file_type
    elif file_type == "docx":
        return _parse_docx(content), file_type
    elif file_type in ("csv",):
        return _parse_csv(content), file_type
    elif file_type == "json":
        return _parse_json(content), file_type
    else:
        return content.decode("utf-8", errors="replace"), file_type


def _parse_pdf(content: bytes) -> str:
    import PyPDF2

    reader = PyPDF2.PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def _parse_docx(content: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(content))
    return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())


def _parse_csv(content: bytes) -> str:
    import pandas as pd

    df = pd.read_csv(io.BytesIO(content))
    return df.to_string(index=False)


def _parse_json(content: bytes) -> str:
    import json

    data = json.loads(content.decode("utf-8"))
    return json.dumps(data, indent=2)
