### Phase 8: Portion Marking & Filtering Implementation

#### Goal: Implement robust semantic block splitting (paragraphs, lists), store detected portion markings with chunks accurately reflecting document/chunk classifications, and enable retrieval filtering based on these markings. **Address critical security concerns by avoiding incorrect defaulting to UNCLASSIFIED.**

#### Backend - Core Logic (`core/`)

-   [x] **Design `SemanticBlockSplitter`:**
    -   [x] Define class structure inheriting from `langchain_text_splitters.TextSplitter`.
    -   [x] Document its expected behavior and parameters.
-   [x] **Implement Block Detection:** **(In Progress - Refinement Needed)**
    -   [x] Add logic to identify paragraph boundaries (e.g., double newlines).
    -   [x] Add logic to identify list item boundaries (e.g., bullet points, numbered lists).
    -   [ ] **Refine:** Improve logic to group related items (e.g., keep multi-line list items together, handle indentation variances). (Refinement suggested based on code review, not explicitly tested).
-   [ ] **Implement Portion Marking Detection:** **(NEEDS FIX)**
    -   [x] Develop robust regex to detect portion markings (e.g., `(U)`, `(S//REL TO USA, FVEY)`, `(TS)`) at the start/end of blocks.
    -   [ ] **FIX:** Current regex only checks start/end (~70 chars). **Expand detection to scan the *entire* block content** for the highest classification marking present anywhere within it.
    -   [x] Integrate `core/metadata.py::normalize_security_classification` for detected markings.
    -   [x] Add logic to determine the *highest* classification if multiple are found within a block.
-   [ ] **Implement Chunk Creation & Metadata Assignment:** **(NEEDS REFINEMENT & VERIFICATION)**
    -   [x] Create chunks based on detected semantic blocks (paragraphs, list items).
    -   [x] **Refine:** Prioritize capturing *full* semantic blocks. Avoid splitting typical paragraphs/list items based on `max_block_size`. Implement a fallback splitting mechanism (e.g., using `RecursiveCharacterTextSplitter`) only if an identified semantic block is excessively large (e.g., > 5000 chars), ensuring metadata inheritance. (Fallback exists, but its metadata inheritance needs explicit testing).
    -   [ ] **FIX & VERIFY:** Add detected/normalized marking to chunk metadata as `chunk_classification`.
    -   [ ] **Implement Strict Defaulting:** If no marking is detected for a block, the `chunk_classification` **MUST** default to the parent document's `security_classification`. **It MUST NOT default to "UNCLASSIFIED" unless the parent document is itself UNCLASSIFIED.** Add logging for when this default is applied.
    -   [x] Ensure all original document-level metadata (`document_id`, `original_filename`, etc.) is merged/preserved in each chunk's metadata. (Tested and working).
-   [x] **Integrate `SemanticBlockSplitter`:**
    -   [x] Replace `RecursiveCharacterTextSplitter` in `core/document.py::load_documents`.
    -   [x] Ensure document-level metadata is passed correctly for inheritance.
    -   [x] Remove old `get_text_splitter` function. (Assumed removed based on current code).
-   [x] **Implement Retrieval Filtering (`core/vectorstore.py::query_vector_store`):**
    -   [x] Add `allowed_classifications: Optional[List[str]]` parameter.
    -   [x] If provided, construct the appropriate filter dictionary/lambda for FAISS based on `chunk_classification`.
    -   [x] Pass the filter to `vectorstore.similarity_search_with_score` (or equivalent). (Verified working via tests).
    -   [ ] **VERIFY:** Ensure the `chunk_classification` used for filtering accurately reflects the value stored in FAISS metadata *before* any post-retrieval enrichment.
-   [ ] **Testing (Core):** **(Partially Implemented, Needs Expansion)**
    -   [x] Create `tests/test_metadata_flow.py`.
    -   [ ] Add unit tests for `SemanticBlockSplitter`:
        -   [ ] Test refined block detection (multi-line lists, etc.).
        -   [ ] Test portion marking detection *anywhere* within the block.
        -   [ ] Test identification of the *highest* marking if multiple exist.
        -   [ ] Test fallback splitting for oversized blocks and metadata inheritance.
        -   [ ] **Test strict default logic for `chunk_classification`**.
    -   [x] Add integration tests in `test_metadata_flow.py` covering the full metadata pipeline (inflow, storage, outflow, filtering).
    -   [ ] **Add specific integration tests** verifying correct `chunk_classification` values are stored in FAISS and retrieved, especially for cases relying on the strict default.

#### Backend - API Layer (`api/`)

-   [x] **Update API Models:**
    -   [x] Add `allowed_classifications: Optional[List[str]]` to `api/vectorstore.py::QueryRequest`.
    -   [x] Add `allowed_classifications: Optional[List[str]]` to `api/llm.py::VectorStoreLLMQueryRequest`.
-   [x] **Update API Endpoints:**
    -   [x] Modify `api/vectorstore.py::query_vectorstore` endpoint to accept and pass `allowed_classifications`.
    -   [x] Modify `api/llm.py::llm_query_vectorstore` endpoint to accept and pass `allowed_classifications`.
-   [ ] **Fix LLM Prompt Generation (`api/vectorstore.py::analyze_vectorstore`):** **(NEEDS FIX)**
    -   [ ] Modify the logic (likely in `generate_analysis_prompt` or the calling code) to use the retrieved chunk's `chunk_classification` metadata field for the `CONTEXT` headers sent to the LLM, instead of incorrectly using the document-level classification.
-   [ ] **Testing (API):** **(Needs Expansion)**
    -   [~] Add API tests for `/vectorstores/{id}/query` verifying the `allowed_classifications` filter. (Test suite exists, but need to confirm specific coverage for this filter via API).
    -   [~] Add API tests for `/vectorstores/{id}/llm-query` verifying the `allowed_classifications` filter. (Test suite exists, but need to confirm specific coverage for this filter via API).
    -   [ ] **Add API tests** for `/vectorstores/{id}/analyze` verifying the LLM prompt contains the correct `chunk_classification` in its context headers.

#### Frontend (`frontend/`)

-   [x] **Update Query Tester UI (`QueryTester.js`):**
    -   [x] Add UI controls (e.g., multi-select dropdown, checkboxes) for selecting allowed classification levels.
    -   [x] Map UI selection to an array of classification strings.
-   [x] **Update Service Layer (`vectorStoreService.js`):**
    -   [x] Modify `testVectorStoreQuery` function to accept and pass the `allowed_classifications` array.
    -   [x] Modify `llmQueryVectorStore` function to accept and pass the `allowed_classifications` array.
-   [ ] **Refine Metadata Display (`MetadataDisplay.js`):** **(NEEDS FIX)**
    -   [ ] Fix the potential issue where two "Document:" chips might render if classifications match. Ensure only one "Document:" chip shows in this case.
-   [ ] **Testing (Frontend):**
    -   [ ] Manually test the Query Tester UI, specifically:
        -   [ ] Verify classification filtering works as expected.
        -   [ ] Verify the "Document:" and "Chunk:" classification chips display correctly based on retrieved metadata.

By addressing the structural issues in the codebase, we'll not only fix the immediate metadata problems but also create a foundation for easier maintenance and extension in the future.
