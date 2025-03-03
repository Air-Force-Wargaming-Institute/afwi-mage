# Manual Testing Plan for Embedding Service

This document outlines the steps for manually testing the embedding service, with a particular focus on verifying that metadata (especially filenames and security classifications) is properly preserved throughout the pipeline.

## Setup

1. Ensure the embedding service is running:
   ```bash
   cd afwi-multi-agent-generative-engine/backend/embedding_service
   python main.py
   ```

2. Prepare test documents:
   - Create a text file with classification markers (e.g., "SECRET")
   - Create a PDF document with classification markers
   - Create a document with no explicit classification

## Test Cases

### 1. File Upload and Metadata Creation

**Objective:** Verify that file uploads correctly create metadata files with preserved original filenames and security classifications.

#### Steps:
1. Upload a text file with explicit classification:
   ```bash
   curl -X POST http://localhost:8002/api/embedding/files/upload \
     -F "file=@/path/to/classified_document.txt" \
     -F "security_classification=SECRET"
   ```

2. Upload a PDF document with embedded classification:
   ```bash
   curl -X POST http://localhost:8002/api/embedding/files/upload \
     -F "file=@/path/to/classified_document.pdf"
   ```

3. Check the uploads directory for the metadata files:
   ```bash
   ls -la /data/uploads
   ```

4. Examine the metadata files to verify:
   - Original filename is preserved
   - Security classification is correctly set
   - Other metadata fields are present

### 2. Vector Store Creation

**Objective:** Verify that vector store creation preserves metadata from uploaded files.

#### Steps:
1. Create a vector store using the uploaded files:
   ```bash
   curl -X POST http://localhost:8002/api/embedding/vectorstores \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Metadata Test Store",
       "description": "Testing metadata preservation",
       "files": ["FILE_ID_1", "FILE_ID_2"],
       "embedding_model": "nomic-embed-text",
       "batch_processing": false
     }'
   ```

2. Check the response for successful creation and note the vector store ID.

3. Get detailed information about the vector store:
   ```bash
   curl -X GET http://localhost:8002/api/embedding/vectorstores/VECTOR_STORE_ID
   ```

4. Verify in the response:
   - Files are correctly associated with the vector store
   - Each file's metadata includes the original filename
   - Each file's metadata includes the correct security classification

### 3. Vector Store Querying

**Objective:** Verify that query results include the correct metadata.

#### Steps:
1. Query the vector store:
   ```bash
   curl -X POST http://localhost:8002/api/embedding/vectorstores/VECTOR_STORE_ID/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "sensitive information",
       "top_k": 5
     }'
   ```

2. Examine the results to verify:
   - Each result includes document metadata
   - Original filenames are shown (not UUIDs)
   - Security classifications are correctly included
   - Document IDs are consistent

### 4. Vector Store Updates

**Objective:** Verify that updating a vector store preserves metadata for both existing and new documents.

#### Steps:
1. Upload a new document:
   ```bash
   curl -X POST http://localhost:8002/api/embedding/files/upload \
     -F "file=@/path/to/new_document.txt" \
     -F "security_classification=CONFIDENTIAL"
   ```

2. Update the existing vector store with the new document:
   ```bash
   curl -X POST http://localhost:8002/api/embedding/vectorstores/VECTOR_STORE_ID/update \
     -H "Content-Type: application/json" \
     -d '{
       "files": ["NEW_FILE_ID"],
       "batch_processing": false
     }'
   ```

3. Get the updated vector store information:
   ```bash
   curl -X GET http://localhost:8002/api/embedding/vectorstores/VECTOR_STORE_ID
   ```

4. Verify:
   - The new document is added to the vector store
   - The new document's metadata includes the original filename
   - The new document's metadata includes the correct security classification
   - Existing documents' metadata is unchanged

### 5. Batch Updates

**Objective:** Verify that batch updates correctly handle metadata for multiple documents.

#### Steps:
1. Upload multiple new documents with different classifications

2. Perform a batch update:
   ```bash
   curl -X POST http://localhost:8002/api/embedding/vectorstores/VECTOR_STORE_ID/batch_update \
     -H "Content-Type: application/json" \
     -d '{
       "add": ["FILE_ID_3", "FILE_ID_4"],
       "remove": ["OLD_DOC_ID"],
       "batch_processing": false
     }'
   ```

3. Verify:
   - New documents are added with correct metadata
   - Removed documents are no longer in the vector store

### 6. Error Handling

**Objective:** Verify that error cases are handled properly.

#### Steps:
1. Try to upload an unsupported file type
2. Try to create a vector store with non-existent file IDs
3. Try to query a non-existent vector store

For each case, verify appropriate error messages are returned.

## Testing Metadata Preservation

The recent enhancements to the metadata handling system should ensure that important metadata like `security_classification` and `original_filename` are preserved throughout the entire pipeline and correctly displayed in the frontend. Follow these steps to manually verify this functionality:

### Test Case: Metadata Preservation in Query Results

1. **Preparation**:
   - Ensure the backend service is running with `./run_app.sh`
   - Ensure the frontend is running and connected to the backend

2. **Test Steps**:
   - Upload a document with a security classification (you can add this in the upload form)
   - Create a vector store with the uploaded document
   - Navigate to the Query Interface in the frontend
   - Run a query that will return results from your document
   - Verify that the security classification is correctly displayed in the results
   - Verify that the original filename is correctly displayed

3. **Expected Results**:
   - The query results should show the correct security classification
   - The original filename should be displayed as expected
   - All metadata should be consistent with what was provided during upload

4. **Additional Verification**:
   - Use the Analysis feature to analyze the vector store
   - Verify that the analysis results include correct references to security classifications
   - Check that any context provided to the LLM includes the proper security markings

### Test Case: Metadata Preservation with Multiple Security Levels

1. **Preparation**:
   - Create multiple files with different security classifications
   - Upload these files and create a vector store containing all of them

2. **Test Steps**:
   - Run various queries that should return results across different security levels
   - Use the Analysis feature to get an overview of the vector store content

3. **Expected Results**:
   - Each result should display its appropriate security classification
   - Results from different documents should show their respective classifications
   - The Analysis should reflect the mix of security levels in the vector store

### Troubleshooting

If metadata is not displaying correctly:

1. Check the browser developer console for any client-side errors
2. Inspect the network requests to see what data is being returned from the API
3. Check the backend logs for any errors in metadata processing or querying
4. Verify that the `metadata.json` file exists for the vector store and contains the expected data
5. Use the standalone test script to verify metadata preservation at the backend level:
   ```bash
   python test_metadata_handling.py
   ```

## Expected Results

For all test cases, the critical requirement is that **metadata, especially original filenames and security classifications, is preserved throughout the entire pipeline from file upload to query results**.

### Success Criteria:

1. **Original filenames** are displayed in:
   - Vector store file listings
   - Query results
   - Detailed document information

2. **Security classifications** are correctly:
   - Extracted from documents when possible
   - Applied from user input
   - Normalized to standard formats
   - Preserved in all metadata operations
   - Displayed in query results

3. **No UUID filenames** should be visible to users in:
   - API responses
   - Query results
   - Vector store information

## Troubleshooting

If metadata is not being preserved correctly:

1. Enable debug logging:
   ```bash
   LOG_LEVEL=DEBUG python main.py
   ```

2. Check the log output for:
   - Metadata extraction steps
   - Document loading stages
   - Vector store operations

3. Examine the raw metadata files in the uploads directory

4. Check the vector store metadata files in the vector_stores directory 