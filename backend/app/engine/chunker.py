import re
from typing import List, Tuple, Dict
from app.core.config import settings


def chunk_text(
    text: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> List[str]:
    chunk_size = chunk_size or settings.default_chunk_size
    chunk_overlap = chunk_overlap or settings.default_chunk_overlap

    text = re.sub(r"\n{3,}", "\n\n", text.strip())
    words = text.split()
    chunks, start = [], 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += chunk_size - chunk_overlap

    return [c for c in chunks if c.strip()]


def chunk_code(
    code: str,
    language: str = "python",
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> List[Tuple[str, Dict]]:
    """Code-aware chunking: splits on top-level boundaries, falls back to line sliding window."""

    chunk_size = chunk_size or settings.code_chunk_size
    chunk_overlap = chunk_overlap or settings.code_chunk_overlap

    # Try to split on function/class definitions
    patterns = {
        "python": r"(?=^(?:def |class |async def )\w)",
        "javascript": r"(?=^(?:function |const |class |async function )\w)",
        "typescript": r"(?=^(?:function |const |class |async function |interface |type )\w)",
        "java": r"(?=^\s*(?:public|private|protected|static)\s+\w)",
        "go": r"(?=^func \w)",
        "rust": r"(?=^(?:pub |async )?fn \w)",
    }
    pattern = patterns.get(language, r"\n{2,}")
    blocks = re.split(pattern, code, flags=re.MULTILINE)
    blocks = [b.strip() for b in blocks if b.strip()]

    results: List[Tuple[str, Dict]] = []
    for block in blocks:
        lines = block.splitlines()
        if len(lines) <= chunk_size:
            results.append((block, {"language": language, "type": "block"}))
        else:
            # sliding window on lines
            start = 0
            while start < len(lines):
                end = min(start + chunk_size, len(lines))
                results.append((
                    "\n".join(lines[start:end]),
                    {"language": language, "type": "window"},
                ))
                if end == len(lines):
                    break
                start += chunk_size - chunk_overlap

    return results
