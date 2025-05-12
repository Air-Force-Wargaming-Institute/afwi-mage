# Report Builder - Backend Implementation Plan

This plan focuses on the backend development for the Report Builder feature, building upon the initial `report-builder-plan.md`.

## Phase 1: Core Report Definition Service & Storage

**Goal:** Establish the foundational backend service for managing report definitions, including persistent storage and basic CRUD operations. Align backend data models with frontend needs.

**User Stories & Tasks:**

*   **As a Backend Developer, I want to set up a new FastAPI project for `report_builder_service` so that I have a dedicated environment for report builder logic.**
    *   [X] Task: Initialize a new FastAPI application within the `backend/report_builder_service` directory.
    *   [X] Task: Ensure basic configuration for port, logging, and environment variables is in place.
*   **As a Backend Developer, I want to define Pydantic models that accurately represent the frontend's report definition structure so that data can be exchanged reliably.**
    *   [X] Task: Review `ReportConfigPanel.js` and `reportTemplates.js` to understand the full structure of `ReportElement` (including `type: 'explicit'|'generative'`, `format`, `title`, `content`, `instructions`).
    *   [X] Task: Update `ReportElement` and `ReportContent` Pydantic models in `report_builder_service/main.py` to match this detailed structure.
    *   [X] Task: Ensure `ReportCreate` and `Report` models correctly use these updated content structures.
*   **As a Backend Developer, I want to replace the in-memory `fake_reports_db` with persistent storage using a JSON file so that report definitions are saved between service restarts.**
    *   [X] Task: Define a file path for storing report data (e.g., `reports_data.json`) within the `report_builder_service`.
    *   [X] Task: Implement helper functions to `load_reports_from_file` (parsing JSON into Pydantic models) and `save_reports_to_file` (serializing Pydantic models to JSON).
    *   [X] Task: Modify CRUD endpoints (`/api/report_builder/reports`) to use these helper functions for loading data at startup and saving data after modifications.
    *   [ ] (Deferred) Task: Design a database schema for storing report definitions and their elements.
    *   [ ] (Deferred) Task: Integrate SQLAlchemy or a similar ORM to interact with the PostgreSQL database.
    *   [ ] (Deferred) Task: Ensure the `report_builder_service` in `docker-compose.yml` correctly connects to its own dedicated PostgreSQL database instance or schema.
*   **As a Backend Developer, I want to ensure the existing CRUD API endpoints (`POST`, `GET`, `PUT`, `DELETE` for `/api/report_builder/reports`) correctly handle the detailed report definition structure with JSON file persistence so that the frontend can save and load full reports.**
    *   [X] Task: Test `POST /api/report_builder/reports` with a detailed report definition from the frontend (simulating a save from `ReportDesignerPage.js`), ensuring `reports_data.json` is updated.
    *   [X] Task: Test `GET /api/report_builder/reports` to ensure it retrieves a list of all reports, suitable for the frontend's "Prior Reports" list.
    *   [X] Task: Test `GET /api/report_builder/reports/{report_id}` to ensure it retrieves the full, detailed structure.
    *   [X] Task: Test `PUT /api/report_builder/reports/{report_id}` to ensure it can update a report with a new detailed structure.
    *   [X] Task: Test `DELETE /api/report_builder/reports/{report_id}`.

## Phase 2: Vector Store Integration & Basic Generation Placeholder

**Goal:** Enable linking reports to vector stores and lay the groundwork for AI generation by creating a placeholder generation endpoint.

**User Stories & Tasks:**

*   **As a Backend Developer, I want to implement an API endpoint to list available vector stores so the frontend `ReportConfigPanel.js` can populate its dropdown dynamically.**
    *   [X] Task: Determine how vector stores are identified and accessed globally in the MAGE system (e.g., from `core_service` or another central registry).
    *   [X] Task: Create `GET /api/report_builder/vector_stores` endpoint that fetches and returns a list of available vector stores (ID and name).
*   **As a Backend Developer, I want to modify the report definition model and storage to include a `vectorStoreId` so that reports can be linked to a specific vector store.**
    *   [X] Task: Ensure the `Report` Pydantic model and database schema include `vectorStoreId`. (Confirmed for Pydantic model and JSON file storage; DB schema for later phase).
    *   [X] Task: Update CRUD operations to save and retrieve this `vectorStoreId`. (Confirmed existing CRUD operations support this for JSON file storage).
