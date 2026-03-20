from __future__ import annotations
import os
import uuid
import shutil
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from db.database import get_db
from models.document import Document, Chunk
from models.compartment import Compartment
from schemas.schemas import DocumentOut

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _ingest_background(file_path: str, document_id: str, compartment_id: str, db_url: str, all_comp_ids: list[str], api_key: str):
    """Background task: ingest PDF and run contradiction detection."""
    from db.database import SessionLocal
    from services.ingestion import ingest_pdf
    from models.document import Document, Chunk
    import asyncio

    db = SessionLocal()
    try:
        page_count, chunk_records = ingest_pdf(file_path, document_id, compartment_id)
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.page_count = page_count
            db.commit()

        for cr in chunk_records:
            chunk = Chunk(**cr)
            db.add(chunk)
        db.commit()

        # Contradiction detection
        if api_key and len(all_comp_ids) > 1:
            from services.contradiction import extract_definitions, check_contradictions
            from models.professor_profile import Contradiction as ContradictionModel
            from db.chroma_manager import get_all_chunks
            import asyncio

            async def _run_contradictions():
                data = get_all_chunks(compartment_id)
                docs_text = " ".join(data.get("documents", [])[:5])
                defs = await extract_definitions(docs_text, api_key)
                contradictions = await check_contradictions(compartment_id, defs, all_comp_ids, api_key)
                for c in contradictions:
                    m = ContradictionModel(id=str(uuid.uuid4()), **c)
                    db.add(m)
                db.commit()

            asyncio.run(_run_contradictions())
    except Exception as e:
        print(f"Background ingestion error: {e}")
    finally:
        db.close()


@router.get("/", response_model=list[DocumentOut])
def list_documents(compartment_id: str, db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.compartment_id == compartment_id).order_by(Document.indexed_at.desc()).all()
    return docs


@router.post("/upload", response_model=DocumentOut)
async def upload_pdf(
    compartment_id: str = Form(...),
    api_key: str = Form(""),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    comp = db.query(Compartment).filter(Compartment.id == compartment_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")

    doc_id = str(uuid.uuid4())
    filename = f"{doc_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    async with aiofiles.open(file_path, "wb") as out:
        content = await file.read()
        await out.write(content)

    doc = Document(
        id=doc_id,
        compartment_id=compartment_id,
        filename=file.filename or "document.pdf",
        source_type="pdf_upload",
        page_count=0,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    from db.database import DATABASE_URL
    from models.compartment import Compartment as Comp
    all_comps = [c.id for c in db.query(Comp).all()]
    background_tasks.add_task(
        _ingest_background, file_path, doc_id, compartment_id, DATABASE_URL, all_comps, api_key
    )

    return doc


@router.post("/scan", response_model=DocumentOut)
async def upload_scan(
    compartment_id: str = Form(...),
    api_key: str = Form(""),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    comp = db.query(Compartment).filter(Compartment.id == compartment_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Compartiment introuvable")

    doc_id = str(uuid.uuid4())
    img_filename = f"scan_img_{doc_id}_{file.filename}"
    img_path = os.path.join(UPLOAD_DIR, img_filename)

    async with aiofiles.open(img_path, "wb") as out:
        content = await file.read()
        await out.write(content)

    from services.ocr import scan_image_to_pdf
    pdf_path, _ = scan_image_to_pdf(img_path)

    doc = Document(
        id=doc_id,
        compartment_id=compartment_id,
        filename=file.filename or "scan.pdf",
        source_type="scan",
        page_count=1,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    from db.database import DATABASE_URL
    from models.compartment import Compartment as Comp
    all_comps = [c.id for c in db.query(Comp).all()]
    background_tasks.add_task(
        _ingest_background, pdf_path, doc_id, compartment_id, DATABASE_URL, all_comps, api_key
    )

    return doc


@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable")
    db.query(Chunk).filter(Chunk.document_id == document_id).delete()
    db.delete(doc)
    db.commit()
    return {"deleted": True}
