# Report Builder - New Features Plan Q1 2024

## 1. Goal

To enhance the Report Builder with improved content handling for AI-generated "thinking" processes, robust Markdown table exporting, and PDF export capabilities.

## 2. Core Concepts

*   **Thinking Content Visibility:** Provide users with a way to view the AI's thought process (`<think_tags>`) within the report preview without it cluttering the main view or exports.
*   **Markdown Fidelity:** Ensure that structured content like tables is accurately represented in exported documents.
*   **Export Flexibility:** Offer users multiple export formats for their reports.

## 3. Feature Stories (Epics/High-Level Features)

*   **Enhanced Thinking Tag Handling:**
    *   As a user, I want AI-generated content within `<think_tags>` to be collapsed by default in the report preview, so the main content is easily readable.
    *   As a user, I want to be able to expand the collapsed `<think_tags>` content on click, so I can inspect the AI's thought process if needed.
    *   As a user, I want `<think_tags>` and their content to be excluded when I export the report (to any format), so the final document is clean.
*   **Improved Markdown Table Export:**
    *   As a user, when I export a report containing Markdown tables, I want the tables to be rendered correctly and legibly in the exported document (e.g., Word).
*   **PDF Export Functionality:**
    *   As a user, I want an option to export my final report as a PDF document, in addition to existing export formats.

## 4. High-Level Implementation Plan & Checklist

**Phase 1: Enhanced Thinking Tag Handling**

*User Stories & Tasks:*

*   **As a user, I want AI-generated content within `<think_tags>` to be collapsed by default in the report preview, so the main content is easily readable.**
    *   [x] **Content Processing (`ReportPreviewPanel.js`):** Modify the Markdown rendering logic to identify `<think_tags>`.
    *   [x] **Collapsible UI (`ReportPreviewPanel.js`):** Implement a UI mechanism (e.g., an HTML `<details>` tag) to show a placeholder or title for the thinking content, which expands to show the full content on user click.
    *   [x] **Default State (`ReportPreviewPanel.js`):** Ensure this UI is collapsed by default when the report preview is rendered.
    *   [x] **Styling (`ReportPreviewPanel.js`):** Style the collapsed and expanded states for clarity.
*   **As a user, I want to be able to expand the collapsed `<think_tags>` content on click, so I can inspect the AI's thought process if needed.**
    *   (Tasks for implementing the collapsible UI under the first user story directly address this.)
*   **As a user, I want `<think_tags>` and their content to be excluded when I export the report (to any format), so the final document is clean.**
    *   [x] **Clarify Tag Format (`report_builder_service`):** Confirm if the tags are `<thinking>...</thinking>`, `<think>...</think>`, or if both need to be supported. Update any existing filtering logic if necessary.
    *   [x] **Ensure No Export (`report_builder_service`):** Verify and ensure that the `generate_export_markdown` function (and any new export functions) correctly strips all variants of these thinking tags before generating the exportable content.

**Phase 2: Improved Markdown Table Export**

*User Stories & Tasks:*

*   **As a user, when I export a report containing Markdown tables, I want the tables to be rendered correctly and legibly in the exported document (e.g., Word).**
    *   [ ] **Investigation (`report_builder_service`):** Analyze the current Markdown to Word export process (likely involving `pandoc` or a similar library if that was chosen for Word export) to identify why tables are not rendering correctly.
    *   [ ] **Library Configuration/Update (`report_builder_service`):** Adjust the conversion library's settings, or update the library, to improve table handling. This might involve specifying Markdown extensions (e.g., `pipe_tables`, `grid_tables`) or custom Lua filters if using Pandoc.
    *   [ ] **Alternative Libraries (if needed) (`report_builder_service`):** If the current library is insufficient, research and integrate an alternative Python library for Markdown-to-Word conversion that has better table support.
    *   [ ] **Testing:** Create test reports with various complex Markdown tables.
    *   [ ] **Testing:** Verify that exported Word documents render these tables accurately.

**Phase 3: PDF Export Functionality**

*User Stories & Tasks:*