*   **As a Backend Developer, I want to create a placeholder report generation endpoint so the frontend can initiate a generation process, even if full AI integration is pending.**
    *   [X] Task: Create `POST /api/report_builder/reports/{report_id}/generate` endpoint.
    *   [X] Task: For now, this endpoint should load the specified report definition.
    *   [X] Task: It should iterate through "generative" elements and return a mock response (e.g., "AI content for instructions: [instructions] using vector store: [vectorStoreId]").
    *   [X] Task: The response should be the complete report Markdown, with explicit sections preserved and mock content for generative ones.

## Phase 3: MAGE Integration for Report Generation

**Goal:** Integrate with the MAGE LLM service to generate content for "AI Gen" sections.

**User Stories & Tasks:**

*   **As a Backend Developer, I want the `report_builder_service` to communicate with MAGE (LLM Service) to generate content for a single "generative" report element.**
    *   [X] Task: Identify the MAGE service endpoint and API contract for text generation.
    *   [X] Task: In the `/api/report_builder/reports/{report_id}/generate` endpoint (or a new, more granular one if preferred, e.g., `/generate_section`), for each "generative" element:
        *   [X] Task: Construct a prompt for MAGE, including the element's `instructions`.
        *   [X] Task: If a `vectorStoreId` is linked to the report, retrieve relevant context/data from that vector store (details of vector store querying TBD, may involve another service call).
        *   [X] Task: Include previously generated report content (if any, and as per context window strategy) in the prompt.
        *   [X] Task: Call the MAGE service with the complete prompt.
*   **As a Backend Developer, I want the `/generate` endpoint to assemble the full report Markdown, incorporating MAGE-generated content for "generative" sections and user-defined content for "explicit" sections.**
    *   [X] Task: Iterate through all report elements. For "explicit" elements, format their content as Markdown. For "generative" elements, use the content returned by MAGE.
    *   [X] Task: Return the complete assembled Markdown string as the API response.
*   **As a Backend Developer, I want to implement robust error handling for the generation process, including MAGE service errors or vector store access issues.**
    *   [X] Task: Implement try-catch blocks for external service calls.
    *   [X] Task: Return informative error messages to the frontend if generation fails.

## Phase 4: Templates and Export Functionality

**Goal:** Implement backend support for report templates and exporting reports to Word.

**User Stories & Tasks:**

*   **As a Backend Developer, I want to define and manage report templates on the backend so they can be served to the frontend.**
    *   [X] Task: Decide on a storage mechanism for templates (e.g., predefined JSON files within the service, or a database table).
    *   [X] Task: Create `GET /api/report_builder/templates` endpoint to list available templates (name, description, ID).
    *   [X] Task: Create `GET /api/report_builder/templates/{template_id}` endpoint to retrieve a specific template's full structure.
    *   [ ] Task: (Frontend will need to adapt `ReportBuilderMain.js` to fetch these instead of using `reportTemplates.js` directly).
*   **As a Backend Developer, I want to implement an API endpoint to convert the generated Markdown report into a Microsoft Word document.**
    *   [X] Task: Research and choose a suitable library for Markdown to Word conversion (e.g., Pandoc, python-docx).
    *   [X] Task: Create `GET /api/report_builder/reports/{report_id}/export/word` endpoint.
    *   [X] Task: This endpoint should:
        *   [X] Task: Load the report definition.
        *   [X] Task: If the report hasn't been generated yet, or if a "force regenerate" option is implied, trigger the generation process (from Phase 3).
        *   [X] Task: Take the final Markdown content.
        *   [X] Task: Convert it to a .docx file.
        *   [X] Task: Return the .docx file as a downloadable response (setting appropriate `Content-Disposition` and `Content-Type` headers).

## Future Considerations (Post-MVP):

*   **Real-time/Streaming Generation:** Investigate streaming generated content section by section to the frontend for a more responsive live preview.
*   **Advanced Vector Store Querying:** Allow users to provide specific query hints or parameters per generative section.
*   **Context Management:** Refine the strategy for how much prior report content is passed as context to MAGE.
*   **Reconciling Direct Edits:** Develop a more sophisticated approach for the `PUT /api/report_builder/reports/{report_id}` endpoint to intelligently merge direct Markdown edits from `ReportPreviewPanel.js` back into the structured report definition, preserving element types and instructions where possible. This is a complex task and might involve Markdown parsing and diffing.
*   **Collaboration/Versioning:** If multiple users might work on reports, or if version history is needed.
*   **Permissions & Authorization:** Granular control over who can access/edit reports or use specific vector stores.

This backend plan aims to incrementally build the necessary features, starting with the core data management and progressively adding AI integration and other functionalities. 