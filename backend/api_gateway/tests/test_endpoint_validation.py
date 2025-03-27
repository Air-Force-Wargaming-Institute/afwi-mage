import requests
import pytest
import os
import json
from urllib.parse import urljoin

# Configuration
BASE_URL = os.environ.get("API_GATEWAY_URL", "http://localhost:80")
AUTH_ENABLED = os.environ.get("AUTH_ENABLED", "true").lower() == "true"
TEST_USERNAME = os.environ.get("TEST_USERNAME", "test@example.com")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "password123")

# Test JWT token storage
auth_token = None

def get_headers():
    """Get request headers including authentication if enabled"""
    headers = {
        "Content-Type": "application/json"
    }
    if AUTH_ENABLED and auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    return headers

def login():
    """Authenticate and get a token if auth is enabled"""
    global auth_token
    if not AUTH_ENABLED:
        print("Authentication disabled, skipping login")
        return

    login_url = urljoin(BASE_URL, "/api/users/login")
    login_data = {
        "email": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(
            login_url, 
            json=login_data, 
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        auth_token = response.json().get("access_token")
        print(f"Authenticated successfully as {TEST_USERNAME}")
    except Exception as e:
        pytest.fail(f"Authentication failed: {str(e)}")

class TestCoreService:
    """Tests for Core Service endpoints"""
    
    def setup_class(self):
        login()

    def test_health_check(self):
        """Test the health check endpoint"""
        url = urljoin(BASE_URL, "/")
        response = requests.get(url)
        assert response.status_code == 200, "Health check failed"
    
    def test_documents_endpoint(self):
        """Test the documents endpoint"""
        url = urljoin(BASE_URL, "/api/documents")
        response = requests.get(url, headers=get_headers())
        assert response.status_code in [200, 204], f"Documents endpoint failed with status {response.status_code}"

class TestChatService:
    """Tests for Chat Service endpoints"""
    
    def setup_class(self):
        login()
    
    def test_generate_session_id(self):
        """Test session generation endpoint"""
        url = urljoin(BASE_URL, "/chat/generate_session_id")
        response = requests.post(url, headers=get_headers(), json={})
        assert response.status_code == 200, "Generate session ID failed"
        assert "session_id" in response.json(), "No session_id in response"
    
    def test_list_sessions(self):
        """Test listing sessions endpoint"""
        url = urljoin(BASE_URL, "/sessions")
        response = requests.get(url, headers=get_headers())
        assert response.status_code == 200, "List sessions failed"

class TestAuthService:
    """Tests for Auth Service endpoints"""
    
    def test_health_check(self):
        """Test the auth health check endpoint"""
        url = urljoin(BASE_URL, "/api/health")
        response = requests.get(url)
        assert response.status_code == 200, "Auth health check failed"

class TestUploadService:
    """Tests for Upload Service endpoints"""
    
    def setup_class(self):
        login()
    
    def test_list_documents(self):
        """Test listing documents endpoint"""
        url = urljoin(BASE_URL, "/api/upload/documents")
        response = requests.get(url, headers=get_headers())
        assert response.status_code == 200, "List documents failed"

class TestAgentService:
    """Tests for Agent Service endpoints"""
    
    def setup_class(self):
        login()
    
    def test_list_teams(self):
        """Test listing agent teams endpoint"""
        url = urljoin(BASE_URL, "/api/agents/teams")
        response = requests.get(url, headers=get_headers())
        assert response.status_code == 200, "List agent teams failed"

class TestEmbeddingService:
    """Tests for Embedding Service endpoints"""
    
    def setup_class(self):
        login()
    
    def test_status(self):
        """Test embedding service status endpoint"""
        url = urljoin(BASE_URL, "/api/embedding/status")
        response = requests.get(url, headers=get_headers())
        assert response.status_code == 200, "Embedding status check failed"

class TestDirectChatService:
    """Tests for Direct Chat Service endpoints"""
    
    def setup_class(self):
        login()
    
    def test_health(self):
        """Test direct chat health endpoint"""
        url = urljoin(BASE_URL, "/api/v1/health")
        response = requests.get(url, headers=get_headers())
        assert response.status_code == 200, "Direct chat health check failed"
    
    def test_list_sessions(self):
        """Test listing chat sessions endpoint"""
        url = urljoin(BASE_URL, "/api/v1/chat/sessions")
        response = requests.get(url, headers=get_headers())
        assert response.status_code == 200, "List direct chat sessions failed"

if __name__ == "__main__":
    print(f"Running tests against {BASE_URL}")
    pytest.main(["-xvs", __file__]) 