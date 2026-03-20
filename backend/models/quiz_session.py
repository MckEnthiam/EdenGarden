import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from db.database import Base


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    compartment_id: Mapped[str] = mapped_column(String(36), ForeignKey("compartments.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    score: Mapped[float] = mapped_column(Float, default=0.0)


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("quiz_sessions.id"), nullable=False)
    question: Mapped[str] = mapped_column(String, nullable=False)
    expected_answer: Mapped[str] = mapped_column(String, nullable=False)
    user_answer: Mapped[str] = mapped_column(String, nullable=False, default="")
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    source_chunk_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("chunks.id"), nullable=True)
    source_page: Mapped[int] = mapped_column(Integer, default=1)
