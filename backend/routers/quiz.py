from __future__ import annotations
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from models.compartment import Compartment
from models.quiz_session import QuizSession, QuizAnswer
from schemas.schemas import (
    QuizGenerateRequest, QuizSessionOut, QuizQuestion,
    AnswerSubmit, QuizResult, QuizAnswerOut
)
from services.llm import call_llm
from db.chroma_manager import get_all_chunks
from auth import get_current_user_id

router = APIRouter()


async def _generate_questions(compartment_id: str, n: int, quiz_type: str, comp: Compartment, api_key: str) -> list[dict]:
    data = get_all_chunks(compartment_id)
    docs = data.get("documents", [])
    if not docs:
        return []
    corpus = " ".join(docs)[:3000]
    type_instruction = {
        "qcm": "des QCM avec 4 options (une seule bonne réponse)",
        "open": "des questions ouvertes avec réponses détaillées",
        "mixed": "un mélange de QCM et de questions ouvertes",
    }.get(quiz_type, "des questions variées")
    prompt = (
        f"Génère {n} questions ({type_instruction}) pour le cours '{comp.name}' "
        f"(professeur : {comp.professor_name}). "
        "Réponds UNIQUEMENT en JSON strict : "
        "[{\"question\": ..., \"type\": \"qcm|open\", \"options\": [\"A\",\"B\",\"C\",\"D\"] ou null, "
        "\"expected_answer\": ..., \"source_page\": <int>}]\n\n"
        f"Extraits : {corpus}"
    )
    response = await call_llm([{"role": "user", "content": prompt}], api_key)
    try:
        start = response.find("[")
        end = response.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
    except Exception:
        pass
    return []


@router.post("/generate", response_model=QuizSessionOut)
async def generate_quiz(req: QuizGenerateRequest, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    comp = db.query(Compartment).filter(Compartment.id == req.compartment_id, Compartment.user_id == user_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")

    questions_raw = await _generate_questions(
        req.compartment_id, req.n_questions, req.quiz_type, comp, req.api_key
    )

    session_id = str(uuid.uuid4())
    session = QuizSession(id=session_id, user_id=user_id, compartment_id=req.compartment_id, score=0.0)
    db.add(session)

    questions_out = []
    for q in questions_raw:
        qa = QuizAnswer(
            id=str(uuid.uuid4()),
            user_id=user_id,
            session_id=session_id,
            question=q.get("question", ""),
            expected_answer=q.get("expected_answer", ""),
            source_page=int(q.get("source_page", 1)),
        )
        db.add(qa)
        questions_out.append(QuizQuestion(
            question=q.get("question", ""),
            type=q.get("type", "open"),
            options=q.get("options"),
            expected_answer=q.get("expected_answer", ""),
            source_page=int(q.get("source_page", 1)),
        ))
    db.commit()

    return QuizSessionOut(session_id=session_id, questions=questions_out)


@router.post("/submit", response_model=QuizResult)
async def submit_quiz(req: AnswerSubmit, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session introuvable")

    answers = db.query(QuizAnswer).filter(QuizAnswer.session_id == req.session_id).all()
    results = []
    correct = 0

    for i, answer in enumerate(answers):
        user_ans = req.answers[i]["user_answer"] if i < len(req.answers) else ""
        prompt = (
            f"Question : {answer.question}\n"
            f"Réponse attendue : {answer.expected_answer}\n"
            f"Réponse de l'étudiant : {user_ans}\n"
            "Est-ce correct ? Réponds uniquement par 'oui' ou 'non'."
        )
        llm_response = await call_llm([{"role": "user", "content": prompt}], req.api_key)
        is_correct = "oui" in llm_response.lower()

        answer.user_answer = user_ans
        answer.is_correct = is_correct
        if is_correct:
            correct += 1

        results.append(QuizAnswerOut(
            question=answer.question,
            expected=answer.expected_answer,
            given=user_ans,
            correct=is_correct,
            source_page=answer.source_page,
        ))

    score = correct / len(answers) if answers else 0.0
    session.score = round(score * 100, 1)
    db.commit()

    return QuizResult(score=session.score, total=len(answers), correct=correct, answers=results)
