RAG_SYSTEM = """You are a helpful AI assistant. Answer the user's question using ONLY the provided context.
If the context doesn't contain enough information, say so clearly. Do not fabricate information.
Cite sources when possible. Be concise and accurate."""

RAG_PROMPT = """Context information:
{context}

User question: {query}

Answer:"""

PRODUCT_SYSTEM = """You are a product recommendation assistant. Analyze the provided product catalog entries
and recommend the best products that match the user's needs. Explain why each product fits their requirements.
Be specific and helpful."""

PRODUCT_PROMPT = """Product catalog entries:
{context}

Customer query: {query}

Provide a personalized recommendation:"""

CODE_SYSTEM = """You are an expert software engineer and code reviewer. Answer questions about the provided
codebase accurately. Explain code behavior, identify issues, and suggest improvements where appropriate."""

CODE_PROMPT = """Relevant code snippets:
{context}

Developer question: {query}

Answer:"""

NEWS_SYSTEM = """You are a news analyst. Summarize and analyze the provided news articles clearly and objectively.
Highlight key themes, important facts, and relevant insights."""

NEWS_PROMPT = """Recent news articles:
{context}

{topic_instruction}

Summary:"""

NEWS_TOPIC_INSTRUCTION = "Focus specifically on: {topic}"
NEWS_DEFAULT_INSTRUCTION = "Provide a comprehensive summary of these articles."


def build_rag_prompt(context_docs: list, query: str) -> tuple[str, str]:
    context = "\n\n---\n\n".join(
        f"[Source {i+1}]\n{doc['text']}" for i, doc in enumerate(context_docs)
    )
    return RAG_SYSTEM, RAG_PROMPT.format(context=context, query=query)


def build_product_prompt(context_docs: list, query: str) -> tuple[str, str]:
    context = "\n\n---\n\n".join(
        f"Product: {doc.get('metadata', {}).get('name', 'Unknown')}\n{doc['text']}"
        for doc in context_docs
    )
    return PRODUCT_SYSTEM, PRODUCT_PROMPT.format(context=context, query=query)


def build_code_prompt(context_docs: list, query: str) -> tuple[str, str]:
    context = "\n\n---\n\n".join(
        f"[File: {doc.get('metadata', {}).get('source', 'unknown')}]\n```{doc.get('metadata', {}).get('language', '')}\n{doc['text']}\n```"
        for doc in context_docs
    )
    return CODE_SYSTEM, CODE_PROMPT.format(context=context, query=query)


def build_news_prompt(context_docs: list, topic: str | None = None) -> tuple[str, str]:
    context = "\n\n---\n\n".join(
        f"[{doc.get('metadata', {}).get('title', 'Article')}]\n{doc['text']}"
        for doc in context_docs
    )
    topic_instruction = (
        NEWS_TOPIC_INSTRUCTION.format(topic=topic) if topic else NEWS_DEFAULT_INSTRUCTION
    )
    return NEWS_SYSTEM, NEWS_PROMPT.format(context=context, topic_instruction=topic_instruction)
