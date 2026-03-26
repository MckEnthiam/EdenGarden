from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from models.compartment import Compartment
from schemas.schemas import ChatMessage, ChatResponse
from services.rag import rag_query
from auth import get_current_user_id

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def chat(message: ChatMessage, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    comp = db.query(Compartment).filter(Compartment.id == message.compartment_id, Compartment.user_id == user_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")

    result = await rag_query(
        compartment_id=message.compartment_id,
        question=message.content,
        course_name=comp.name,
        professor_name=comp.professor_name,
        professor_style=comp.professor_style,
        api_key=message.api_key,
    )
    return ChatResponse(
        answer=result["answer"],
        sources=[{"page": s["page"], "excerpt": s["excerpt"]} for s in result["sources"]],
    )
