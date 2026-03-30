from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from models.compartment import Compartment
from models.quiz_session import QuizAnswer
from schemas.schemas import ExamGenerateRequest, ExamOut, ExamQuestion
from services.exam import generate_exam
from auth import get_current_user_id

router = APIRouter()


@router.post("/generate", response_model=ExamOut)
async def generate_exam_endpoint(req: ExamGenerateRequest, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    comp = db.query(Compartment).filter(Compartment.id == req.compartment_id, Compartment.user_id == user_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")

    # Find weak chapters from quiz history (questions often wrong)
    wrong_answers = (
        db.query(QuizAnswer)
        .filter(QuizAnswer.user_id == user_id, QuizAnswer.is_correct == False)
        .all()
    )
    weak_chapters: list[str] = []

    result = await generate_exam(
        compartment_id=req.compartment_id,
        professor_name=comp.professor_name,
        professor_style=comp.professor_style,
        course_name=comp.name,
        weak_chapters=weak_chapters,
        api_key=req.api_key,
    )

    questions = [
        ExamQuestion(
            question=q.get("question", ""),
            type=q.get("type", "ouvert"),
            points=int(q.get("points", 2)),
            expected_answer=q.get("expected_answer", ""),
            source_page=int(q.get("source_page", 1)),
        )
        for q in result.get("questions", [])
    ]

    return ExamOut(
        questions=questions,
        total_points=result.get("total_points", sum(q.points for q in questions)),
        estimated_duration=result.get("estimated_duration", 90),
    )
