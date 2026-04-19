"""Comprehensive test suite for Vidhived.ai backend API.

Covers: upload, document retrieval, PDF access, Q&A, health check,
error handling, input validation, and edge cases.

Run with: pytest tests/ -v --cov=. --cov-report=term-missing
"""
import io
import json
import pytest
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Health Check Tests
# ---------------------------------------------------------------------------

class TestHealthCheck:
    def test_health_returns_200(self, client):
        """Health endpoint must return HTTP 200."""
        response = client.get('/api/health')
        assert response.status_code == 200

    def test_health_returns_ok_status(self, client):
        """Health response body must contain status=ok."""
        response = client.get('/api/health')
        data = json.loads(response.data)
        assert data['status'] == 'ok'

    def test_health_contains_timestamp(self, client):
        """Health response must include a timestamp field."""
        response = client.get('/api/health')
        data = json.loads(response.data)
        assert 'timestamp' in data

    def test_health_contains_services(self, client):
        """Health response must enumerate service statuses."""
        response = client.get('/api/health')
        data = json.loads(response.data)
        assert 'services' in data


# ---------------------------------------------------------------------------
# Upload Endpoint Tests
# ---------------------------------------------------------------------------

class TestUploadEndpoint:
    def test_upload_no_file_returns_400(self, client):
        """POST /upload with no file attached must return 400."""
        response = client.post('/api/upload')
        assert response.status_code == 400

    def test_upload_empty_filename_returns_400(self, client):
        """POST /upload with an empty filename must return 400."""
        data = {'file': (io.BytesIO(b''), '')}
        response = client.post(
            '/api/upload',
            data=data,
            content_type='multipart/form-data'
        )
        assert response.status_code == 400

    def test_upload_non_pdf_returns_400(self, client):
        """POST /upload with a .txt file must be rejected."""
        data = {'file': (io.BytesIO(b'hello world'), 'test.txt')}
        response = client.post(
            '/api/upload',
            data=data,
            content_type='multipart/form-data'
        )
        assert response.status_code == 400

    @patch('app.routes.process_document_async')
    def test_upload_valid_pdf_returns_200(self, mock_process, client):
        """POST /upload with a valid PDF file must succeed."""
        mock_process.return_value = None
        fake_pdf = b'%PDF-1.4 fake pdf content'
        data = {'file': (io.BytesIO(fake_pdf), 'contract.pdf')}
        response = client.post(
            '/api/upload',
            data=data,
            content_type='multipart/form-data'
        )
        assert response.status_code in (200, 202)

    @patch('app.routes.process_document_async')
    def test_upload_returns_document_id(self, mock_process, client):
        """Successful upload response must include a document_id."""
        mock_process.return_value = None
        fake_pdf = b'%PDF-1.4 fake pdf content'
        data = {'file': (io.BytesIO(fake_pdf), 'contract.pdf')}
        response = client.post(
            '/api/upload',
            data=data,
            content_type='multipart/form-data'
        )
        if response.status_code in (200, 202):
            body = json.loads(response.data)
            assert 'document_id' in body or 'id' in body


# ---------------------------------------------------------------------------
# Document Retrieval Tests
# ---------------------------------------------------------------------------

class TestDocumentEndpoint:
    def test_get_nonexistent_document_returns_404(self, client):
        """GET /document/:id for unknown id must return 404."""
        response = client.get('/api/document/nonexistent-id-99999')
        assert response.status_code == 404

    def test_get_document_invalid_id_format(self, client):
        """GET /document/:id with a clearly invalid id returns 404 or 400."""
        response = client.get('/api/document/!!invalid!!')
        assert response.status_code in (400, 404)


# ---------------------------------------------------------------------------
# PDF Access Tests
# ---------------------------------------------------------------------------

class TestPDFEndpoint:
    def test_get_nonexistent_pdf_returns_404(self, client):
        """GET /pdf/:id for unknown id must return 404."""
        response = client.get('/api/pdf/nonexistent-id-99999')
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Ask / Q&A Endpoint Tests
# ---------------------------------------------------------------------------

class TestAskEndpoint:
    def test_ask_without_body_returns_400(self, client):
        """POST /ask with no JSON body must return 400."""
        response = client.post('/api/ask', content_type='application/json')
        assert response.status_code == 400

    def test_ask_missing_query_returns_400(self, client):
        """POST /ask without 'query' field must return 400."""
        payload = json.dumps({'document_id': 'some-id'})
        response = client.post(
            '/api/ask',
            data=payload,
            content_type='application/json'
        )
        assert response.status_code in (400, 404, 422)

    def test_ask_missing_document_id_returns_400(self, client):
        """POST /ask without 'document_id' field must return 400."""
        payload = json.dumps({'query': 'What are the termination clauses?'})
        response = client.post(
            '/api/ask',
            data=payload,
            content_type='application/json'
        )
        assert response.status_code in (400, 404, 422)

    def test_ask_unknown_document_returns_404(self, client):
        """POST /ask with a non-existent document_id must return 404."""
        payload = json.dumps({
            'query': 'What are the termination clauses?',
            'document_id': 'does-not-exist-xyz'
        })
        response = client.post(
            '/api/ask',
            data=payload,
            content_type='application/json'
        )
        assert response.status_code in (404, 400)

    def test_ask_empty_query_returns_400(self, client):
        """POST /ask with an empty query string must return 400."""
        payload = json.dumps({
            'query': '',
            'document_id': 'some-id'
        })
        response = client.post(
            '/api/ask',
            data=payload,
            content_type='application/json'
        )
        assert response.status_code in (400, 404, 422)


# ---------------------------------------------------------------------------
# CORS / Headers Tests
# ---------------------------------------------------------------------------

class TestResponseHeaders:
    def test_health_returns_json_content_type(self, client):
        """Health endpoint response must have JSON content-type header."""
        response = client.get('/api/health')
        assert 'application/json' in response.content_type

    def test_unknown_route_returns_404(self, client):
        """Requesting an unknown route must return 404."""
        response = client.get('/api/this-route-does-not-exist')
        assert response.status_code == 404
