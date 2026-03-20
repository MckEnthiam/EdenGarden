import os
import chromadb
from chromadb.config import Settings
from chromadb.api.models.Collection import Collection

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "chroma")
os.makedirs(CHROMA_PATH, exist_ok=True)

_client: chromadb.PersistentClient = None


def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=CHROMA_PATH,
            settings=Settings(anonymized_telemetry=False),
        )
    return _client


def get_collection(compartment_id: str) -> chromadb.Collection:
    client = get_client()
    collection_name = f"compartment_{compartment_id.replace('-', '_')}"
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )


def delete_collection(compartment_id: str) -> None:
    client = get_client()
    collection_name = f"compartment_{compartment_id.replace('-', '_')}"
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass


def add_chunks(
    compartment_id: str,
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    collection = get_collection(compartment_id)
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def query_collection(
    compartment_id: str,
    query_embedding: list[float],
    n_results: int = 5,
) -> dict:
    collection = get_collection(compartment_id)
    count = collection.count()
    if count == 0:
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}
    n_results = min(n_results, count)
    return collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )


def get_all_chunks(compartment_id: str) -> dict:
    collection = get_collection(compartment_id)
    if collection.count() == 0:
        return {"documents": [], "metadatas": []}
    return collection.get(include=["documents", "metadatas"])
