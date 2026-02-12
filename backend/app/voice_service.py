"""Sarvam AI Text-to-Speech integration (Bulbul v3)."""

import os
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)

SARVAM_API_URL = "https://api.sarvam.ai/text-to-speech"
MAX_CHUNK_LENGTH = 2500  # Sarvam v3 limit per request


def get_sarvam_api_key() -> Optional[str]:
    key = os.getenv("SARVAM_API_KEY")
    if not key:
        logger.info("SARVAM_API_KEY not configured — voice feature disabled")
    return key


def text_to_speech(text: str, language: str = "en-IN", speaker: str = "meera") -> Optional[str]:
    """
    Convert text to speech using Sarvam AI Bulbul v3.

    Args:
        text: Text to convert (max 2500 chars per chunk)
        language: BCP-47 language code (en-IN, hi-IN, etc.)
        speaker: Voice name (default: meera)

    Returns:
        Base64-encoded audio string (wav), or None on failure
    """
    api_key = get_sarvam_api_key()
    if not api_key:
        return None

    # Truncate if too long (we'll take first chunk for now)
    if len(text) > MAX_CHUNK_LENGTH:
        text = text[:MAX_CHUNK_LENGTH]
        logger.info(f"Text truncated to {MAX_CHUNK_LENGTH} chars for TTS")

    try:
        headers = {
            "Content-Type": "application/json",
            "api-subscription-key": api_key,
        }
        payload = {
            "inputs": [text],
            "target_language_code": language,
            "speaker": speaker,
            "model": "bulbul:v3",
            "enable_preprocessing": True,
        }

        response = requests.post(SARVAM_API_URL, json=payload, headers=headers, timeout=30)

        if response.status_code != 200:
            logger.error(f"Sarvam TTS API error: {response.status_code} — {response.text[:200]}")
            return None

        data = response.json()
        audios = data.get("audios", [])
        if not audios:
            logger.error("Sarvam TTS returned empty audio list")
            return None

        return audios[0]  # base64-encoded audio

    except requests.Timeout:
        logger.error("Sarvam TTS request timed out")
        return None
    except Exception as e:
        logger.error(f"Sarvam TTS failed: {e}", exc_info=True)
        return None
