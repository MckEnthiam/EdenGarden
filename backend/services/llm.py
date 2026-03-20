from __future__ import annotations
import re


def detect_provider(api_key: str) -> str:
    if api_key.startswith("sk-ant-"):
        return "anthropic"
    elif api_key.startswith("sk-"):
        return "openai"
    elif api_key.startswith("gsk_"):
        return "groq"
    elif api_key.startswith("AIza"):
        return "gemini"
    return "unknown"


def get_model_for_provider(provider: str) -> str:
    models = {
        "anthropic": "claude-sonnet-4-5",
        "openai": "gpt-4o",
        "groq": "llama-3.3-70b-versatile",
        "gemini": "gemini-2.0-flash",
    }
    return models.get(provider, "gpt-4o")


async def call_llm(messages: list[dict], api_key: str, max_tokens: int = 2048) -> str:
    provider = detect_provider(api_key)

    if provider == "groq":
        return await _call_groq(messages, api_key, max_tokens)
    elif provider == "openai":
        return await _call_openai(messages, api_key, max_tokens)
    elif provider == "anthropic":
        return await _call_anthropic(messages, api_key, max_tokens)
    elif provider == "gemini":
        return await _call_gemini(messages, api_key, max_tokens)
    else:
        return "Erreur : aucune clé API valide configurée. Rendez-vous dans les Paramètres."


async def _call_groq(messages: list[dict], api_key: str, max_tokens: int) -> str:
    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=api_key)
        response = await client.chat.completions.create(
            model=get_model_for_provider("groq"),
            messages=messages,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        return f"Erreur Groq : {str(e)}"


async def _call_openai(messages: list[dict], api_key: str, max_tokens: int) -> str:
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model=get_model_for_provider("openai"),
            messages=messages,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        return f"Erreur OpenAI : {str(e)}"


async def _call_anthropic(messages: list[dict], api_key: str, max_tokens: int) -> str:
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        human_messages = [m for m in messages if m["role"] != "system"]
        response = await client.messages.create(
            model=get_model_for_provider("anthropic"),
            max_tokens=max_tokens,
            system=system,
            messages=human_messages,
        )
        return response.content[0].text if response.content else ""
    except Exception as e:
        return f"Erreur Anthropic : {str(e)}"


async def _call_gemini(messages: list[dict], api_key: str, max_tokens: int) -> str:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(get_model_for_provider("gemini"))
        combined = "\n\n".join(m["content"] for m in messages)
        response = await model.generate_content_async(combined)
        return response.text or ""
    except Exception as e:
        return f"Erreur Gemini : {str(e)}"
