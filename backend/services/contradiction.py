from __future__ import annotations
import json
from services.llm import call_llm, detect_provider
from services.embeddings import embed_text
from db.chroma_manager import get_all_chunks


async def extract_definitions(text: str, api_key: str) -> list[dict]:
    """Extract key definitions from a document via LLM."""
    prompt = (
        "Liste les définitions et concepts importants de ce texte en JSON. "
        "Réponds UNIQUEMENT avec un tableau JSON valide, rien d'autre. "
        "Format : [{\"term\": \"...\", \"definition\": \"...\"}]\n\n"
        f"Texte :\n{text[:3000]}"
    )
    messages = [{"role": "user", "content": prompt}]
    response = await call_llm(messages, api_key)
    try:
        start = response.find("[")
        end = response.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
    except Exception:
        pass
    return []


async def check_contradictions(
    compartment_id: str,
    new_definitions: list[dict],
    all_compartment_ids: list[str],
    api_key: str,
) -> list[dict]:
    """
    Compare new definitions against definitions from all related compartments.
    Returns list of contradiction records.
    """
    contradictions = []

    for other_id in all_compartment_ids:
        if other_id == compartment_id:
            continue

        other_data = get_all_chunks(other_id)
        other_docs = other_data.get("documents", [])
        if not other_docs:
            continue

        combined_text = " ".join(other_docs[:10])  # sample
        other_definitions = await extract_definitions(combined_text, api_key)

        for new_def in new_definitions:
            for other_def in other_definitions:
                if new_def["term"].lower() != other_def["term"].lower():
                    continue

                import asyncio
                emb_a = await asyncio.to_thread(embed_text, new_def["definition"])
                emb_b = await asyncio.to_thread(embed_text, other_def["definition"])

                import numpy as np
                similarity = float(np.dot(emb_a, emb_b))

                if similarity < 0.75:
                    severity = round(1.0 - similarity, 3)
                    contradictions.append({
                        "term": new_def["term"],
                        "compartment_a_id": compartment_id,
                        "compartment_b_id": other_id,
                        "definition_a": new_def["definition"],
                        "definition_b": other_def["definition"],
                        "severity": severity,
                    })

    return contradictions
