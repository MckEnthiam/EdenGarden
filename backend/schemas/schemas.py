from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


# ── Compartments ──────────────────────────────────────────────

class CompartmentCreate(BaseModel):
    name: str
    subject: str
    professor_name: str = ""
    professor_style: str = ""
    exam_date: Optional[date] = None
    same_prof_as: Optional[list[str]] = None


class CompartmentOut(BaseModel):
    id: str
    name: str
    subject: str
    professor_name: str
    professor_style: str
    exam_date: Optional[date]
    same_prof_as: Optional[list[str]]
    created_at: datetime
    document_count: int = 0
    contradiction_count: int = 0
    mastery_score: float = 0.0

    model_config = {"from_attributes": True}


# ── Documents ─────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: str
    compartment_id: str
    filename: str
    source_type: str
    page_count: int
    indexed_at: datetime

    model_config = {"from_attributes": True}


# ── Chat / RAG ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    content: str
    compartment_id: str
    api_key: str


class SourceChunk(BaseModel):
    page: int
    excerpt: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]


# ── Quiz ──────────────────────────────────────────────────────

class QuizGenerateRequest(BaseModel):
    compartment_id: str
    n_questions: int = 10
    quiz_type: str = "mixed"  # "qcm" | "open" | "mixed"
    api_key: str


class QuizQuestion(BaseModel):
    question: str
    type: str  # "qcm" | "open"
    options: Optional[list[str]] = None
    expected_answer: str
    source_page: int


class QuizSessionOut(BaseModel):
    session_id: str
    questions: list[QuizQuestion]


class AnswerSubmit(BaseModel):
    session_id: str
    answers: list[dict]  # [{question_index, user_answer}]
    api_key: str


class QuizResult(BaseModel):
    score: float
    total: int
    correct: int
    answers: list[dict]


# ── Exam ──────────────────────────────────────────────────────

class ExamGenerateRequest(BaseModel):
    compartment_id: str
    api_key: str


class ExamQuestion(BaseModel):
    question: str
    type: str
    points: int
    expected_answer: str
    source_page: int


class ExamOut(BaseModel):
    questions: list[ExamQuestion]
    total_points: int
    estimated_duration: int  # minutes


# ── Contradictions ───────────────────────────────────────────

class ContradictionOut(BaseModel):
    id: str
    term: str
    compartment_a_id: str
    compartment_b_id: str
    definition_a: str
    definition_b: str
    severity: float
    detected_at: datetime
    is_read: bool

    model_config = {"from_attributes": True}
