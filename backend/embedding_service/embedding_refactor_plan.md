### Phase 8: Portion Marking & Filtering Implementation

#### Goal: Implement paragraph/block-level portion marking detection, store it with chunks, and enable retrieval filtering based on these markings.

#### Backend - Core Logic (`core/`)

-   [ ] **Design `SemanticBlockSplitter`:**
    -   [x] Define class structure inheriting from `langchain_text_splitters.TextSplitter`.
    -   [x] Document its expected behavior and parameters. (Basic docstrings added)
-   [ ] **Implement Block Detection:**
    -   [x] Add logic to identify paragraph boundaries (e.g., double newlines). (Placeholder added)
    -   [x] Add logic to identify list item boundaries (e.g., bullet points, numbered lists). (Placeholder added)
    -   [ ] Add logic to group related items (e.g., keep multi-line list items together).
-   [ ] **Implement Portion Marking Detection:**
    -   [x] Develop robust regex to detect portion markings (e.g., `(U)`, `(S//REL TO USA, FVEY)`, `(TS)`) at the start/end of blocks. (Placeholder added)
    -   [x] Integrate `core/metadata.py::normalize_security_classification` for detected markings. (Placeholder added)
    -   [x] Add logic to determine the *highest* classification if multiple are found.
-   [ ] **Implement Chunk Creation & Metadata Assignment:**
    -   [x] Create chunks based on detected semantic blocks. (Basic structure added)
    -   [ ] Handle blocks exceeding maximum chunk size (split with warning/error?).
    -   [x] Add detected/normalized marking to chunk metadata as `chunk_classification`. (Placeholder added)
    -   [x] **Defaulting:** If no marking is detected for a block, inherit and assign the document's overall `security_classification` to the `chunk_classification` field. (Initial logic added)
    -   [x] Ensure all original document-level metadata (`document_id`, `original_filename`, etc.) is merged/preserved in each chunk's metadata. (Initial logic added)
-   [x] **Integrate `SemanticBlockSplitter`:**
    -   [x] Replace `RecursiveCharacterTextSplitter` in `core/document.py::load_documents`.
    -   [x] Ensure document-level metadata is passed correctly for inheritance.
    -   [x] Remove old `get_text_splitter` function.
-   [x] **Implement Retrieval Filtering (`core/vectorstore.py::query_vector_store`):**
    -   [x] Add `allowed_classifications: Optional[List[str]]` parameter.
    -   [x] If provided, construct the appropriate filter dictionary for FAISS (e.g., `{"chunk_classification": {"$in": allowed_classifications}}`). Verify exact FAISS syntax in LangChain.
    -   [x] Pass the filter to `vectorstore.similarity_search_with_score` (or equivalent).
-   [ ] **Testing (Core):**
    -   [ ] Add unit tests for `SemanticBlockSplitter` with various edge cases (different markings, list types, large blocks).
    -   [ ] Add tests for `core/document.py::load_documents` to verify correct chunking and metadata assignment (`chunk_classification`).
    -   [ ] Add tests for `core/vectorstore.py::query_vector_store` to verify filtering works correctly.

#### Backend - API Layer (`api/`)

-   [x] **Update API Models:**
    -   [x] Add `allowed_classifications: Optional[List[str]]` to `api/vectorstore.py::QueryRequest`.
    -   [x] Add `allowed_classifications: Optional[List[str]]` to `api/llm.py::VectorStoreLLMQueryRequest`.
-   [x] **Update API Endpoints:**
    -   [x] Modify `api/vectorstore.py::query_vectorstore` endpoint to accept and pass `allowed_classifications`.
    -   [x] Modify `api/llm.py::llm_query_vectorstore` endpoint to accept and pass `allowed_classifications`.
-   [ ] **Testing (API):**
    -   [ ] Add API tests for `/vectorstores/{id}/query` verifying the `allowed_classifications` filter.
    -   [ ] Add API tests for `/vectorstores/{id}/llm-query` verifying the `allowed_classifications` filter.

#### Frontend (`frontend/`)

-   [ ] **Update Query Tester UI (`QueryTester.js`):**
    -   [ ] Add UI controls (e.g., multi-select dropdown, checkboxes) for selecting allowed classification levels.
    -   [ ] Map UI selection to an array of classification strings.
-   [ ] **Update Service Layer (`vectorStoreService.js`):**
    -   [ ] Modify `testVectorStoreQuery` function to accept and pass the `allowed_classifications` array.
    -   [ ] Modify `llmQueryVectorStore` function to accept and pass the `allowed_classifications` array.
-   [ ] **Testing (Frontend):**
    -   [ ] Manually test the Query Tester UI:
        -   [ ] Verify selecting different classification levels filters results correctly.
        -   [ ] Verify results only show chunks with allowed `chunk_classification`.
        -   [ ] Verify the UI correctly reflects the applied filter.
        -   [ ] Test edge cases (no filter, selecting all, selecting specific levels).

By addressing the structural issues in the codebase, we'll not only fix the immediate metadata problems but also create a foundation for easier maintenance and extension in the future.
