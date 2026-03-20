import uuid
from datetime import datetime
from sqlalchemy import String, Text, Float, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from db.database import Base


class ProfessorProfile(Base):
    __tablename__ = "professor_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    style_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    detected_patterns: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    compartment_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)


class Contradiction(Base):
    __tablename__ = "contradictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    term: Mapped[str] = mapped_column(String(200), nullable=False)
    compartment_a_id: Mapped[str] = mapped_column(String(36), ForeignKey("compartments.id"), nullable=False)
    compartment_b_id: Mapped[str] = mapped_column(String(36), ForeignKey("compartments.id"), nullable=False)
    definition_a: Mapped[str] = mapped_column(Text, nullable=False)
    definition_b: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[float] = mapped_column(Float, default=0.5)
    detected_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    is_read: Mapped[bool] = mapped_column(default=False)
