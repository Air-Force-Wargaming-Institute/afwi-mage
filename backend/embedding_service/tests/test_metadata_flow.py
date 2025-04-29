"""
Tests for verifying the metadata flow throughout the embedding service pipeline,
from document ingestion to retrieval.
"""

import os
import pytest
import json
import shutil
from pathlib import Path
from typing import List, Dict, Any

# Assume core modules are importable (adjust paths/conftest if needed)
from core.document import load_documents
from core.vectorstore import VectorStoreManager
from core.embedding import get_embedding_model
from core.semantic_block_splitter import SemanticBlockSplitter
from langchain_core.documents import Document

# --- Test Fixtures (can be moved to conftest.py if preferred) ---

@pytest.fixture(scope="module")
def test_data_dir(tmp_path_factory):
    """Create a temporary directory for test data."""
    tmp_dir = tmp_path_factory.mktemp("metadata_flow_data")
    (tmp_dir / "uploads").mkdir()
    (tmp_dir / "staging").mkdir()
    (tmp_dir / "vectorstores").mkdir()
    yield tmp_dir
    # Optional: cleanup is handled by tmp_path_factory

@pytest.fixture(scope="module")
def upload_dir(test_data_dir):
    """Path to the temporary upload directory."""
    return test_data_dir / "uploads"

@pytest.fixture(scope="module")
def staging_dir(test_data_dir):
    """Path to the temporary staging directory."""
    return test_data_dir / "staging"

@pytest.fixture(scope="module")
def vectorstore_dir(test_data_dir):
    """Path to the temporary vectorstores directory."""
    return test_data_dir / "vectorstores"

@pytest.fixture(scope="module")
def vs_manager(vectorstore_dir):
    """VectorStoreManager instance initialized with the test directory."""
    return VectorStoreManager(str(vectorstore_dir))

@pytest.fixture(scope="module")
def embedding_model():
    """Get a default embedding model instance."""
    # Using the default from core.embedding - adjust if needed
    return get_embedding_model()

@pytest.fixture
def setup_test_files(upload_dir):
    """Create sample test files with and without metadata."""
    files = {}

    # 1. Unclassified text file
    files["doc_unclassified.txt"] = upload_dir / "doc_unclassified.txt"
    files["doc_unclassified.txt"].write_text(
        "This is the first paragraph of the unclassified document.\n\n" \
        "This is the second paragraph."
    )

    # 2. Secret text file with portion markings and metadata file
    files["doc_secret.txt"] = upload_dir / "doc_secret.txt"
    files["doc_secret.txt"].write_text(
        "(S) This is the first paragraph of the secret document.\n\n" \
        "(S) This is the second paragraph. It mentions SECRET info."
    )
    secret_meta_path = upload_dir / "doc_secret.txt.metadata"
    secret_meta = {
        "original_filename": "SECRET_Source_Document_v1.txt",
        "security_classification": "SECRET",
        "document_id": "doc_secret_123",
        "author": "Test Author"
    }
    secret_meta_path.write_text(json.dumps(secret_meta))

    # 3. Mixed classification PDF (placeholder text) with metadata file
    # Note: Creating a real PDF is complex here, using text with PDF extension
    files["doc_mixed.pdf"] = upload_dir / "doc_mixed.pdf"
    files["doc_mixed.pdf"].write_text(
        "(C) This is page 1 content. It is CONFIDENTIAL.\n\n" \
        "(U) This is more content on page 1. It is UNCLASSIFIED.\f" \
        "(C) This is page 2. It contains CONFIDENTIAL list items:\n" \
        "- Item 1 (C)\n" \
        "- Item 2 (C)\n" \
        "(U) An unclassified footnote."
    )
    mixed_meta_path = upload_dir / "doc_mixed.pdf.metadata"
    mixed_meta = {
        "original_filename": "Mixed_Classification_Report.pdf",
        "security_classification": "CONFIDENTIAL", # Overall doc classification
        "document_id": "doc_mixed_456",
        "pages": 2
    }
    mixed_meta_path.write_text(json.dumps(mixed_meta))

    # 4. Text file with markings but no metadata file
    files["doc_no_meta.txt"] = upload_dir / "doc_no_meta.txt"
    files["doc_no_meta.txt"].write_text(
        "(U) This document lacks an external metadata file.\n\n" \
        "(U) It relies on internal portion markings only."
    )

    yield files
    # tmp_path fixture handles cleanup

