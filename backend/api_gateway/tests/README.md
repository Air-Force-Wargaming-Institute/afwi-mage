# API Gateway Tests

This directory contains tests for validating the API Gateway configuration and routing rules.

## Test Categories

- **Endpoint Validation Tests**: Verify that all service endpoints are correctly routed through the gateway
- **Authentication Tests**: Validate JWT authentication and authorization
- **Performance Tests**: Load testing for the gateway

## Running the Tests

### Prerequisites

- Python 3.8+
- `pytest` and `requests` packages
- Running API Gateway service
- Test user account in the auth service

### Installation

```bash
# Create a virtual environment (optional)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install pytest requests
```

### Running Endpoint Validation Tests

```bash
# Run with default settings (localhost)
python test_endpoint_validation.py

# Or run with pytest directly
pytest test_endpoint_validation.py -v
```

### Environment Variables

The test suite uses these environment variables:

- `API_GATEWAY_URL`: Base URL of the API Gateway (default: `http://localhost:80`)
- `AUTH_ENABLED`: Whether authentication is enabled (default: `true`)
- `TEST_USERNAME`: Test user email for authentication (default: `test@example.com`)
- `TEST_PASSWORD`: Test user password (default: `password123`)

Example:

```bash
# Run tests against a specific gateway URL with auth disabled
export API_GATEWAY_URL=http://gateway.example.com
export AUTH_ENABLED=false
python test_endpoint_validation.py
```

### Test Output

Example output from a successful test run:

```
============================= test session starts =============================
Running tests against http://localhost:80
Authentication disabled, skipping login
PASSED test_endpoint_validation.py::TestCoreService::test_health_check
PASSED test_endpoint_validation.py::TestCoreService::test_documents_endpoint
PASSED test_endpoint_validation.py::TestChatService::test_generate_session_id
PASSED test_endpoint_validation.py::TestChatService::test_list_sessions
PASSED test_endpoint_validation.py::TestAuthService::test_health_check
...
```

## Adding New Tests

To add tests for a new service or endpoint:

1. Create a new test class in `test_endpoint_validation.py`
2. Implement test methods for each endpoint you want to validate
3. Make sure to handle authentication if required

Example:

```python
class TestNewService:
    """Tests for New Service endpoints"""
    
    def setup_class(self):
        login()
    
    def test_new_endpoint(self):
        """Test new endpoint"""
        url = urljoin(BASE_URL, "/api/new-service/endpoint")
        response = requests.get(url, headers=get_headers())
        assert response.status_code == 200, "New endpoint failed"
```

## Troubleshooting

- **Authentication Failures**: Verify the test user exists and has correct permissions
- **Connection Errors**: Ensure the API Gateway is running and accessible
- **Timeout Errors**: Check if services behind the gateway are responding

## CI/CD Integration

These tests can be integrated into CI/CD pipelines to verify gateway configuration:

```yaml
# Example GitHub Actions step
- name: Run API Gateway Tests
  run: |
    cd backend/api_gateway/tests
    pip install pytest requests
    pytest test_endpoint_validation.py -v
  env:
    API_GATEWAY_URL: http://localhost:80
    AUTH_ENABLED: false
``` 