from __future__ import annotations
import json
from db.chroma_manager import query_collection
from services.embeddings import embed_text
from services.llm import call_llm


def build_rag_context(chunks: list[str], metadatas: list[dict]) -> str:
    parts = []
    for i, (chunk, meta) in enumerate(zip(chunks, metadatas)):
        page = meta.get("page_number", "?")
        parts.append(f"[Extrait {i+1} – page {page}]\n{chunk}")
    return "\n\n---\n\n".join(parts)


def build_system_prompt(course_name: str, professor_name: str, professor_style: str) -> str:
    return (
        f"Tu es un tuteur expert du cours {course_name}. "
        f"Tu ne réponds QUE depuis les extraits fournis. "
        f"Si la réponse n'est pas dans les extraits, dis-le clairement. "
        f"Cite toujours la page source.\n"
        f"Professeur : {professor_name}. Style d'évaluation : {professor_style}."
    )


async def rag_query(
    compartment_id: str,
    question: str,
    course_name: str,
    professor_name: str,
    professor_style: str,
    api_key: str,
) -> dict:
    query_embedding = embed_text(question)
    results = query_collection(compartment_id, query_embedding, n_results=5)

    docs = results["documents"][0] if results["documents"] else []
    metas = results["metadatas"][0] if results["metadatas"] else []

    if not docs:
        return {
            "answer": "Aucun document n'a été indexé dans ce compartiment. Veuillez d'abord uploader des documents.",
            "sources": [],
        }

    context = build_rag_context(docs, metas)
    system_prompt = build_system_prompt(course_name, professor_name, professor_style)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Contexte du cours :\n\n{context}\n\nQuestion : {question}"},
    ]

    answer = await call_llm(messages, api_key)

    sources = [
        {"page": int(m.get("page_number", 0)), "excerpt": doc[:200]}
        for doc, m in zip(docs, metas)
    ]
    return {"answer": answer, "sources": sources}
