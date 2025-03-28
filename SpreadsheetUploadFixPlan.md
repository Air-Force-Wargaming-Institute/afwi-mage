# Spreadsheet Upload & Metadata Fix Plan

## Current Issues

1. **Metadata File Not Found**: The backend log shows the metadata file is created but it's not visible in the expected location (`data\workbench\uploads`).

2. **API Endpoint 404 Errors**: Frontend receives 404 errors when attempting to call `http://localhost:3000/api/workbench/spreadsheets/list`.

3. **Select Component Value Errors**: MUI errors for "out-of-range" values, suggesting previously uploaded spreadsheet IDs aren't recognized by the backend.

4. **XLS File Type Rejection**: The backend is rejecting XLS files despite code indicating they should be acceptable.

5. **Uploaded Files Not Visible**: Uploaded XLSX files aren't visible in the expected location.

## Root Causes

Most likely causes in order of probability:

1. **Path Discrepancy**: Mismatch between where files are being saved and where they're expected to be found.

2. **API URL Configuration**: Frontend is attempting to call itself rather than the backend service.

3. **File Type Validation**: Issue with file extension detection or validation.

4. **Component State Management**: Frontend remembers IDs that no longer exist in backend.

## Troubleshooting Plan

### Phase 1: Fix API Endpoint Configuration (High Priority)

- [ ] **1.1** Examine the `getApiUrl` function in frontend config.js
- [ ] **1.2** Check API base URL in WorkbenchContext.js
- [ ] **1.3** Update the frontend configuration to properly point to backend service
- [ ] **1.4** Add more detailed error logging for API connection failures
- [ ] **1.5** Test whether the API becomes accessible after changes

### Phase 2: Resolve Metadata File Path Discrepancy (High Priority)

- [ ] **2.1** Add additional logging to backend showing full absolute paths:
  - [ ] **2.1.1** Log `BASE_DIR`, `WORKBENCH_DIR`, and `WORKBENCH_UPLOADS_DIR` as absolute paths
  - [ ] **2.1.2** Log the full path where metadata.json is being saved
  - [ ] **2.1.3** Log the full path when attempting to read metadata
- [ ] **2.2** Check if running in Docker and verify volume mounting configuration
- [ ] **2.3** Ensure upload directory is correctly shared between container and host
- [ ] **2.4** Update SpreadsheetManager to use consistent and accessible paths
- [ ] **2.5** Implement fallback mechanisms to detect and correct path mismatches

### Phase 3: Fix File Type Validation (Medium Priority)

- [ ] **3.1** Add logging in the file validation function to show:
  - [ ] **3.1.1** Original filename
  - [ ] **3.1.2** Detected file extension
  - [ ] **3.1.3** Valid extensions list
- [ ] **3.2** Check if case-sensitivity is causing validation failures
- [ ] **3.3** Update the `_is_valid_spreadsheet` method to be case-insensitive
- [ ] **3.4** Test uploading XLS, XLSX, and CSV files

### Phase 4: Handle Invalid Spreadsheet IDs (Medium Priority)

- [ ] **4.1** Add error handling for missing spreadsheets in SpreadsheetTools component
- [ ] **4.2** Implement mechanism to clear invalid selections on fetch failure
- [ ] **4.3** Add recovery logic to handle 404 responses gracefully
- [ ] **4.4** Test the component with empty metadata and after backend restarts

### Phase 5: Implement Data Persistence Strategy (Low Priority)

- [ ] **5.1** Consider using a database for metadata instead of JSON file
- [ ] **5.2** Add synchronization mechanism between filesystem and metadata
- [ ] **5.3** Implement automatic detection of files in upload directory
- [ ] **5.4** Add periodic metadata integrity checks

## Implementation Approach

For each issue:
1. Diagnose with additional logging
2. Implement the fix
3. Test to verify the solution
4. Document findings and changes

## Testing Verification Checklist

- [ ] Backend starts up and correctly creates metadata file
- [ ] Frontend successfully connects to backend API
- [ ] Frontend displays uploaded spreadsheets
- [ ] XLS, XLSX, and CSV files can be uploaded
- [ ] Uploaded files persist and are visible after restart
- [ ] No MUI errors for invalid spreadsheet IDs
