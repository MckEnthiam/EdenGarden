from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.database import get_db
from models.compartment import Compartment
from models.document import Document, Chunk
from models.professor_profile import Contradiction
from models.quiz_session import QuizSession, QuizAnswer
from schemas.schemas import CompartmentCreate, CompartmentOut
from auth import get_current_user_id

router = APIRouter()


@router.get("/", response_model=list[CompartmentOut])
def list_compartments(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    compartments = db.query(Compartment).filter(Compartment.user_id == user_id).order_by(Compartment.created_at.desc()).all()
    result = []
    for c in compartments:
        doc_count = db.query(Document).filter(Document.compartment_id == c.id, Document.user_id == user_id).count()
        contra_count = db.query(Contradiction).filter(
            ((Contradiction.compartment_a_id == c.id) | (Contradiction.compartment_b_id == c.id)) & (Contradiction.user_id == user_id),
            Contradiction.is_read == False,
        ).count()
        co = CompartmentOut.model_validate(c)
        co.document_count = doc_count
        co.contradiction_count = contra_count
        result.append(co)
    return result


@router.post("/", response_model=CompartmentOut)
def create_compartment(data: CompartmentCreate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    compartment = Compartment(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=data.name,
        subject=data.subject,
        professor_name=data.professor_name,
        professor_style=data.professor_style,
        exam_date=data.exam_date,
        same_prof_as=data.same_prof_as or [],
    )
    db.add(compartment)
    db.commit()
    db.refresh(compartment)
    co = CompartmentOut.model_validate(compartment)
    co.document_count = 0
    co.contradiction_count = 0
    return co


@router.get("/{compartment_id}", response_model=CompartmentOut)
def get_compartment(
    compartment_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    c = (
        db.query(Compartment)
        .filter(Compartment.id == compartment_id, Compartment.user_id == user_id)
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")
    doc_count = (
        db.query(Document)
        .filter(Document.compartment_id == c.id, Document.user_id == user_id)
        .count()
    )
    contra_count = db.query(Contradiction).filter(
        ((Contradiction.compartment_a_id == c.id) | (Contradiction.compartment_b_id == c.id))
        & (Contradiction.user_id == user_id),
        Contradiction.is_read.is_(False),
    ).count()
    co = CompartmentOut.model_validate(c)
    co.document_count = doc_count
    co.contradiction_count = contra_count
    return co


@router.put("/{compartment_id}", response_model=CompartmentOut)
def update_compartment(
    compartment_id: str,
    data: CompartmentCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    c = (
        db.query(Compartment)
        .filter(Compartment.id == compartment_id, Compartment.user_id == user_id)
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")
    c.name = data.name
    c.subject = data.subject
    c.professor_name = data.professor_name
    c.professor_style = data.professor_style
    c.exam_date = data.exam_date
    c.same_prof_as = data.same_prof_as or []
    db.commit()
    db.refresh(c)
    co = CompartmentOut.model_validate(c)
    co.document_count = (
        db.query(Document)
        .filter(Document.compartment_id == c.id, Document.user_id == user_id)
        .count()
    )
    co.contradiction_count = db.query(Contradiction).filter(
        ((Contradiction.compartment_a_id == c.id) | (Contradiction.compartment_b_id == c.id))
        & (Contradiction.user_id == user_id),
        Contradiction.is_read.is_(False),
    ).count()
    return co


@router.delete("/{compartment_id}")
def delete_compartment(
    compartment_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    c = (
        db.query(Compartment)
        .filter(Compartment.id == compartment_id, Compartment.user_id == user_id)
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")
    db.delete(c)
    db.commit()
    from db.chroma_manager import delete_collection
    delete_collection(compartment_id)
    return {"deleted": True}


@router.get("/{compartment_id}/stats")
def get_compartment_stats(
    compartment_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    comp = (
        db.query(Compartment)
        .filter(Compartment.id == compartment_id, Compartment.user_id == user_id)
        .first()
    )
    if not comp:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")

    quiz_count = (
        db.query(QuizSession)
        .filter(QuizSession.compartment_id == compartment_id, QuizSession.user_id == user_id)
        .count()
    )
    avg_score = (
        db.query(func.avg(QuizSession.score))
        .filter(QuizSession.compartment_id == compartment_id, QuizSession.user_id == user_id)
        .scalar()
        or 0.0
    )
    chunk_count = (
        db.query(Chunk)
        .filter(Chunk.compartment_id == compartment_id, Chunk.user_id == user_id)
        .count()
    )
    contra_count = db.query(Contradiction).filter(
        ((Contradiction.compartment_a_id == compartment_id) | (Contradiction.compartment_b_id == compartment_id))
        & (Contradiction.user_id == user_id)
    ).count()

    return {
        "quiz_count": quiz_count,
        "average_score": float(round(avg_score, 1)) if avg_score else 0.0,
        "contradiction_count": contra_count,
        "created_at": comp.created_at,
        "chunk_count": chunk_count,
    }


@router.delete("/{compartment_id}/quiz-history")
def reset_quiz_history(
    compartment_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    # Ensure compartment belongs to user
    comp = (
        db.query(Compartment)
        .filter(Compartment.id == compartment_id, Compartment.user_id == user_id)
        .first()
    )
    if not comp:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")

    sessions = (
        db.query(QuizSession.id)
        .filter(QuizSession.compartment_id == compartment_id, QuizSession.user_id == user_id)
        .all()
    )
    session_ids = [s.id for s in sessions]
    if session_ids:
        db.query(QuizAnswer).filter(QuizAnswer.session_id.in_(session_ids), QuizAnswer.user_id == user_id).delete(
            synchronize_session=False
        )
        db.query(QuizSession).filter(QuizSession.id.in_(session_ids), QuizSession.user_id == user_id).delete(
            synchronize_session=False
        )
        db.commit()

    return {"reset": True}


@router.delete("/{compartment_id}/documents")
def delete_all_documents(
    compartment_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    comp = (
        db.query(Compartment)
        .filter(Compartment.id == compartment_id, Compartment.user_id == user_id)
        .first()
    )
    if not comp:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")

    # Delete chunks, then documents
    doc_ids = [
        d.id
        for d in db.query(Document.id)
        .filter(Document.compartment_id == compartment_id, Document.user_id == user_id)
        .all()
    ]
    if doc_ids:
        db.query(Chunk).filter(Chunk.compartment_id == compartment_id, Chunk.user_id == user_id).delete(
            synchronize_session=False
        )
        db.query(Document).filter(Document.id.in_(doc_ids), Document.user_id == user_id).delete(
            synchronize_session=False
        )
        db.commit()

    from db.chroma_manager import delete_collection

    delete_collection(compartment_id)
    return {"deleted": True}
