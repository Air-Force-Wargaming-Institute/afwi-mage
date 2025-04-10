"""
Tests for startup behavior of the Analysis Workbench service.

These tests verify:
1. The jobs store and metadata files are created if they don't exist
2. Error handling for file operations during startup
"""

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# Import the application modules
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# We'll test module-level code, so it's important to import
# specific functions rather than the whole module
from config import get_config

class TestAppStartup(unittest.TestCase):
    """Test app startup behavior, particularly around file initialization."""
    
    def setUp(self):
        """Setup temporary directory for testing."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.workbench_dir = Path(self.temp_dir.name) / "workbench"
        self.spreadsheets_dir = self.workbench_dir / "spreadsheets"
        
        # Create the required directories
        os.makedirs(self.spreadsheets_dir, exist_ok=True)
        
        # Setup patch for config
        self.config_patcher = patch('config.get_config')
        self.mock_get_config = self.config_patcher.start()
        self.mock_get_config.return_value = {
            'WORKBENCH_DIR': str(self.workbench_dir),
            'WORKBENCH_SPREADSHEETS_DIR': str(self.spreadsheets_dir)
        }
    
    def tearDown(self):
        """Clean up after tests."""
        self.config_patcher.stop()
        self.temp_dir.cleanup()
    
    def test_jobs_store_creation(self):
        """Test that jobs_store.json is created if it doesn't exist."""
        jobs_store_path = self.workbench_dir / "jobs_store.json"
        
        # Ensure it doesn't exist yet
        if os.path.exists(jobs_store_path):
            os.remove(jobs_store_path)
        
        # Import app module to trigger startup code
        with patch('logging.info') as mock_info:
            from app import app
            
            # Verify the file was created
            self.assertTrue(os.path.exists(jobs_store_path))
            
            # Check that we logged the creation
            mock_info.assert_any_call(f"Successfully created empty jobs store file at {jobs_store_path}")
    
    def test_metadata_creation(self):
        """Test that metadata.json is created if it doesn't exist."""
        metadata_path = self.spreadsheets_dir / "metadata.json"
        
        # Ensure it doesn't exist yet
        if os.path.exists(metadata_path):
            os.remove(metadata_path)
        
        # Import app module to trigger startup code
        with patch('logging.info') as mock_info:
            from app import app
            
            # Verify the file was created
            self.assertTrue(os.path.exists(metadata_path))
            
            # Check that we logged the creation
            mock_info.assert_any_call(f"Successfully created empty metadata file at {metadata_path}")
    
    def test_write_permission_check(self):
        """Test that we check for write permissions on existing files."""
        # Create the jobs store file
        jobs_store_path = self.workbench_dir / "jobs_store.json"
        with open(jobs_store_path, 'w') as f:
            f.write("{}")
        
        # Import app module with mocked logging
        with patch('logging.info') as mock_info:
            from app import app
            
            # Check that we verified write permissions
            mock_info.assert_any_call(f"Verified jobs store file is writable at {jobs_store_path}")
    
    @unittest.skipIf(os.name == 'nt', "Permission tests not reliable on Windows")
    def test_nonwritable_jobs_store(self):
        """Test handling of non-writable jobs store file."""
        # Create the jobs store file
        jobs_store_path = self.workbench_dir / "jobs_store.json"
        with open(jobs_store_path, 'w') as f:
            f.write("{}")
        
        # Make it read-only
        os.chmod(jobs_store_path, 0o444)
        
        try:
            # Import app module with mocked logging
            with patch('logging.error') as mock_error:
                from app import app
                
                # Reload to trigger startup code again
                import importlib
                importlib.reload(sys.modules['app'])
                
                # Check that we logged the error
                mock_error.assert_any_call(f"Jobs store file is not writable: {jobs_store_path}")
        finally:
            # Make it writable again for cleanup
            os.chmod(jobs_store_path, 0o644) 