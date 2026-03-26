import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATA_DIR = os.getenv("EDEN_DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "data"))
DB_PATH = os.path.join(DATA_DIR, "eden_garden.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

DATABASE_URL = f"sqlite:///{os.path.abspath(DB_PATH)}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import user, compartment, document, quiz_session, professor_profile  # noqa: F401
    Base.metadata.create_all(bind=engine)
