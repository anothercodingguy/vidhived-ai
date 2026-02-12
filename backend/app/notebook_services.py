"""Notebook AI Q&A service with lightweight retrieval."""

import re
import math
import logging
from collections import Counter
from typing import List, Dict, Tuple, Optional
from .services import get_groq_client, call_groq_api

logger = logging.getLogger(__name__)

# ── Text Chunking ────────────────────────────────────────────────────

CHUNK_SIZE = 1500
CHUNK_OVERLAP = 200


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks for retrieval."""
    if not text or len(text) <= chunk_size:
        return [text] if text else []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]

        # Try to break at sentence boundary
        if end < len(text):
            last_period = chunk.rfind('. ')
            last_newline = chunk.rfind('\n')
            break_point = max(last_period, last_newline)
            if break_point > chunk_size * 0.5:
                chunk = chunk[:break_point + 1]
                end = start + break_point + 1

        chunks.append(chunk.strip())
        start = end - overlap

    return [c for c in chunks if c]


# ── TF-IDF Scoring ───────────────────────────────────────────────────

def tokenize(text: str) -> List[str]:
    """Simple word tokenization."""
    return re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())


def compute_tf(tokens: List[str]) -> Dict[str, float]:
    """Term frequency for a token list."""
    counts = Counter(tokens)
    total = len(tokens) if tokens else 1
    return {t: c / total for t, c in counts.items()}


def compute_idf(documents_tokens: List[List[str]]) -> Dict[str, float]:
    """Inverse document frequency across all chunks."""
    n = len(documents_tokens)
    if n == 0:
        return {}
    df = Counter()
    for doc_tokens in documents_tokens:
        unique = set(doc_tokens)
        for t in unique:
            df[t] += 1
    return {t: math.log((n + 1) / (count + 1)) + 1 for t, count in df.items()}


def score_chunk(query_tokens: List[str], chunk_tokens: List[str], idf: Dict[str, float]) -> float:
    """Score a chunk based on TF-IDF similarity with query."""
    if not query_tokens or not chunk_tokens:
        return 0.0

    chunk_tf = compute_tf(chunk_tokens)
    score = 0.0
    for token in query_tokens:
        if token in chunk_tf:
            score += chunk_tf[token] * idf.get(token, 1.0)
    return score


# ── Retrieval ────────────────────────────────────────────────────────

def retrieve_relevant_chunks(
    query: str,
    notes: List[Dict],
    max_context_chars: int = 8000,
    top_k: int = 10,
) -> List[Dict]:
    """
    Given a query and a list of notes (each with 'id', 'title', 'content'),
    return the most relevant text chunks with metadata.
    """
    # Build chunks with source metadata
    all_chunks = []
    for note in notes:
        content = note.get('content', '')
        if not content:
            continue
        chunks = chunk_text(content)
        for chunk in chunks:
            all_chunks.append({
                'text': chunk,
                'note_id': note['id'],
                'note_title': note['title'],
            })

    if not all_chunks:
        return []

    # Tokenize
    query_tokens = tokenize(query)
    chunks_tokens = [tokenize(c['text']) for c in all_chunks]

    # Compute IDF
    idf = compute_idf(chunks_tokens)

    # Score each chunk
    scored = []
    for i, chunk in enumerate(all_chunks):
        s = score_chunk(query_tokens, chunks_tokens[i], idf)
        scored.append((s, chunk))

    # Sort by score descending
    scored.sort(key=lambda x: x[0], reverse=True)

    # Select top-K that fit within context budget
    selected = []
    total_chars = 0
    for s, chunk in scored[:top_k]:
        if s <= 0:
            break
        if total_chars + len(chunk['text']) > max_context_chars:
            break
        selected.append(chunk)
        total_chars += len(chunk['text'])

    return selected


# ── Q&A ──────────────────────────────────────────────────────────────

def ask_notebook(notebook_id: str, query: str, notes: List[Dict]) -> Dict:
    """
    Answer a question using content from notebook notes.
    Returns dict with 'answer', 'sources', and 'hasAI'.
    """
    client = get_groq_client()
    if not client:
        return {
            'answer': 'AI service is not configured. Please set GROQ_API_KEY.',
            'sources': [],
            'hasAI': False,
        }

    # Retrieve relevant chunks
    relevant = retrieve_relevant_chunks(query, notes)

    if not relevant:
        return {
            'answer': "I couldn't find relevant content in your notes to answer this question. Try adding more notes or rephrasing your question.",
            'sources': [],
            'hasAI': True,
        }

    # Build context with source attribution
    context_parts = []
    source_notes = {}
    for chunk in relevant:
        note_id = chunk['note_id']
        note_title = chunk['note_title']
        source_notes[note_id] = note_title
        context_parts.append(f"[From: {note_title}]\n{chunk['text']}")

    context = "\n\n---\n\n".join(context_parts)

    prompt = (
        "You are an intelligent assistant. Answer the user's question based ONLY on the provided notes content.\n"
        "If the answer cannot be found in the notes, say so clearly.\n"
        "When possible, mention which note(s) the information comes from using the note titles provided.\n"
        "Be concise and direct.\n\n"
        f"Notes content:\n{context}\n\n"
        f"User question: {query}"
    )

    try:
        completion = call_groq_api(
            client,
            messages=[{"role": "user", "content": prompt}],
        )
        sources = [{'id': nid, 'title': ntitle} for nid, ntitle in source_notes.items()]
        return {
            'answer': completion.choices[0].message.content,
            'sources': sources,
            'hasAI': True,
        }
    except Exception as e:
        logger.error(f"Notebook Q&A failed: {e}", exc_info=True)
        return {
            'answer': 'Failed to generate answer. Please try again.',
            'sources': [],
            'hasAI': False,
        }