# --- Metadata Inflow Tests (Document Loading & Chunking) ---

def test_load_documents_preserves_basic_metadata(setup_test_files):
    """Verify doc_id, original_filename, security_classification are preserved."""
    test_file_path = setup_test_files["doc_secret.txt"]
    metadata_path = test_file_path.with_suffix(test_file_path.suffix + ".metadata")
    expected_metadata = json.loads(metadata_path.read_text())

    # Load documents using the core function
    # Need to simulate the metadata dict structure expected by load_documents
    file_metadata_dict = {str(test_file_path): expected_metadata}

    documents, skipped = load_documents([str(test_file_path)], file_metadata=file_metadata_dict)

    assert not skipped
    assert len(documents) > 0
    for doc in documents:
        assert doc.metadata["original_filename"] == expected_metadata["original_filename"]
        assert doc.metadata["document_id"] == expected_metadata["document_id"]
        assert doc.metadata["security_classification"] == "SECRET"
        assert doc.metadata["author"] == expected_metadata["author"]

def test_chunk_classification_inheritance(setup_test_files):
    """Verify chunks inherit doc classification if no portion marking exists."""
    test_file_path = setup_test_files["doc_unclassified.txt"]
    # No metadata file, so defaults should apply
    file_metadata_dict = {
        str(test_file_path): {
            "original_filename": "doc_unclassified.txt",
            "security_classification": "UNCLASSIFIED",
            "document_id": "doc_unclass_789"
        }
    }
    documents, skipped = load_documents([str(test_file_path)], file_metadata=file_metadata_dict)

    assert not skipped
    assert len(documents) > 0
    for doc in documents:
        assert doc.metadata["chunk_classification"] == "UNCLASSIFIED"

def test_chunk_classification_portion_marking(setup_test_files):
    """Verify chunks get classification from portion markings."""
    test_file_path = setup_test_files["doc_secret.txt"]
    metadata_path = test_file_path.with_suffix(test_file_path.suffix + ".metadata")
    expected_metadata = json.loads(metadata_path.read_text())
    file_metadata_dict = {str(test_file_path): expected_metadata}

    documents, skipped = load_documents([str(test_file_path)], file_metadata=file_metadata_dict)

    assert not skipped
    assert len(documents) > 0
    for doc in documents:
        # Portion markings are (S), so chunk classification should be SECRET
        assert doc.metadata["chunk_classification"] == "SECRET"

def test_chunk_classification_mixed_markings(setup_test_files):
    """Verify correct chunk classification with mixed markings within a document."""
    # TODO: Implement this test. Requires inspecting content and expected marking.
    pytest.skip("Mixed marking test not yet implemented")


def test_load_documents_no_metadata_file(setup_test_files):
    """Verify loading works and defaults apply when no .metadata file exists."""
    test_file_path = setup_test_files["doc_no_meta.txt"]
    # Pass None or empty dict for file_metadata
    documents, skipped = load_documents([str(test_file_path)], file_metadata=None)

    assert not skipped
    assert len(documents) > 0
    for doc in documents:
        assert "document_id" in doc.metadata # Should be generated
        assert doc.metadata["original_filename"] == "doc_no_meta.txt" # Derived from path
        assert doc.metadata["security_classification"] == "UNCLASSIFIED" # Default
        # Portion markings are (U)
        assert doc.metadata["chunk_classification"] == "UNCLASSIFIED"


# --- Metadata Storage Tests (Vector Store Creation/Update) ---

