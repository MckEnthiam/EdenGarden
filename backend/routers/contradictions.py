from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from models.professor_profile import Contradiction
from schemas.schemas import ContradictionOut

router = APIRouter()


@router.get("/{compartment_id}", response_model=list[ContradictionOut])
def list_contradictions(compartment_id: str, db: Session = Depends(get_db)):
    items = db.query(Contradiction).filter(
        (Contradiction.compartment_a_id == compartment_id) |
        (Contradiction.compartment_b_id == compartment_id)
    ).order_by(Contradiction.severity.desc()).all()
    return items


@router.post("/{contradiction_id}/read")
def mark_read(contradiction_id: str, db: Session = Depends(get_db)):
    item = db.query(Contradiction).filter(Contradiction.id == contradiction_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Contradiction introuvable")
    item.is_read = True
    db.commit()
    return {"marked_read": True}
