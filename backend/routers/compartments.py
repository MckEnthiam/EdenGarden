from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from models.compartment import Compartment
from models.document import Document
from models.professor_profile import Contradiction
from schemas.schemas import CompartmentCreate, CompartmentOut

router = APIRouter()


@router.get("/", response_model=list[CompartmentOut])
def list_compartments(db: Session = Depends(get_db)):
    compartments = db.query(Compartment).order_by(Compartment.created_at.desc()).all()
    result = []
    for c in compartments:
        doc_count = db.query(Document).filter(Document.compartment_id == c.id).count()
        contra_count = db.query(Contradiction).filter(
            (Contradiction.compartment_a_id == c.id) | (Contradiction.compartment_b_id == c.id),
            Contradiction.is_read == False,
        ).count()
        co = CompartmentOut.model_validate(c)
        co.document_count = doc_count
        co.contradiction_count = contra_count
        result.append(co)
    return result


@router.post("/", response_model=CompartmentOut)
def create_compartment(data: CompartmentCreate, db: Session = Depends(get_db)):
    compartment = Compartment(
        id=str(uuid.uuid4()),
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
def get_compartment(compartment_id: str, db: Session = Depends(get_db)):
    c = db.query(Compartment).filter(Compartment.id == compartment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")
    doc_count = db.query(Document).filter(Document.compartment_id == c.id).count()
    contra_count = db.query(Contradiction).filter(
        (Contradiction.compartment_a_id == c.id) | (Contradiction.compartment_b_id == c.id),
        Contradiction.is_read == False,
    ).count()
    co = CompartmentOut.model_validate(c)
    co.document_count = doc_count
    co.contradiction_count = contra_count
    return co


@router.put("/{compartment_id}", response_model=CompartmentOut)
def update_compartment(compartment_id: str, data: CompartmentCreate, db: Session = Depends(get_db)):
    c = db.query(Compartment).filter(Compartment.id == compartment_id).first()
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
    co.document_count = db.query(Document).filter(Document.compartment_id == c.id).count()
    co.contradiction_count = 0
    return co


@router.delete("/{compartment_id}")
def delete_compartment(compartment_id: str, db: Session = Depends(get_db)):
    c = db.query(Compartment).filter(Compartment.id == compartment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")
    db.delete(c)
    db.commit()
    from db.chroma_manager import delete_collection
    delete_collection(compartment_id)
    return {"deleted": True}
