import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from db.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    google_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    last_login_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)