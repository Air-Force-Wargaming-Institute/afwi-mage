# Analysis Workbench Service

## Overview

The Analysis Workbench Service provides APIs for data analysis and visualization using LLMs to assist analysts in working with spreadsheets and generating charts.

## Spreadsheet Processing Implementation

The spreadsheet processing functionality includes:

### Core Components

1. **SpreadsheetManager** (`core/spreadsheet/manager.py`)
   - Manages spreadsheet files (upload, storage, metadata)
   - Tracks file information (sheets, columns, size)
   - Provides centralized file access

2. **SpreadsheetProcessor** (`core/spreadsheet/processor.py`)
   - Handles reading data from spreadsheets
   - Supports cell range notation (e.g., "A1:C10")
   - Generates statistical summaries of columns
   - Will support transformations via LLMs (future)

### API Endpoints

Spreadsheet API endpoints (`api/spreadsheet.py`):

- `GET /api/workbench/spreadsheets/list` - List all available spreadsheets
- `POST /api/workbench/spreadsheets/upload` - Upload a new spreadsheet
- `GET /api/workbench/spreadsheets/{id}/info` - Get spreadsheet information
- `GET /api/workbench/spreadsheets/{id}/sheets` - Get sheet names
- `GET /api/workbench/spreadsheets/{id}/summary` - Get statistical summary
- `POST /api/workbench/spreadsheets/{id}/operate` - Perform operations on cells

### Future Improvements

Upcoming features:

1. **Column-to-Column LLM Transformations**
   - Transform data in spreadsheets column by column
   - Use LLM prompting for complex transformations

2. **Multi-Output Column Generation**
   - Generate multiple output columns from input columns
   - Support template-based processing

3. **Advanced Cell Operations**
   - Implement write operations
   - Add support for formulas and conditional formatting

## Running Tests

```bash
cd backend/workbench_service
pytest tests/
```

## API Documentation

Once the service is running, API documentation is available at:

```
http://localhost:8020/docs
``` 