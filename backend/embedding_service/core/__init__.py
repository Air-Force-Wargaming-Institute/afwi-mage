"""
Core functionality for the embedding service.

This package contains the core business logic for the embedding service,
separated from API endpoints to improve modularity and testability.
"""

# These imports will be uncommented as the modules are implemented
try:
    from .vectorstore import VectorStoreManager
except ImportError:
    from core.vectorstore import VectorStoreManager
try:
    from .document import load_documents, copy_files_to_staging
except ImportError:
    from core.document import load_documents, copy_files_to_staging
# from .embedding import get_embedding_model, get_available_embedding_models
try:
    from .job import JobManager, register_job, update_job_progress, complete_job, fail_job, get_job_status
except ImportError:
    from core.job import JobManager, register_job, update_job_progress, complete_job, fail_job, get_job_status

__all__ = [
    # From vectorstore.py
    'VectorStoreManager',
    'create_vectorstore',
    'update_vectorstore',
    
    # From document.py
    'load_documents',
    'copy_files_to_staging',
    'process_documents',
    
    # From embedding.py
    'get_embedding_model',
    'get_available_embedding_models',
    
    # From job.py
    'JobManager',
    'register_job',
    'update_job_progress',
    'complete_job',
    'fail_job',
    'get_job_status'
]
