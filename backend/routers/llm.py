from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel
from services.llm import detect_provider, get_model_for_provider

router = APIRouter()


class ProviderInfo(BaseModel):
    provider: str
    model: str
    label: str


@router.post("/detect-provider", response_model=ProviderInfo)
async def detect(body: dict):
    api_key = body.get("api_key", "")
    provider = detect_provider(api_key)
    model = get_model_for_provider(provider)
    labels = {
        "anthropic": "CLAUDE",
        "openai": "GPT-4O",
        "groq": "GROQ",
        "gemini": "GEMINI",
        "unknown": "NO MODEL",
    }
    return ProviderInfo(provider=provider, model=model, label=labels.get(provider, "NO MODEL"))
