"""
Tests for the spreadsheet API endpoints.
"""

import os
import pytest
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient
import pandas as pd

from app import app
from core.spreadsheet import SpreadsheetManager, SpreadsheetProcessor

# Create a test client
client = TestClient(app)

@pytest.fixture
def test_spreadsheet():
    """Create a test spreadsheet file for testing."""
    # Create a temporary directory
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a simple spreadsheet
        df = pd.DataFrame({
            'Name': ['Alice', 'Bob', 'Charlie', 'David', 'Eve'],
            'Age': [25, 30, 35, 40, 45],
            'City': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
            'Salary': [50000, 60000, 70000, 80000, 90000]
        })
        
        # Save as Excel
        filepath = Path(tmpdir) / "test_data.xlsx"
        df.to_excel(filepath, index=False)
        
        yield str(filepath)

@pytest.fixture
def spreadsheet_manager():
    """Create a spreadsheet manager for testing."""
    # Create a temporary directory for uploads
    with tempfile.TemporaryDirectory() as tmpdir:
        # Initialize manager with the temp directory
        manager = SpreadsheetManager(upload_dir=Path(tmpdir))
        yield manager

@pytest.fixture
def spreadsheet_processor():
    """Create a spreadsheet processor for testing."""
    return SpreadsheetProcessor()

def test_list_spreadsheets():
    """Test the list_spreadsheets endpoint."""
    response = client.get("/api/workbench/spreadsheets/list")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_spreadsheet_manager_init(spreadsheet_manager):
    """Test spreadsheet manager initialization."""
    assert spreadsheet_manager is not None
    assert spreadsheet_manager.metadata == {}
    assert os.path.exists(spreadsheet_manager.upload_dir)

def test_spreadsheet_processor_read(test_spreadsheet, spreadsheet_processor):
    """Test reading a spreadsheet."""
    result = spreadsheet_processor.read_spreadsheet(file_path=Path(test_spreadsheet))
    assert result["success"] == True
    assert "data" in result
    assert "values" in result["data"]
    assert len(result["data"]["values"]) > 0  # Should have at least header row
    assert result["data"]["values"][0] == ["Name", "Age", "City", "Salary"]

def test_spreadsheet_processor_column_summary(test_spreadsheet, spreadsheet_processor):
    """Test getting column summary."""
    summaries = spreadsheet_processor.get_column_summary(file_path=Path(test_spreadsheet))
    assert len(summaries) == 4  # Should have 4 columns
    
    # Check the structure of each summary
    for summary in summaries:
        assert "name" in summary
        assert "dtype" in summary
        assert "count" in summary
        assert "null_count" in summary
        assert "unique_count" in summary
        
        # Check numeric column details
        if summary["name"] == "Age" or summary["name"] == "Salary":
            assert "min" in summary
            assert "max" in summary
            assert "mean" in summary
            assert "median" in summary
            assert "std" in summary

def test_cell_range_parsing(spreadsheet_processor):
    """Test parsing cell ranges."""
    # Test simple range
    start_col, start_row, end_col, end_row = spreadsheet_processor._parse_cell_range("A1:C10")
    assert start_col == 0  # A = 0
    assert start_row == 1  # 1-indexed
    assert end_col == 2    # C = 2
    assert end_row == 10   # 10
    
    # Test single cell
    start_col, start_row, end_col, end_row = spreadsheet_processor._parse_cell_range("B2")
    assert start_col == 1  # B = 1
    assert start_row == 2  # 2
    assert end_col == 1    # B = 1
    assert end_row == 2    # 2
    
    # Test multi-letter column
    start_col, start_row, end_col, end_row = spreadsheet_processor._parse_cell_range("AA1:BC10")
    assert start_col == 26  # AA = 26
    assert start_row == 1   # 1
    assert end_col == 54    # BC = 54
    assert end_row == 10    # 10

def test_column_str_to_index(spreadsheet_processor):
    """Test converting column strings to indices."""
    assert spreadsheet_processor._column_str_to_index("A") == 0
    assert spreadsheet_processor._column_str_to_index("Z") == 25
    assert spreadsheet_processor._column_str_to_index("AA") == 26
    assert spreadsheet_processor._column_str_to_index("AB") == 27
    assert spreadsheet_processor._column_str_to_index("BA") == 52
    assert spreadsheet_processor._column_str_to_index("ZZ") == 701  # 26*26 + 25

# Note: These tests will require actual API interaction which would require
# mocking the SpreadsheetManager and SpreadsheetProcessor. Additional tests
# can be added as needed. 