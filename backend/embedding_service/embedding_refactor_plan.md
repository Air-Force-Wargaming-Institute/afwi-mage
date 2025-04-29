### Phase 8: Portion Marking & Filtering Implementation

#### Goal: Implement robust semantic block splitting (paragraphs, lists), store detected portion markings with chunks, and enable retrieval filtering based on these markings.

#### Backend - Core Logic (`core/`)

-   [x] **Design `SemanticBlockSplitter`:**
    -   [x] Define class structure inheriting from `langchain_text_splitters.TextSplitter`.
    -   [x] Document its expected behavior and parameters.
-   [x] **Implement Block Detection:** **(In Progress - Refinement Needed)**
    -   [x] Add logic to identify paragraph boundaries (e.g., double newlines).
    -   [x] Add logic to identify list item boundaries (e.g., bullet points, numbered lists).
    -   [ ] **Refine:** Improve logic to group related items (e.g., keep multi-line list items together, handle indentation variances). (Refinement suggested based on code review, not explicitly tested).
-   [x] **Implement Portion Marking Detection:**
    -   [x] Develop robust regex to detect portion markings (e.g., `(U)`, `(S//REL TO USA, FVEY)`, `(TS)`) at the start/end of blocks.
    -   [x] Integrate `core/metadata.py::normalize_security_classification` for detected markings.
    -   [x] Add logic to determine the *highest* classification if multiple are found.
-   [x] **Implement Chunk Creation & Metadata Assignment:** **(Mostly Done - Needs Verification on Fallback)**
    -   [x] Create chunks based on detected semantic blocks (paragraphs, list items).
    -   [x] **Refine:** Prioritize capturing *full* semantic blocks. Avoid splitting typical paragraphs/list items based on `max_block_size`. Implement a fallback splitting mechanism (e.g., using `RecursiveCharacterTextSplitter`) only if an identified semantic block is excessively large (e.g., > 5000 chars), ensuring metadata inheritance. (Fallback exists, but its metadata inheritance needs explicit testing).
    -   [x] Add detected/normalized marking to chunk metadata as `chunk_classification`.
    -   [x] **Defaulting:** If no marking is detected for a block, inherit and assign the document's overall `security_classification` to the `chunk_classification` field. (Tested and working).
    -   [x] Ensure all original document-level metadata (`document_id`, `original_filename`, etc.) is merged/preserved in each chunk's metadata. (Tested and working).
-   [x] **Integrate `SemanticBlockSplitter`:**
    -   [x] Replace `RecursiveCharacterTextSplitter` in `core/document.py::load_documents`.
    -   [x] Ensure document-level metadata is passed correctly for inheritance.
    -   [x] Remove old `get_text_splitter` function. (Assumed removed based on current code).
-   [x] **Implement Retrieval Filtering (`core/vectorstore.py::query_vector_store`):**
    -   [x] Add `allowed_classifications: Optional[List[str]]` parameter.
    -   [x] If provided, construct the appropriate filter dictionary/lambda for FAISS based on `chunk_classification`.
    -   [x] Pass the filter to `vectorstore.similarity_search_with_score` (or equivalent). (Verified working via tests).
-   [ ] **Testing (Core):** **(Partially Implemented)**
    -   [x] Create `tests/test_metadata_flow.py`.
    -   [ ] Add unit tests for `SemanticBlockSplitter` (refined block detection, size handling, marking detection). (Specific unit tests for the splitter itself are likely missing).
    -   [x] Add integration tests in `test_metadata_flow.py` covering the full metadata pipeline (inflow, storage, outflow, filtering). (Most are implemented and passing, except for mixed markings).

#### Backend - API Layer (`api/`)

-   [x] **Update API Models:**
    -   [x] Add `allowed_classifications: Optional[List[str]]` to `api/vectorstore.py::QueryRequest`.
    -   [x] Add `allowed_classifications: Optional[List[str]]` to `api/llm.py::VectorStoreLLMQueryRequest`.
-   [x] **Update API Endpoints:**
    -   [x] Modify `api/vectorstore.py::query_vectorstore` endpoint to accept and pass `allowed_classifications`.
    -   [x] Modify `api/llm.py::llm_query_vectorstore` endpoint to accept and pass `allowed_classifications`.
-   [ ] **Testing (API):** **(Needs Verification)**
    -   [~] Add API tests for `/vectorstores/{id}/query` verifying the `allowed_classifications` filter. (Test suite exists, but need to confirm specific coverage for this filter via API).
    -   [~] Add API tests for `/vectorstores/{id}/llm-query` verifying the `allowed_classifications` filter. (Test suite exists, but need to confirm specific coverage for this filter via API).

#### Frontend (`frontend/`)

-   [x] **Update Query Tester UI (`QueryTester.js`):**
    -   [x] Add UI controls (e.g., multi-select dropdown, checkboxes) for selecting allowed classification levels.
    -   [x] Map UI selection to an array of classification strings.
-   [x] **Update Service Layer (`vectorStoreService.js`):**
    -   [x] Modify `testVectorStoreQuery` function to accept and pass the `allowed_classifications` array.
    -   [x] Modify `llmQueryVectorStore` function to accept and pass the `allowed_classifications` array.
-   [ ] **Testing (Frontend):**
    -   [ ] Manually test the Query Tester UI.

By addressing the structural issues in the codebase, we'll not only fix the immediate metadata problems but also create a foundation for easier maintenance and extension in the future.