*   **As a user, I want an option to export my final report as a PDF document, in addition to existing export formats.**
    *   [ ] **Library Selection (`report_builder_service`):** Research and choose a suitable Python library for converting HTML or Markdown to PDF (e.g., WeasyPrint, ReportLab, or using Pandoc if it provides good results from Markdown/HTML).
        *   Consider dependencies, licensing, and ease of installation in the Docker container.
    *   [ ] **New API Endpoint (`report_builder_service`):** Create a new API endpoint (e.g., `/reports/{report_id}/export/pdf`).
    *   [ ] **Content Preparation (`report_builder_service`):** Reuse or adapt the `generate_export_markdown` logic to get the clean report content (without thinking tags).
    *   [ ] **Conversion Logic (`report_builder_service`):** Implement the conversion from Markdown/HTML to PDF using the chosen library.
    *   [ ] **Response Handling (`report_builder_service`):** Ensure the API endpoint returns the PDF file with appropriate `Content-Type` headers (e.g., `application/pdf`).
    *   [ ] **UI Element (`ReportDesignerPage.js` / `ReportPreviewPanel.js`):** Add a "Export to PDF" button/menu item to the export options.
    *   [ ] **API Call (Frontend):** Implement the frontend logic to call the new PDF export API endpoint.
    *   [ ] **File Download (Frontend):** Handle the API response to trigger a file download for the user.
    *   [ ] **Dockerfile/Dependencies:** Update `requirements.txt` with the new Python PDF library.
    *   [ ] **Dockerfile/Dependencies:** Update `Dockerfile` if the chosen library has system-level dependencies (e.g., for WeasyPrint).
    *   [ ] **Dockerfile/Dependencies:** Update `download_wheels.ps1` and `downloaded_wheels_list.txt` if necessary.
    *   [ ] **Testing:** Test PDF export with various report structures and content types.
    *   [ ] **Testing:** Verify PDF formatting, readability, and inclusion of all relevant content.

## 5. Open Questions & Discussion Points

*   **Thinking Tag Syntax:** Final confirmation needed on the exact syntax (`<thinking>` vs. `<think>`) and if both are required.
*   **Table Complexity:** What types of Markdown tables need to be supported for export (simple, multiline, with merged cells, etc.)? This will influence library choices for table export fixes.
*   **PDF Styling/Templating:** Will basic PDF conversion be sufficient, or is there a need for specific styling, headers/footers, or templates for PDF exports? This could significantly increase the complexity of the PDF export feature.
*   **Error Handling:** How should errors during PDF generation (e.g., library issues, content incompatibilities) be communicated to the user?

---

## 6. Key Context and Code Locations

Development of the features outlined in this plan will primarily involve components within the following directories and files:

*   **Report Builder Frontend:** `frontend/src/components/report_builder/`
    *   `ReportPreviewPanel.js`: For implementing the collapsible UI for `<think_tags>` and potentially adding PDF export options if export controls are managed here.
    *   `ReportDesignerPage.js`: For adding the "Export to PDF" button/menu item and handling the corresponding API call.
*   **Report Builder Backend:** `backend/report_builder_service/`
    *   `main.py` (or specific modules within `api/` or `services/` folders): For creating the new PDF export API endpoint (e.g., `/reports/{report_id}/export/pdf`).
    *   `services/export_service.py` (or equivalent logic if centralized): This is a likely location for:
        *   Modifying `generate_export_markdown` to strip thinking tags.
        *   Investigating and improving Markdown table to Word export (e.g., Pandoc integration).
        *   Implementing the Markdown/HTML to PDF conversion logic.
    *   `config.py`: If any new configuration related to PDF generation or table export libraries is needed.
*   **Report Builder Backend - Dependencies & Build:** `backend/report_builder_service/`
    *   `requirements.txt`: To add new Python libraries for PDF generation (e.g., WeasyPrint, ReportLab) or improved Markdown table handling.
    *   `Dockerfile`: To add any system-level dependencies required by the chosen PDF library (e.g., Pango, Cairo for WeasyPrint).
    *   `download_wheels.ps1`: To update with new dependencies for pre-downloading Python wheels.
    *   `downloaded_wheels_list.txt`: To list the newly added pre-downloaded wheels.
*   **Testing Data (Illustrative):**
    *   Sample report definition files (e.g., in `backend/report_builder_service/data/` or a dedicated test data directory) containing various Markdown tables and `<think_tags>` will be crucial for testing.

This plan provides a starting point. Further details can be added as each phase is approached. 