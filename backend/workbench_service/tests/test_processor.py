"""
Tests for the spreadsheet processor with particular focus on job status updates.

These tests verify that:
1. Job status is properly updated to 'completed' or 'completed_with_errors'
2. Errors during job status update are properly handled
"""

import os
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

import pandas as pd
import pytest
import tempfile

# Import the application modules
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.spreadsheet.processor import SpreadsheetProcessor

class TestSpreadsheetProcessor(unittest.TestCase):
    """Test spreadsheet processor functionality."""
    
    def setUp(self):
        """Set up for tests."""
        self.processor = SpreadsheetProcessor()
        
        # Create a test CSV file
        self.temp_dir = tempfile.TemporaryDirectory()
        self.test_file = Path(self.temp_dir.name) / "test.csv"
        
        # Create a simple dataframe and save as CSV
        data = {
            'col1': ['a', 'b', 'c'],
            'col2': [1, 2, 3]
        }
        df = pd.DataFrame(data)
        df.to_csv(self.test_file, index=False)
    
    def tearDown(self):
        """Clean up after tests."""
        self.temp_dir.cleanup()
    
    def test_read_spreadsheet(self):
        """Test basic reading of a spreadsheet."""
        result = self.processor.read_spreadsheet(
            file_path=self.test_file,
            sheet_name="Sheet1"  # For CSV this is ignored
        )
        
        self.assertTrue(result["success"])
        self.assertEqual(len(result["data"]["values"]), 4)  # Header + 3 rows
        self.assertEqual(result["data"]["values"][0], ["col1", "col2"])  # Header
        self.assertEqual(result["data"]["values"][1], ["a", 1])  # First row
    
    @pytest.mark.asyncio
    async def test_transform_spreadsheet_preview(self):
        """Test spreadsheet transformation in preview mode."""
        # Define a simple transformation
        input_columns = ["col1", "col2"]
        output_columns = [
            {
                "name": "output_col",
                "description": "Combine col1 and col2",
                "output_type": "text",
                "is_new": True
            }
        ]
        
        # Mock the RowTransformer and BatchProcessor
        with patch('core.spreadsheet.processor.RowTransformer') as MockTransformer, \
             patch('core.spreadsheet.processor.BatchProcessor') as MockProcessor:
            
            # Setup the processor mock to return a DataFrame with our expected result
            mock_processor_instance = MockProcessor.return_value
            mock_processor_instance.process_dataframe = AsyncMock()
            
            # Create a result dataframe
            result_df = pd.DataFrame({
                'col1': ['a', 'b', 'c'],
                'col2': [1, 2, 3],
                'output_col': ['a1', 'b2', 'c3']
            })
            mock_processor_instance.process_dataframe.return_value = result_df
            
            # Call the method
            result = await self.processor.transform_spreadsheet(
                file_path=self.test_file,
                sheet_name="Sheet1",
                input_columns=input_columns,
                output_columns=output_columns,
                processing_mode="preview"
            )
            
            # Verify result
            self.assertTrue(result["success"])
            self.assertIn("preview", result)
            self.assertEqual(len(result["preview"]), 4)  # Header + 3 rows
            self.assertEqual(result["preview"][0], ['col1', 'col2', 'output_col'])  # Header
    
    @pytest.mark.asyncio
    async def test_transform_spreadsheet_background_success(self):
        """Test successful background transformation with completed status."""
        # Setup mocks
        mock_job_id = "test_job_123"
        mock_update_job = MagicMock()
        
        with patch('core.spreadsheet.processor.RowTransformer') as MockTransformer, \
             patch('core.spreadsheet.processor.BatchProcessor') as MockProcessor, \
             patch('core.spreadsheet.processor.get_spreadsheet_manager') as mock_get_manager, \
             patch('core.spreadsheet.processor.pd.read_csv') as mock_read_csv, \
             patch('core.spreadsheet.processor.pd.read_excel') as mock_read_excel, \
             patch('api.jobs.update_job_in_store', mock_update_job):
            
            # Setup the processor mock
            mock_processor_instance = MockProcessor.return_value
            mock_processor_instance.process_dataframe = AsyncMock()
            
            # Create test dataframes
            test_df = pd.DataFrame({
                'col1': ['a', 'b', 'c'],
                'col2': [1, 2, 3]
            })
            result_df = test_df.copy()
            result_df['output_col'] = ['a1', 'b2', 'c3']
            
            # Set up dataframe mocks
            mock_read_csv.return_value = test_df
            mock_processor_instance.process_dataframe.return_value = result_df
            
            # Mock spreadsheet manager 
            mock_manager = MagicMock()
            mock_get_manager.return_value = mock_manager
            mock_manager.create_duplicate_spreadsheet.return_value = {
                "id": "duplicate_id",
                "storage_path": str(self.test_file)
            }
            
            # Set up transformer
            mock_transformer = MockTransformer.return_value
            mock_transformer.had_errors = False
            
            # Call the method
            await self.processor.transform_spreadsheet_background(
                job_id=mock_job_id,
                file_path=self.test_file,
                sheet_name="Sheet1",
                input_columns=["col1", "col2"],
                output_columns=[{
                    "name": "output_col",
                    "description": "Combine col1 and col2",
                    "output_type": "text",
                    "is_new": True
                }],
                create_duplicate=True,
                spreadsheet_id="original_id"
            )
            
            # Verify job status updates
            mock_update_job.assert_any_call(mock_job_id, {
                "status": "running",
                "progress": 0,
                "message": "Starting transformation"
            })
            
            # Final status should be "completed"
            mock_update_job.assert_any_call(mock_job_id, {
                "status": "completed",
                "progress": 100,
                "message": mock_update_job.call_args[0][1]["message"],  # Just check the call happened
                "result": {
                    "output_file_path": str(self.test_file),
                    "spreadsheet_id": "duplicate_id",
                    "message": None
                }
            })
    
    @pytest.mark.asyncio
    async def test_transform_with_errors(self):
        """Test transformation with errors correctly updates to completed_with_errors."""
        # Setup mocks
        mock_job_id = "test_job_123"
        mock_update_job = MagicMock()
        
        with patch('core.spreadsheet.processor.RowTransformer') as MockTransformer, \
             patch('core.spreadsheet.processor.BatchProcessor') as MockProcessor, \
             patch('core.spreadsheet.processor.get_spreadsheet_manager') as mock_get_manager, \
             patch('core.spreadsheet.processor.pd.read_csv') as mock_read_csv, \
             patch('core.spreadsheet.processor.pd.read_excel') as mock_read_excel, \
             patch('api.jobs.update_job_in_store', mock_update_job):
            
            # Setup processor
            mock_processor_instance = MockProcessor.return_value
            mock_processor_instance.process_dataframe = AsyncMock()
            
            # Create test dataframes
            test_df = pd.DataFrame({
                'col1': ['a', 'b', 'c'],
                'col2': [1, 2, 3]
            })
            result_df = test_df.copy()
            result_df['output_col'] = ['a1', 'b2', 'c3']
            
            # Set up dataframe mocks
            mock_read_csv.return_value = test_df
            mock_processor_instance.process_dataframe.return_value = result_df
            
            # Mock spreadsheet manager
            mock_manager = MagicMock()
            mock_get_manager.return_value = mock_manager
            mock_manager.create_duplicate_spreadsheet.return_value = {
                "id": "duplicate_id",
                "storage_path": str(self.test_file)
            }
            
            # Set up transformer with errors
            mock_transformer = MockTransformer.return_value
            mock_transformer.had_errors = True  # This will trigger completed_with_errors
            
            # Call the method
            await self.processor.transform_spreadsheet_background(
                job_id=mock_job_id,
                file_path=self.test_file,
                sheet_name="Sheet1",
                input_columns=["col1", "col2"],
                output_columns=[{
                    "name": "output_col",
                    "description": "Combine col1 and col2",
                    "output_type": "text",
                    "is_new": True
                }],
                create_duplicate=True,
                spreadsheet_id="original_id"
            )
            
            # Final status should be "completed_with_errors"
            for call in mock_update_job.call_args_list:
                if call[0][1].get("status") == "completed_with_errors":
                    # Found the right call
                    self.assertEqual(call[0][1]["progress"], 100)
                    self.assertTrue("Some cells may contain default values" in call[0][1]["message"])
                    break
            else:
                self.fail("Never called update_job_in_store with status=completed_with_errors")
    
    @pytest.mark.asyncio
    async def test_job_status_update_error_handling(self):
        """Test error handling when job status update fails."""
        mock_job_id = "test_job_123"
        
        # Create a mock update_job_in_store that raises an exception on the final update
        def mock_update_with_error(job_id, updates):
            if updates.get("status") in ["completed", "completed_with_errors", "failed"]:
                raise Exception("Error updating job status")
            return {"id": job_id, **updates}
        
        # Patch the update_job_status function
        with patch('core.spreadsheet.processor.update_job_in_store', side_effect=mock_update_with_error), \
             patch('core.spreadsheet.processor.RowTransformer') as MockTransformer, \
             patch('core.spreadsheet.processor.BatchProcessor') as MockProcessor, \
             patch('core.spreadsheet.processor.get_spreadsheet_manager') as mock_get_manager, \
             patch('core.spreadsheet.processor.pd.read_csv') as mock_read_csv, \
             patch('logging.error') as mock_error:
            
            # Setup the processor mock
            mock_processor_instance = MockProcessor.return_value
            mock_processor_instance.process_dataframe = AsyncMock()
            
            # Create test dataframes
            test_df = pd.DataFrame({
                'col1': ['a', 'b', 'c'],
                'col2': [1, 2, 3]
            })
            result_df = test_df.copy()
            
            # Set up mocks
            mock_read_csv.return_value = test_df
            mock_processor_instance.process_dataframe.return_value = result_df
            
            # Mock spreadsheet manager
            mock_manager = MagicMock()
            mock_get_manager.return_value = mock_manager
            mock_manager.create_duplicate_spreadsheet.return_value = {
                "id": "duplicate_id",
                "storage_path": str(self.test_file)
            }
            
            # Set up transformer
            mock_transformer = MockTransformer.return_value
            mock_transformer.had_errors = False
            
            # Call the method - this should handle the error without crashing
            await self.processor.transform_spreadsheet_background(
                job_id=mock_job_id,
                file_path=self.test_file,
                sheet_name="Sheet1",
                input_columns=["col1", "col2"],
                output_columns=[{"name": "output_col", "description": "test", "is_new": True}],
                create_duplicate=True,
                spreadsheet_id="original_id"
            )
            
            # Check that we logged the error
            mock_error.assert_any_call("Error during transformation: Error updating job status", exc_info=True) 