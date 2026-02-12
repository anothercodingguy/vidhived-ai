"""Voice (TTS) API routes."""

from flask import Blueprint, request, jsonify
import logging
from .voice_service import text_to_speech, get_sarvam_api_key

logger = logging.getLogger(__name__)

voice_bp = Blueprint('voice', __name__)

MAX_TTS_TEXT_LENGTH = 5000


@voice_bp.route('/tts', methods=['POST'])
def tts():
    """Convert text to speech using Sarvam AI."""
    # Check if voice is configured
    if not get_sarvam_api_key():
        return jsonify({
            "error": "Voice feature not configured",
            "code": "VOICE_NOT_CONFIGURED",
            "message": "Set SARVAM_API_KEY in environment to enable voice."
        }), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required", "code": "BAD_REQUEST"}), 400

    text = (data.get('text') or '').strip()
    language = data.get('language', 'en-IN')

    if not text:
        return jsonify({"error": "Text is required", "code": "MISSING_TEXT"}), 400

    if len(text) > MAX_TTS_TEXT_LENGTH:
        return jsonify({
            "error": f"Text too long (max {MAX_TTS_TEXT_LENGTH} characters)",
            "code": "TEXT_TOO_LONG"
        }), 400

    # Validate language
    supported_languages = ['en-IN', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN', 'od-IN']
    if language not in supported_languages:
        language = 'en-IN'

    audio_base64 = text_to_speech(text, language=language)

    if audio_base64 is None:
        return jsonify({
            "error": "Voice generation failed. Please try again.",
            "code": "TTS_FAILED"
        }), 500

    return jsonify({
        "audio": audio_base64,
        "format": "wav",
        "language": language,
    })


@voice_bp.route('/tts/status', methods=['GET'])
def tts_status():
    """Check if voice feature is available."""
    available = get_sarvam_api_key() is not None
    return jsonify({
        "available": available,
        "provider": "Sarvam AI (Bulbul v3)" if available else None,
    })