def test_create_vectorstore_metadata_file(setup_test_files, vs_manager, embedding_model):
    """Verify metadata.json is created correctly."""
    test_file_path = setup_test_files["doc_secret.txt"]
    metadata_path = test_file_path.with_suffix(test_file_path.suffix + ".metadata")
    doc_meta = json.loads(metadata_path.read_text())
    file_metadata_dict = {str(test_file_path): doc_meta}

    # Load the document
    documents, skipped = load_documents([str(test_file_path)], file_metadata=file_metadata_dict)
    assert not skipped and documents

    # Prepare file_infos for metadata creation
    file_infos = [
        {
            "filename": doc_meta["original_filename"],
            "original_path": str(test_file_path),
            "document_id": doc_meta["document_id"],
            "security_classification": doc_meta["security_classification"],
            "size_bytes": test_file_path.stat().st_size,
            "added_at": "some_timestamp", # Placeholder, actual time is set during creation
            "author": doc_meta["author"]
        }
    ]

    # Create the vector store
    vs_id = vs_manager.create_vectorstore(
        name="Test Create Meta Store",
        description="Test store for metadata",
        documents=documents,
        embedding_model=embedding_model,
        embedding_model_name=embedding_model.model,
        file_infos=file_infos,
        chunk_size=1000, # Match defaults or pass appropriate values
        chunk_overlap=100
    )

    # Check if metadata.json exists
    vs_dir = vs_manager.base_dir / vs_id
    vs_metadata_path = vs_dir / "metadata.json"
    assert vs_metadata_path.exists()

    # Load and verify the metadata content
    vs_metadata = json.loads(vs_metadata_path.read_text())
    assert vs_metadata["id"] == vs_id
    assert vs_metadata["name"] == "Test Create Meta Store"
    assert len(vs_metadata["files"]) == 1

    stored_file_info = vs_metadata["files"][0]
    assert stored_file_info["filename"] == doc_meta["original_filename"]
    assert stored_file_info["original_path"] == str(test_file_path)
    assert stored_file_info["document_id"] == doc_meta["document_id"]
    assert stored_file_info["security_classification"] == doc_meta["security_classification"]
    assert stored_file_info["author"] == doc_meta["author"]


def test_update_vectorstore_metadata_file(setup_test_files, vs_manager, embedding_model):
    """Verify metadata.json is updated correctly when adding files."""
    # 1. Create initial vector store with one document
    test_file_path1 = setup_test_files["doc_secret.txt"]
    metadata_path1 = test_file_path1.with_suffix(test_file_path1.suffix + ".metadata")
    doc_meta1 = json.loads(metadata_path1.read_text())
    file_metadata_dict1 = {str(test_file_path1): doc_meta1}
    documents1, skipped1 = load_documents([str(test_file_path1)], file_metadata=file_metadata_dict1)
    assert not skipped1 and documents1

    file_infos1 = [
        {
            "filename": doc_meta1["original_filename"],
            "original_path": str(test_file_path1),
            "document_id": doc_meta1["document_id"],
            "security_classification": doc_meta1["security_classification"],
            "size_bytes": test_file_path1.stat().st_size,
            "added_at": "some_timestamp1"
        }
    ]

    vs_id = vs_manager.create_vectorstore(
        name="Test Update Meta Store",
        description="Test store for metadata update",
        documents=documents1,
        embedding_model=embedding_model,
        embedding_model_name=embedding_model.model,
        file_infos=file_infos1,
        chunk_size=1000,
        chunk_overlap=100
    )

    # 2. Prepare the second document to add
    test_file_path2 = setup_test_files["doc_unclassified.txt"]
    # Simulate metadata for the second file (it doesn't have a .metadata file)
    doc_meta2 = {
        "original_filename": "doc_unclassified.txt",
        "security_classification": "UNCLASSIFIED",
        "document_id": "doc_unclass_789"
    }
    file_metadata_dict2 = {str(test_file_path2): doc_meta2}
    documents2, skipped2 = load_documents([str(test_file_path2)], file_metadata=file_metadata_dict2)
    assert not skipped2 and documents2

    file_infos2 = [
        {
            "filename": doc_meta2["original_filename"],
            "original_path": str(test_file_path2),
            "document_id": doc_meta2["document_id"],
            "security_classification": doc_meta2["security_classification"],
            "size_bytes": test_file_path2.stat().st_size,
            "added_at": "some_timestamp2"
        }
    ]

    # 3. Update the vector store
    update_success = vs_manager.update_vectorstore(
        vectorstore_id=vs_id,
        documents=documents2,
        embedding_model=embedding_model,
        file_infos=file_infos2
    )
    assert update_success

    # 4. Verify the updated metadata.json
    vs_dir = vs_manager.base_dir / vs_id
    vs_metadata_path = vs_dir / "metadata.json"
    assert vs_metadata_path.exists()

    vs_metadata = json.loads(vs_metadata_path.read_text())
    assert vs_metadata["id"] == vs_id
    assert vs_metadata["name"] == "Test Update Meta Store"
    assert len(vs_metadata["files"]) == 2 # Should now contain two files
    assert vs_metadata["updated_at"] is not None
    assert vs_metadata["updated_at"] > vs_metadata["created_at"]

    # Check details of both files
    stored_filenames = [f["filename"] for f in vs_metadata["files"]]
    assert doc_meta1["original_filename"] in stored_filenames
    assert doc_meta2["original_filename"] in stored_filenames

    stored_doc_ids = [f["document_id"] for f in vs_metadata["files"]]
    assert doc_meta1["document_id"] in stored_doc_ids
    assert doc_meta2["document_id"] in stored_doc_ids


