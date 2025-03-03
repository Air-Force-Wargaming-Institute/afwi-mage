# Embedding Service Tests

This directory contains focused test modules for the embedding service. The tests are designed to verify that the critical metadata handling functionality works correctly throughout the pipeline, which was the core issue in the refactoring.

## Focus on Critical Functionality

Our tests concentrate on the most important aspects of the embedding service:

1. **Metadata Preservation**: Ensuring that document metadata (especially original filenames and security classifications) is preserved throughout the entire pipeline
2. **Core Vector Store Operations**: Verifying that vector store creation, updating, and querying functions correctly maintain metadata
3. **API Functionality**: Testing essential API endpoints that are critical for the system's operation

## Setup

Before running the tests, make sure to install the required test dependencies:

```bash
pip install pytest pytest-cov
```

## Running Tests

You can run the full test suite from the embedding_service directory:

```bash
cd afwi-multi-agent-generative-engine/backend/embedding_service
pytest tests/
```

### Running Specific Test Modules

To run tests from a specific module:

```bash
# Run metadata core tests
pytest tests/test_metadata_core.py

# Run integration tests for metadata handling
pytest tests/integration_test_metadata.py

# Run essential API tests
pytest tests/test_essential_api.py
```

### Running with Coverage

To run tests with coverage reporting:

```bash
pytest --cov=. tests/
```

For a detailed HTML coverage report:

```bash
pytest --cov=. --cov-report=html tests/
```

## Test Structure

The test suite is organized into focused modules:

### 1. Core Metadata Processing (`test_metadata_core.py`)

Tests the fundamental metadata handling functions:
- Security classification normalization
- Metadata validation
- File metadata creation
- Security information extraction from files

### 2. Essential API Endpoints (`test_essential_api.py`)

Tests the critical API endpoints needed to ensure proper functionality:
- File upload with metadata preservation
- Vector store creation with proper metadata handling
- Vector store querying with metadata in results
- Vector store updating with metadata preservation

### 3. Integration Tests for Metadata (`integration_test_metadata.py`)

End-to-end tests that verify metadata preservation throughout the entire pipeline:
- Metadata extraction from files
- Document processing with metadata preservation
- Vector store creation and querying with metadata integrity
- Complete end-to-end flow from file upload to query results

## Testing Approach

Our testing approach focuses on:

1. **Targeted Testing**: We test only what's necessary to verify core functionality works
2. **Metadata Integrity**: We ensure the key metadata fields (filenames, security classifications) are preserved
3. **Critical Paths**: We focus on the most important user paths through the system

## Metadata Preservation Tests

We have implemented tests to ensure metadata preservation throughout the embedding pipeline, from document processing to vector store creation and querying. These tests verify that critical metadata fields, such as `security_classification` and `original_filename`, are preserved and correctly returned in query results.

### Stand-alone Test Script

A dedicated test script `test_metadata_handling.py` in the root directory tests the entire pipeline:

1. Creates test documents with specific metadata
2. Processes the documents through the document handling pipeline
3. Creates a vector store with the processed documents
4. Queries the vector store and verifies that metadata is correctly returned

To run the test:

```bash
python test_metadata_handling.py
```

Or use the convenience script:

```bash
./run_metadata_test.sh
```

### What's Tested

- Metadata preservation during document processing
- Metadata storage in vector store creation
- Metadata enrichment during vector store querying 
- Full metadata retrieval in query results
- Security classification preservation through the entire pipeline

### Implementation Notes

- The query processing in `core/vectorstore.py` has been enhanced to ensure complete metadata is returned with query results
- A metadata enrichment step loads the full metadata from the vector store's metadata file and merges it with query results
- Default values are provided for missing metadata fields to ensure consistent output
- API endpoints in `api/vectorstore.py` and `api/llm.py` forward the complete metadata to the frontend

## Next Steps

After ensuring the core metadata functionality is working correctly, consider:

1. **Expanding Test Coverage**: Add tests for edge cases and error handling
2. **Performance Testing**: Add tests to verify the system handles large datasets efficiently
3. **Security Testing**: Add tests to verify security classification handling in all scenarios

Remember that these focused tests serve as a foundation for verifying the critical functionality. Additional tests can be added as needed to improve coverage and confidence in the system. 