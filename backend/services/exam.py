from __future__ import annotations
import json
from services.llm import call_llm
from db.chroma_manager import get_all_chunks


async def generate_exam(
    compartment_id: str,
    professor_name: str,
    professor_style: str,
    course_name: str,
    weak_chapters: list[str],
    api_key: str,
) -> dict:
    """Generate a predictive exam based on course content and professor patterns."""
    data = get_all_chunks(compartment_id)
    docs = data.get("documents", [])
    metas = data.get("metadatas", [])

    if not docs:
        return {"questions": [], "total_points": 0, "estimated_duration": 0}

    # Sample corpus (first 4000 chars)
    corpus = " ".join(docs)[:4000]

    pattern_prompt = (
        f"Analyse ce corpus de cours de '{course_name}' "
        f"(professeur : {professor_name}, style : {professor_style}) "
        "et identifie : le type de questions privilégié (QCM/ouvert/pratique), "
        "les chapitres les plus denses, le vocabulaire récurrent, le niveau de détail attendu. "
        "Réponds en JSON strict : {\"question_type\": ..., \"dense_topics\": [...], "
        "\"vocabulary\": [...], \"detail_level\": ...}\n\n"
        f"Corpus :\n{corpus}"
    )

    pattern_response = await call_llm([{"role": "user", "content": pattern_prompt}], api_key)
    try:
        ps = pattern_response.find("{")
        pe = pattern_response.rfind("}") + 1
        patterns = json.loads(pattern_response[ps:pe]) if ps >= 0 else {}
    except Exception:
        patterns = {}

    # Build exam prompt
    exam_prompt = (
        f"Génère un examen complet pour le cours '{course_name}'. "
        f"Professeur : {professor_name}. Style d'évaluation : {professor_style}. "
        f"Patterns détectés : {json.dumps(patterns, ensure_ascii=False)}. "
        f"Chapitres à renforcer : {', '.join(weak_chapters) if weak_chapters else 'tous'}. "
        "Génère 8 questions variées. "
        "Réponds UNIQUEMENT en JSON strict : "
        "{\"questions\": [{\"question\": ..., \"type\": \"qcm|ouvert|pratique\", "
        "\"points\": <int>, \"expected_answer\": ..., \"source_page\": <int>}], "
        "\"total_points\": <int>, \"estimated_duration\": <minutes:int>}\n\n"
        f"Extraits du cours :\n{corpus[:2000]}"
    )

    response = await call_llm([{"role": "user", "content": exam_prompt}], api_key)

    try:
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(response[start:end])
            return result
    except Exception:
        pass

    return {
        "questions": [],
        "total_points": 0,
        "estimated_duration": 0,
        "error": "Impossible de parser la réponse du modèle.",
    }