def test_chunk_metadata_in_docstore(setup_test_files, vs_manager, embedding_model):
    """Advanced: Verify chunk metadata stored within the FAISS docstore."""
    # 1. Load documents with distinct metadata
    test_file_path1 = setup_test_files["doc_secret.txt"]
    metadata_path1 = test_file_path1.with_suffix(test_file_path1.suffix + ".metadata")
    doc_meta1 = json.loads(metadata_path1.read_text())
    file_metadata_dict1 = {str(test_file_path1): doc_meta1}
    documents1, _ = load_documents([str(test_file_path1)], file_metadata=file_metadata_dict1)

    test_file_path2 = setup_test_files["doc_unclassified.txt"]
    doc_meta2 = {
        "original_filename": "doc_unclassified.txt",
        "security_classification": "UNCLASSIFIED",
        "document_id": "doc_unclass_789"
    }
    file_metadata_dict2 = {str(test_file_path2): doc_meta2}
    documents2, _ = load_documents([str(test_file_path2)], file_metadata=file_metadata_dict2)

    all_documents = documents1 + documents2
    assert all_documents

    # 2. Create vector store
    file_infos = []
    # Process first document
    info1 = doc_meta1.copy() # Start with original metadata
    info1["original_path"] = str(test_file_path1)
    # Ensure 'filename' exists, using original_filename if needed
    if "filename" not in info1 and "original_filename" in info1:
        info1["filename"] = info1["original_filename"]
    file_infos.append(info1)

    # Process second document
    info2 = doc_meta2.copy() # Start with original metadata
    info2["original_path"] = str(test_file_path2)
    # Ensure 'filename' exists, using original_filename if needed
    if "filename" not in info2 and "original_filename" in info2:
        info2["filename"] = info2["original_filename"]
    file_infos.append(info2)

    vs_id = vs_manager.create_vectorstore(
        name="Test Docstore Meta Store",
        description="Test store for docstore metadata",
        documents=all_documents,
        embedding_model=embedding_model,
        embedding_model_name=embedding_model.model,
        file_infos=file_infos,
        chunk_size=1000,
        chunk_overlap=100
    )

    # 3. Load the FAISS vector store directly
    vs_dir = vs_manager.base_dir / vs_id
    try:
        from langchain_community.vectorstores import FAISS
        vectorstore = FAISS.load_local(
            str(vs_dir),
            embedding_model,
            allow_dangerous_deserialization=True
        )
    except Exception as e:
        pytest.fail(f"Failed to load FAISS index: {e}")

    # 4. Inspect the docstore
    assert hasattr(vectorstore, 'docstore')
    assert hasattr(vectorstore.docstore, '_dict')
    docstore_dict = vectorstore.docstore._dict

    assert len(docstore_dict) == len(all_documents)

    # Check metadata of stored chunks
    secret_chunks_found = 0
    unclassified_chunks_found = 0
    for chunk_id, document in docstore_dict.items():
        assert isinstance(document, Document)
        metadata = document.metadata
        assert "chunk_classification" in metadata
        assert "document_id" in metadata
        assert "original_filename" in metadata

        if metadata["document_id"] == doc_meta1["document_id"]:
            assert metadata["chunk_classification"] == "SECRET"
            assert metadata["original_filename"] == doc_meta1["original_filename"]
            secret_chunks_found += 1
        elif metadata["document_id"] == doc_meta2["document_id"]:
            assert metadata["chunk_classification"] == "UNCLASSIFIED"
            assert metadata["original_filename"] == doc_meta2["original_filename"]
            unclassified_chunks_found += 1

    assert secret_chunks_found == len(documents1)
    assert unclassified_chunks_found == len(documents2)


