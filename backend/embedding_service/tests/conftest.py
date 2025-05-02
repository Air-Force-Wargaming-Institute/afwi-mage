"""
Pytest configuration file for embedding service tests.

This file contains pytest fixtures and configuration shared across all test modules.
"""

import os
import sys
import logging
import pytest
from pathlib import Path

# Add the parent directory (embedding_service) to the Python path
# This allows tests to import modules like 'core', 'api', etc.
embedding_service_dir = str(Path(__file__).parent.parent)
if embedding_service_dir not in sys.path:
    print(f"Adding {embedding_service_dir} to sys.path for testing")
    sys.path.insert(0, embedding_service_dir)

# Configure logging for tests
@pytest.fixture(autouse=True)
def configure_logging():
    """Set up logging configuration for tests."""
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    # Suppress noisy loggers during tests
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('matplotlib').setLevel(logging.WARNING)
    
    # Create a test logger
    test_logger = logging.getLogger('embedding_service_test')
    test_logger.setLevel(logging.DEBUG)
    
    return test_logger


@pytest.fixture
def test_data_dir():
    """Path to the test data directory."""
    return os.path.join(os.path.dirname(__file__), 'data')


@pytest.fixture(autouse=True)
def create_test_data_dir(test_data_dir):
    """Create test data directory if it doesn't exist."""
    os.makedirs(test_data_dir, exist_ok=True)
    yield
    # We don't clean up the directory automatically to allow inspection of test artifacts 