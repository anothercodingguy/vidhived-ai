import json

def test_health_endpoint(client):
    """Test the /api/health endpoint correctly returns a 200 OK and config status."""
    response = client.get('/api/health')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['status'] == 'ok'
    assert 'timestamp' in data
    assert 'services' in data
