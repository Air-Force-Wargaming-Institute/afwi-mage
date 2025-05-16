import pytest
import os
import json
from fastapi.testclient import TestClient
from pathlib import Path

# Use absolute import path from the backend/ directory
# Assumes pytest is run from the backend/ directory
from wargame_service.app import app
from wargame_service.config import STORAGE_DIR
from wargame_service.schemas import WargameBuild

# Create a TestClient instance
client = TestClient(app)

# Define a pytest fixture for cleanup
@pytest.fixture(scope="function")
def cleanup_wargame_file(request):
    created_ids = []
    def add_id(wargame_id):
        created_ids.append(wargame_id)

    yield add_id # Provide the function to add IDs to the test

    # Cleanup: Executed after the test function finishes
    for wargame_id in created_ids:
        file_path = STORAGE_DIR / f"{wargame_id}.json"
        if file_path.exists():
            try:
                os.remove(file_path)
                print(f"\nCleaned up test file: {file_path}")
            except OSError as e:
                print(f"\nError cleaning up file {file_path}: {e}")

# --- Test Cases --- 

def test_create_wargame_success(cleanup_wargame_file):
    """Tests successful creation of a new wargame build."""
    test_payload = {
        "name": "Test Wargame Alpha",
        "description": "A test description for Alpha."
    }

    response = client.post("/api/v1/wargames", json=test_payload)

    # 1. Check Status Code
    assert response.status_code == 201 # HTTP 201 Created

    # 2. Check Response Body Structure and Content
    response_data = response.json()
    assert "id" in response_data
    assert isinstance(response_data["id"], str)
    assert response_data["name"] == test_payload["name"]
    assert response_data["description"] == test_payload["description"]
    assert "createdAt" in response_data
    assert isinstance(response_data["createdAt"], str)
    assert "modifiedAt" in response_data
    assert isinstance(response_data["modifiedAt"], str)
    # Check for default empty/null fields from the schema
    assert response_data["researchObjectives"] == []
    assert response_data["numberOfIterations"] == 5
    assert response_data["activatedEntities"] == []
    assert response_data["customEntities"] == []
    assert response_data["nationRelationships"] == {}
    assert response_data["conflictTheaters"] == []

    # Add the created ID to the cleanup fixture
    created_id = response_data["id"]
    cleanup_wargame_file(created_id)

    # 3. Check File System Side Effect
    expected_file_path = STORAGE_DIR / f"{created_id}.json"
    assert expected_file_path.exists()
    assert expected_file_path.is_file()

    # 4. Verify File Content (optional but recommended)
    with open(expected_file_path, 'r') as f:
        saved_data = json.load(f)
        # Validate saved data against the schema
        validated_data = WargameBuild(**saved_data)
        assert validated_data.id == created_id
        assert validated_data.name == test_payload["name"]
        assert validated_data.description == test_payload["description"]
        assert validated_data.createdAt == response_data["createdAt"]
        # Check some defaults again
        assert validated_data.numberOfIterations == 5
        assert len(validated_data.activatedEntities) == 0

def test_create_wargame_missing_name():
    """Tests creating a wargame without the required 'name' field."""
    test_payload = {
        "description": "Test description only."
    }

    response = client.post("/api/v1/wargames", json=test_payload)

    # Expecting a 422 Unprocessable Entity error from Pydantic validation
    assert response.status_code == 422
    response_data = response.json()
    print(f"\nDEBUG: Received validation error detail: {response_data.get('detail')}\n")
    assert "detail" in response_data
    # Check that the detail mentions the missing 'name' field by checking the 'type'
    assert any((
        ('name' in err["loc"] or ('body', 'name') == tuple(err["loc"])) # Ensure loc matches
        and err.get("type") == "missing" # Check the error type directly
        ) for err in response_data["detail"])

def test_create_wargame_empty_payload():
    """Tests creating a wargame with an empty payload."""
    response = client.post("/api/v1/wargames", json={})

    # Expecting a 422 Unprocessable Entity error
    assert response.status_code == 422
    response_data = response.json()
    assert "detail" in response_data
    # Check for missing name error in the empty payload case as well
    assert any((
        ('name' in err["loc"] or ('body', 'name') == tuple(err["loc"])) # Ensure loc matches
        and err.get("type") == "missing" # Check the error type directly
        ) for err in response_data["detail"])

# Add more tests later for other endpoints (GET, PUT, DELETE) 