# --- Metadata Outflow Tests (Retrieval) ---

# Helper function to create a reusable test vector store
@pytest.fixture
def setup_retrieval_test_vs(setup_test_files, vs_manager, embedding_model):
    """Creates a vector store with multiple documents for retrieval tests."""
    # Load documents with distinct metadata
    test_file_path1 = setup_test_files["doc_secret.txt"]
    metadata_path1 = test_file_path1.with_suffix(test_file_path1.suffix + ".metadata")
    doc_meta1 = json.loads(metadata_path1.read_text())
    file_metadata_dict1 = {str(test_file_path1): doc_meta1}
    documents1, _ = load_documents([str(test_file_path1)], file_metadata=file_metadata_dict1)

    test_file_path2 = setup_test_files["doc_unclassified.txt"]
    doc_meta2 = {
        "original_filename": "doc_unclassified.txt",
        "security_classification": "UNCLASSIFIED",
        "document_id": "doc_unclass_789"
    }
    file_metadata_dict2 = {str(test_file_path2): doc_meta2}
    documents2, _ = load_documents([str(test_file_path2)], file_metadata=file_metadata_dict2)

    all_documents = documents1 + documents2
    assert all_documents

    # Prepare file_infos - ensuring ALL relevant metadata is included
    file_infos = []
    # Process first document
    info1 = doc_meta1.copy() # Start with original metadata
    info1["original_path"] = str(test_file_path1)
    # Ensure 'filename' exists, using original_filename if needed
    if "filename" not in info1 and "original_filename" in info1:
        info1["filename"] = info1["original_filename"]
    file_infos.append(info1)

    # Process second document
    info2 = doc_meta2.copy() # Start with original metadata
    info2["original_path"] = str(test_file_path2)
    # Ensure 'filename' exists, using original_filename if needed
    if "filename" not in info2 and "original_filename" in info2:
        info2["filename"] = info2["original_filename"]
    file_infos.append(info2)

    # Original, flawed file_infos:
    # file_infos = [
    #     {
    #         "filename": doc_meta1["original_filename"],
    #         "original_path": str(test_file_path1),
    #         "document_id": doc_meta1["document_id"],
    #         "security_classification": doc_meta1["security_classification"]
    #     },
    #     {
    #         "filename": doc_meta2["original_filename"],
    #         "original_path": str(test_file_path2),
    #         "document_id": doc_meta2["document_id"],
    #         "security_classification": doc_meta2["security_classification"]
    #     }
    # ]

    # Create vector store
    vs_id = vs_manager.create_vectorstore(
        name="Test Retrieval Meta Store",
        description="Test store for retrieval metadata",
        documents=all_documents,
        embedding_model=embedding_model,
        embedding_model_name=embedding_model.model,
        file_infos=file_infos,
        chunk_size=1000,
        chunk_overlap=100
    )
    return vs_id, doc_meta1, doc_meta2 # Return ID and original metadata for checks

