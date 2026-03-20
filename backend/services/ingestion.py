from __future__ import annotations
import uuid
import os
import fitz  # PyMuPDF
from services.embeddings import embed_batch
from db.chroma_manager import add_chunks


CHUNK_SIZE = 500  # tokens (rough: 1 token ≈ 4 chars)
CHUNK_OVERLAP = 50
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end >= len(words):
            break
        start = end - overlap
    return [c for c in chunks if c.strip()]


def ingest_pdf(
    file_path: str,
    document_id: str,
    compartment_id: str,
) -> tuple[int, list[dict]]:
    """
    Extract text from PDF page by page, chunk it, embed, store in ChromaDB.
    Returns (page_count, chunk_records_for_DB).
    """
    doc = fitz.open(file_path)
    page_count = len(doc)

    chunk_records = []
    all_chunks: list[str] = []
    all_metas: list[dict] = []
    all_ids: list[str] = []

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text").strip()
        if not text:
            continue
        page_chunks = chunk_text(text)
        for idx, chunk in enumerate(page_chunks):
            chunk_id = str(uuid.uuid4())
            all_ids.append(chunk_id)
            all_chunks.append(chunk)
            all_metas.append({
                "compartment_id": compartment_id,
                "document_id": document_id,
                "page_number": page_num,
                "chunk_index": idx,
            })
            chunk_records.append({
                "id": chunk_id,
                "document_id": document_id,
                "compartment_id": compartment_id,
                "content": chunk,
                "page_number": page_num,
                "embedding_id": chunk_id,
            })

    doc.close()

    if all_chunks:
        embeddings = embed_batch(all_chunks)
        add_chunks(
            compartment_id=compartment_id,
            ids=all_ids,
            embeddings=embeddings,
            documents=all_chunks,
            metadatas=all_metas,
        )

    return page_count, chunk_records
