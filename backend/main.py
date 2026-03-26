import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

#
# Important: these imports use the "backend root" as module base (e.g. `db.*`, `models.*`).
# When this file is imported from outside the `backend/` directory, Python's sys.path
# may not include `backend/`, causing `ModuleNotFoundError: No module named 'db'`.
#
sys.path.insert(0, os.path.dirname(__file__))

from db.database import init_db
from routers import compartments, documents, chat, quiz, exam, llm as llm_router, contradictions, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Eden Garden API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "app://.", "file://"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compartments.router, prefix="/api/compartments", tags=["compartments"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])
app.include_router(exam.router, prefix="/api/exam", tags=["exam"])
app.include_router(llm_router.router, prefix="/api/llm", tags=["llm"])
app.include_router(contradictions.router, prefix="/api/contradictions", tags=["contradictions"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("EDEN_BACKEND_PORT", "8000"))
    uvicorn.run("main:app", host="127.0.0.1", port=port, log_level="info")

