# Visualization Component Upgrade Plan

## Frontend (`ChartBuilder.js`)

1.  **Parameter Integration/Removal:**
    *   **Observation:** The "Chart Type", "Style", and "Color Palette" dropdowns are collected in the UI but their values are not explicitly used by the backend's LLM code generation logic (`core/visualization/generation.py`). Generation relies solely on the natural language prompt.
    *   **Action:** Decide whether to:
        - [ ] a) Modify the backend (`generation.py`) to incorporate these selected parameters into the LLM prompt or processing logic.
        - [ ] b) Remove the "Chart Type", "Style", and "Color Palette" UI elements if relying only on the natural language prompt is the intended design.

2.  **Code Editing & Re-running:**
    *   **Observation:** The UI allows editing the generated Python code and re-running it using the "Run Code" button, which calls the `/execute` backend endpoint.
    *   **Action (Frontend - `ChartBuilder.js`, `WorkbenchContext.js`):**
        - [ ] Verify `visualizationCode` state is correctly updated on user edits in `CodeEditor`.
        - [ ] Verify `handleRunCode` reads the *latest* edited `visualizationCode` from state.
        - [ ] Verify `handleRunCode` correctly uses the `visualization_id` from the initial generation result (`codeResult.data.id`).
        - [ ] Implement a distinct loading state for the "Run Code" button (separate from initial generation loading).
        - [ ] Enhance error handling in `handleRunCode` to display specific backend errors from the `/execute` call if user code fails.
    *   **Action (Backend - `api/visualization.py`, Storage):**
        - [ ] Implement persistent storage for visualization metadata (e.g., create `visualizations_store.json` or similar).
        - [ ] Modify `POST /api/workbench/visualizations/generate` (or its calling logic) to save metadata (ID, spreadsheet ID, prompt, title, etc.) upon successful generation.
        - [ ] Modify `POST /api/workbench/visualizations/{visualization_id}/execute` to read the stored metadata using `visualization_id`.
        - [ ] Modify `POST /api/workbench/visualizations/{visualization_id}/execute` to return the *actual* stored metadata (spreadsheet ID, prompt, title) in the response, not placeholders.

3.  **Layout Refactoring:**
    *   **Observation:** The Code Editor and Visualization Preview are currently in separate Tabs on the right panel.
    *   **Action:**
        - [X] Refactor the right panel layout in `ChartBuilder.js`. Remove the Tabs and display the Code Editor container and the Visualization Preview container simultaneously (e.g., vertically stacked) for easier comparison and iteration.

## Backend (`api/visualization.py`)

1.  **`/execute` Endpoint Response (Covered in Frontend Item 2 - Backend Actions)**
    *   ~~**Observation:** The `/api/workbench/visualizations/{visualization_id}/execute` endpoint currently returns hardcoded placeholder values for `spreadsheet_id` and `prompt` in its response.~~
    *   ~~**Action:** Modify the endpoint to retrieve and return the *actual* `spreadsheet_id` and `prompt` associated with the `visualization_id`. This likely requires implementing persistent storage for visualization metadata (potentially linking it to the generation job or creating a separate store).~~