def test_query_retrieves_enriched_metadata(setup_retrieval_test_vs, vs_manager, embedding_model):
    """Verify queries return chunks with fully enriched metadata."""
    vs_id, doc_meta1, doc_meta2 = setup_retrieval_test_vs

    # --- Debugging Step: Query FAISS directly --- 
    print(f"\n--- Debugging Query for VS ID: {vs_id} ---")
    vs_dir = vs_manager.base_dir / vs_id
    try:
        from langchain_community.vectorstores import FAISS
        vectorstore = FAISS.load_local(
            str(vs_dir),
            embedding_model,
            allow_dangerous_deserialization=True
        )
        print("Successfully loaded FAISS index directly for debugging.")
        debug_query = "paragraph of the secret document"
        raw_debug_results = vectorstore.similarity_search_with_score(
            debug_query,
            k=5 # Get more results for debugging
        )
        print(f"Direct FAISS search for '{debug_query}' returned {len(raw_debug_results)} raw results:")
        for i, (doc, score) in enumerate(raw_debug_results):
            print(f"  Result {i}: Score={score:.4f}, Content='{doc.page_content[:100]}...', Metadata={doc.metadata}")
    except Exception as e:
        print(f"Error during direct FAISS debug query: {e}")
    print("--- End Debugging Query ---\n")
    # --- End Debugging Step ---

    # Query for content present in one of the documents
    query = "paragraph of the secret document"
    results = vs_manager.query_vector_store(
        vectorstore_id=vs_id,
        query_or_embedding=query,
        top_k=2 # Get enough results to likely include the target
    )

    assert results is not None
    assert len(results) > 0

    # Check the metadata of the first result (should be from doc_secret.txt)
    first_result_meta = results[0]["metadata"]
    assert first_result_meta["document_id"] == doc_meta1["document_id"]
    assert first_result_meta["original_filename"] == doc_meta1["original_filename"]
    assert first_result_meta["security_classification"] == "SECRET"
    assert first_result_meta["chunk_classification"] == "SECRET"
    # Check for other expected fields that *should* exist based on enrichment
    assert "author" in first_result_meta
    assert "original_path" in first_result_meta
    assert "filename" in first_result_meta
    assert "semantic_block_index" in first_result_meta # Added by splitter/enrichment

def test_query_classification_filtering_inclusive(setup_retrieval_test_vs, vs_manager, embedding_model):
    """Verify filtering allows specified classifications."""
    vs_id, doc_meta1, doc_meta2 = setup_retrieval_test_vs

    # Query for general content, allowing both SECRET and UNCLASSIFIED
    query = "paragraph"
    allowed = ["UNCLASSIFIED", "SECRET"]
    results = vs_manager.query_vector_store(
        vectorstore_id=vs_id,
        query_or_embedding=query,
        top_k=5, # Get enough results
        allowed_classifications=allowed
    )

    assert results is not None
    assert len(results) > 0 # Should find results

    # Check that results contain chunks from both classifications (if available)
    found_secret = False
    found_unclassified = False
    for result in results:
        chunk_class = result["metadata"].get("chunk_classification", "")
        assert chunk_class in allowed # Only allowed classifications should be present
        if chunk_class == "SECRET":
            found_secret = True
        elif chunk_class == "UNCLASSIFIED":
            found_unclassified = True

    # Depending on the query and top_k, we might not get both, but we should only get allowed ones.
    # For this specific setup and query, we expect both.
    assert found_secret, "Query should have returned SECRET chunks"
    assert found_unclassified, "Query should have returned UNCLASSIFIED chunks"

def test_query_classification_filtering_restrictive(setup_retrieval_test_vs, vs_manager, embedding_model):
    """Verify filtering excludes unspecified classifications."""
    vs_id, _, _ = setup_retrieval_test_vs

    # Query for general content, allowing only UNCLASSIFIED
    query = "paragraph"
    allowed = ["UNCLASSIFIED"]
    results = vs_manager.query_vector_store(
        vectorstore_id=vs_id,
        query_or_embedding=query,
        top_k=5,
        allowed_classifications=allowed
    )

    assert results is not None
    # We expect results, but only unclassified ones
    assert len(results) > 0

    # Check that *all* results have the allowed classification
    for result in results:
        chunk_class = result["metadata"].get("chunk_classification", "")
        assert chunk_class == "UNCLASSIFIED"

def test_query_classification_filtering_no_match(setup_retrieval_test_vs, vs_manager, embedding_model):
    """Verify filtering returns nothing if no chunks match allowed classifications."""
    vs_id, _, _ = setup_retrieval_test_vs

    # Query for general content, allowing only TOP SECRET (which doesn't exist in test data)
    query = "paragraph"
    allowed = ["TOP SECRET"]
    results = vs_manager.query_vector_store(
        vectorstore_id=vs_id,
        query_or_embedding=query,
        top_k=5,
        allowed_classifications=allowed
    )

    assert results is not None
    assert len(results) == 0 # Expect no results 