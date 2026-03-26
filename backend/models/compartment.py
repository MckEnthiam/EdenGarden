import uuid
from datetime import datetime, date
from sqlalchemy import String, Integer, DateTime, Date, JSON, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional

from db.database import Base

class Compartment(Base):
    __tablename__ = "compartments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(50))
    subject: Mapped[str] = mapped_column(String(100))
    professor_name: Mapped[str] = mapped_column(String(100))
    professor_style: Mapped[str] = mapped_column(String(200))
    exam_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    same_prof_as: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
