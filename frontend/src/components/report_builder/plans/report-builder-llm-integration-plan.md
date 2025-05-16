# Report Builder - LLM Integration Plan

## 1. Goal

This document outlines the plan for integrating MAGE's Large Language Model (LLM) capabilities into the Report Builder feature. The primary focus is on defining how the LLM will be tasked to generate content for specific report sections ("Generative Sections"), leveraging patterns and mechanisms similar to those used in the MAGE Direct Chat feature. This plan builds upon the foundation laid out in `report-builder-backend-plan.md`, particularly Phase 3.

## 2. Core Concept: LLM-Powered Section Generation

The Report Builder allows users to define reports composed of different sections (`ReportElement`). Sections can be of type "Explicit" (user-defined static content) or "Generative". For "Generative" sections, the user provides instructions, and the system leverages an LLM, contextual information from a linked vector store, and the preceding report content to generate the section's Markdown content.

## 3. Parallels with Direct Chat Tasking

The LLM tasking process in the Report Builder aims to mirror the interaction model of the `DirectChat` component for consistency and leveraging existing MAGE infrastructure where applicable:

| Feature Element       | Report Builder (`report_builder_service`)                  | Direct Chat (`direct_chat_service`)                      | Analogy                                    |
| :-------------------- | :--------------------------------------------------------- | :------------------------------------------------------- | :----------------------------------------- |
| **User Directive**    | `ReportElement.instructions` for a "Generative" section    | User's text message input                              | The core request/task for the LLM.         |
| **External Knowledge** | Data retrieved from the linked `Report.vectorStoreId`      | Data retrieved from selected Knowledge Sources (vector stores) | Providing domain-specific context.         |
| **Session Context**   | Content of previously generated sections in the *current* report | History of the current chat conversation                 | Maintaining coherence and flow.            |
| **Orchestrator**      | `report_builder_service`                                   | `direct_chat_service`                                    | Service responsible for preparing the call. |
| **LLM Interaction**   | Call to MAGE `Generation Service` (or similar endpoint)    | Call to LLM backend (e.g., `vllm_chat.py` endpoint)      | Executing the LLM generation task.       |
| **System Guidance**   | Pre-defined system prompts specific to report section generation | System prompts defining the chatbot's persona/role       | Setting overall behavior for the LLM.    |

## 4. Phased Implementation Plan

### Phase 1: Foundational LLM Connection

**Goal:** Establish the basic communication pathway between `report_builder_service` and the `Generation Service` for a single generative section, without complex context, and ensure generated content is saved.

**User Stories & Tasks:**

*   **As a Backend Developer, I want `report_builder_service` to identify a "Generative" section and prepare a basic prompt containing system instructions and user instructions.**
    *   [x] Task: Implement logic in the `/generate` endpoint to iterate through sections.
    *   [x] Task: Define standard system instructions for report section generation.
*   **As a Backend Developer, I want `report_builder_service` to successfully call a designated MAGE `Generation Service` endpoint with the basic prompt.**
    *   [x] Task: Finalize the choice of the target MAGE service/endpoint for generation (Confirm if a generic `Generation Service` exists or if `direct_chat_service`/`vllm_chat.py` needs adaptation/direct use).
    *   [x] Task: Define the *initial* basic API contract (endpoint, method, minimal request/response) between `report_builder_service` and the chosen Generation Service.
    *   [x] Task: Implement the API call from `report_builder_service`.
*   **As a Backend Developer, I want `report_builder_service` to receive the LLM's response from the `Generation Service` and integrate it into the report structure.**
    *   [x] Task: Implement logic to place the received `generated_text` into the corresponding `ReportElement.content`.
    *   [x] Task: Implement the assembly of the final report Markdown from all sections (mixing explicit and basic generated content).
*   **As a Backend Developer, I want to ensure that the generated content for "Generative" sections is saved persistently (in `reports_data.json`) along with the report definition so that users can view and edit previously generated reports.**
    *   [x] Task: Verify/Update Pydantic models (`ReportElement`, `Report`) to confirm `content` is persisted for all section types.
    *   [x] Task: Verify/Update `save_reports_to_file` and `load_reports_from_file` logic to correctly handle storing and retrieving generated `content` for "Generative" sections.

### Phase 2: Frontend Display & Export Refinement

**Goal:** Update the frontend report preview to clearly differentiate user instructions from AI-generated content for "Generative" sections. Also, to ensure that the final exported report is clean, containing only the specified content (explicit content or AI-generated content) without any instructional text or UI labels.

**User Stories & Tasks:**

*   **As a User, when viewing a report in the preview panel, I want to see my specific instructions for "Generative" sections clearly displayed, followed by the AI's output, so I can easily compare the request with the result.**
    *   [x] Task (Frontend): Modify the `ReportPreviewPanel.js` component (or equivalent) to iterate through report elements.
    *   [x] Task (Frontend): For "Generative" elements, display a section like:
        *   "Instructions for MAGE: `element.instructions`"
        *   "Output from MAGE: `element.ai_generated_content`" (if available).
    *   [x] Task (Frontend): For "Explicit" elements, display `element.content` as usual.
    *   [x] Task (Frontend): If `element.ai_generated_content` is not yet available for a "Generative" section (or if generation failed), clearly indicate this in the preview (e.g., show only "Instructions for MAGE: `element.instructions`" and a message like "[AI content not yet generated]").
*   **As a User, I want the final exported report (e.g., Word document) to contain *only* the actual content of the sections, meaning `element.content` for "Explicit" sections and `element.ai_generated_content` for "Generative" sections, without any "Instructions for MAGE" or "Output from MAGE" labels or the instructions themselves.**
    *   [x] Task (Backend/Verification): Verify that the existing export functionality (e.g., the `/export/word` endpoint in `main.py` which uses the `markdown_content` from `generate_report` or a cached file) correctly assembles the report using only `element.ai_generated_content` for "Generative" sections and `element.content` for "Explicit" sections. (Current backend logic for `generate_report` already produces a fairly clean `markdown_content`, so this might primarily be a confirmation task or minor adjustment if needed).
    *   [x] Task (Backend/Verification): Ensure report titles and descriptions are included in the export as appropriate, but not the instructional scaffolding for generative sections.

### Phase 3: Context-Aware Generation

**Goal:** Enhance the generation process by incorporating context from both the linked vector store and preceding report sections.

**User Stories & Tasks:**

*   **As a Backend Developer, I want the `Generation Service` (or its delegate like `embedding_service`) to retrieve relevant context from the specified `vectorStoreId` based on the user instructions.**
    *   [x] Task: Update the API contract to include `vector_store_id`.
    *   [x] Task: Implement the context retrieval logic within the Generation Service (or coordinate with `embedding_service`), using `vectorStoreId` and `user_instructions` to perform similarity search.
*   **As a Backend Developer, I want the `Generation Service` to incorporate the retrieved vector store context into the final prompt sent to the LLM.**
    *   [x] Task: Implement prompt assembly logic within the Generation Service to combine system prompt, user instructions, retrieved context, and (later) preceding context.
*   **As a Backend Developer, I want `report_builder_service` to gather preceding report content (up to a defined limit) and pass it to the `Generation Service`.**
    *   [x] Task: Develop a strategy for managing context length (e.g., last N sections, token count limit, summarization).
    *   [x] Task: Implement the logic in `report_builder_service` to collect the appropriate preceding content.
    *   [x] Task: Update the API contract to include `preceding_context`.
*   **As a Backend Developer, I want the `Generation Service` to include the preceding report context in the final LLM prompt.**
    *   [x] Task: Update the prompt assembly logic in the Generation Service to include the `preceding_context`. (Implemented enhanced preceding context handling with structured guidance for the LLM based on context length and explicit context-aware flag in the generation config.)

### Phase 4: UI Generation Controls

**Goal:** Provide intuitive UI components for users to trigger generation of entire reports or individual sections, with appropriate feedback and progress indicators.

**User Stories & Tasks:**

*   **As a User, I want a prominent "Generate Report" button in the report builder to trigger AI generation for all generative sections.**
    *   [x] Task: Add a "Generate Report" button to the ReportDesignerPage toolbar, adjacent to the "Export" button.
    *   [x] Task: Implement frontend API call to the existing `/api/report_builder/reports/{report_id}/generate` endpoint.
    *   [x] Task: Add loading indicators and success/error notifications for the generation process.
    *   [x] Task: Update the report preview to reflect newly generated content automatically.
    *   [ ] Task: Ensure the report preview updates to display AI-generated content for each section incrementally as it is completed when using the main "Generate Report" button, effectively utilizing the real-time update mechanisms (detailed in User Story 2 of Phase 4).

*   **As a User, I want to see the generation process happening incrementally, with visual feedback as each section is completed.**
    *   [x] Task: Implement a progress indicator showing which section is currently being generated.
    *   [x] Task: Add visual indicators (e.g., spinners) for sections awaiting generation.
    *   [x] Task: Update the UI in real-time as each section's content is received.
    *   [x] Task: Implement WebSocket or polling mechanism to receive incremental updates during generation.

*   **As a User, I want to generate or regenerate individual sections without regenerating the entire report.**
    *   [x] Task: Add a "Generate" button for each generative section that hasn't been generated yet. (Note: Implemented in the ReportConfigPanel instead of ReportPreviewPanel)
    *   [x] Task: Add a "Regenerate" button for each already-generated section. (Note: Implemented in the ReportConfigPanel instead of ReportPreviewPanel)
    *   [x] Task: Implement frontend API call to the section-specific regeneration endpoint.
    *   [x] Task: Ensure section generation/regeneration properly displays loading state and results.

*   **As a User, I want section regeneration to take into account the entire report context, maintaining consistency with other sections.**
    *   [x] Task: When calling section regeneration, send the full report context to maintain consistency.
    *   [x] Task: Update the backend regenerate_section endpoint to process both preceding and subsequent sections for context.
    *   [x] Task: Add visual indication that regenerated content is designed to be consistent with existing content.

*   **As a User, I want to see the status of AI-generated sections clearly in the UI.**
    *   [ ] Task (DEFERRED): Implement visual indicators for different states: not generated, generation in progress, successfully generated, and generation failed.
    *   [ ] Task (DEFERRED): Add tooltips explaining the current state of each section.
    *   [ ] Task (DEFERRED): For failed generations, provide error information and retry options.

*   **As a User, I want the option to regenerate the entire report from scratch if I've made significant changes.**
    *   [ ] Task (DEFERRED): Add a "Regenerate All" option (potentially in a dropdown menu).
    *   [ ] Task (DEFERRED): Implement confirmation dialog explaining that all AI-generated content will be replaced.
    *   [ ] Task (DEFERRED): Add a force_regenerate flag to the generate report API call.
    *   [ ] Task (DEFERRED): Ensure the UI updates completely after regeneration.

### Phase 5: Robustness and Configuration

**Goal:** Ensure the integration is reliable, handles errors gracefully, is properly configured, and supports enhanced user interactions like section regeneration.

**User Stories & Tasks:**

*   **As a Backend Developer, I want comprehensive error handling implemented in `report_builder_service` for the entire generation workflow.**
    *   [x] Task: Implement try-catch blocks around the API call to the Generation Service.
    *   [x] Task: Handle potential errors during context gathering.
    *   [x] Task: Handle timeouts and non-2xx responses from the Generation Service.
*   **As a Backend Developer, I want informative error messages propagated back to the frontend when generation fails.**
    *   [x] Task: Define standard error responses for generation failures.
    *   [x] Task: Ensure `report_builder_service` returns appropriate HTTP status codes and error details in the response body.
*   **As a User, I want to trigger regeneration for a specific AI-generated section so I can get a different version based on the current report context (including any edits I've made).**
    *   [x] Task: Define a new API endpoint (e.g., `POST /api/report_builder/reports/{report_id}/sections/{section_index_or_id}/regenerate`). (Addressed by modifying existing `POST /api/report_builder/reports/{report_id}/sections/{element_id}/regenerate` to accept full report context)
    *   [x] Task: Implement frontend UI element (e.g., "Regenerate" button) for generated sections. (Existing UI in ReportConfigPanel suitable)
    *   [x] Task: Implement frontend logic to send the *current* report state (or relevant parts) and trigger the regeneration API call. (Updated handleRegenerateSection in ReportDesignerPage.js)
    *   [x] Task: Implement backend logic for the `regenerate_section` endpoint:
        *   [x] Accept current report context (potentially the full edited Markdown).
        *   [x] Identify the target section and its original `instructions`.
        *   [x] Gather preceding context based on the *provided current state*.
        *   [x] Call the Generation Service with instructions, current context, and `vectorStoreId`.
        *   [x] Return the newly generated content for *only* the requested section.
    *   [x] Task: Implement frontend logic to update the specific section's content upon successful regeneration. (Handled by existing WebSocket updates and response processing in ReportDesignerPage.js)
*   **As a Backend Developer, I want the necessary configuration (e.g., `Generation Service` URL) added to `report_builder_service` and managed appropriately.**
    *   [x] Task: Add configuration settings (e.g., in `config.py` or environment variables) for the Generation Service endpoint URL. (Verified `VLLM_CHAT_COMPLETIONS_URL` in `config.py` already fulfills this requirement)
*   **As a Backend Developer, I want the full API contract, including authentication/authorization, finalized and documented.**
    *   [x] Task: Define and document the final, stable API contract (see Section 5) incorporating all fields (`system_prompt`, `user_instructions`, `preceding_context`, `vector_store_id`, `generation_config`). (Updated Section 5 of the plan to reflect the actual call to the LLM endpoint)
    *   [x] Task: Clarify and implement authentication/authorization mechanisms for the API endpoint. (Added optional VLLM_API_KEY to config and its usage in generation_service.py)

### Phase 6: Enhanced User Experience and Error Handling

**Goal:** Improve the user experience with more detailed error feedback and enhance the visual display of real-time AI-generated content.

**User Stories & Tasks:**

*   **As a User, I want to see AI-generated content appear in the report preview in real-time as each section is completed.**
    *   [x] Task: Ensure the report preview updates to display AI-generated content for each section incrementally as it is completed when using the main "Generate Report" button, effectively utilizing the real-time update mechanisms (detailed in User Story 2 of Phase 4). (Consider referencing `Wargame Builder` frontend components like `ExecutionChecklist.js` for dynamic UI update patterns and `Wargame Service` backend for WebSocket/event handling examples).
    *   [x] Task: Implement smooth scrolling to newly generated sections as they complete. (Dynamic UI updates in `Wargame Builder` might offer inspiration for handling view changes gracefully).
    *   [x] Task: Add visual indicators to highlight newly added content in the preview. (Refer to `Wargame Builder` for examples of visual cues in dynamic UIs).

*   **As a User, I want clear feedback and recovery options when AI generation fails.**
    *   [ ] Task: For failed generations, provide detailed error information and retry options.
    *   [ ] Task: Implement a dedicated error panel that shows specific error messages.
    *   [ ] Task: Add a "Retry" button that appears directly next to failed generations.
    *   [ ] Task: Include troubleshooting hints based on common error types (e.g., "Try simplifying your instructions").

*   **As a User, I want to see AI-generated text appear in real-time as it's being created, similar to a typing effect.**
    *   [ ] Task: Implement a streaming mechanism for receiving partial generation results. (The `Wargame Service` backend's WebSocket communication and event handling patterns are highly relevant here; `Wargame Builder` frontend for real-time data display).
    *   [ ] Task: Update the UI to display text characters sequentially as they're received. (Leverage dynamic UI update patterns from `Wargame Builder`).
    *   [ ] Task: Add visual cues (like a cursor or highlight) to indicate active text generation. (Consider visual cues used in `Wargame Builder` for active processes).
    *   [ ] Task: Ensure the incremental text updates work for both whole-report and individual section generation. (Real-time state synchronization examples from `Wargame Service` and `Wargame Builder` can be useful).

*   **As a User, I want a more interactive and visual indication of the generation process status.**
    *   [ ] Task: Add a progress visualization that shows both completed and pending sections. (Components like `Wargame Builder`'s `ExecutionChecklist.js` can serve as a model for such visualizations).
    *   [ ] Task: Implement animated transitions between generation states. (Refer to `Wargame Builder`'s dynamic UI updates for animation patterns).
    *   [ ] Task: Add success/failure icons that are visible at a glance for each section. (Similar to status indicators in `Wargame Builder`'s `ExecutionChecklist.js`).

## 5. API Considerations (`report_builder_service` -> LLM Service)

This section describes the API call made by the `report_builder_service` (specifically the `services.generation_service.generate_element_content` function) to the configured LLM service endpoint (e.g., a VLLM instance or an OpenAI-compatible API).

*   **Endpoint URL:** Configured via `VLLM_CHAT_COMPLETIONS_URL` in `config.py` (typically loaded from environment variables).
*   **Method:** `POST`
*   **Request Body (Example - OpenAI Chat Completions Format):**
    ```json
    {
      "model": "string", // e.g., VLLM_MODEL_NAME from config.py
      "messages": [
        {
          "role": "system",
          "content": "string" // REPORT_SECTION_SYSTEM_PROMPT from config.py
        },
        {
          "role": "user",
          "content": "string" 
          // This user content is dynamically constructed by generate_element_content.
          // It includes:
          // 1. User-provided instructions (from ReportElement.instructions).
          // 2. Contextual information retrieved from the vector store (if vectorStoreId is provided and data is found).
          // 3. Content of preceding report sections (markdown).
          // 4. For section regeneration, it may also include report overview metadata (title, description).
        }
      ],
      "max_tokens": "integer",   // e.g., VLLM_MAX_TOKENS from config.py
      "temperature": "number", // e.g., VLLM_TEMPERATURE from config.py
      // Other OpenAI-compatible parameters like top_p, stop sequences can be added if needed.
    }
    ```
*   **Key Data Elements Prepared by `report_builder_service` for the `user` message content:**
    *   `system_prompt`: Standardized, defined as `REPORT_SECTION_SYSTEM_PROMPT`.
    *   `user_instructions`: From `ReportElement.instructions`.
    *   `preceding_context`: Markdown from previous sections, managed for token limits.
    *   `vector_store_id`: Used by `report_builder_service` to query the `EMBEDDING_SERVICE_BASE_URL` to fetch relevant context, which is then embedded into the user prompt. The ID itself is not sent to the LLM service.
    *   `report_metadata`: For section regeneration, report name and description are prepended to the context.
*   **Response Body (Success - Example from OpenAI Chat Completions):**
    ```json
    {
      "id": "chatcmpl-...",
      "object": "chat.completion",
      "created": 1677652288,
      "model": "...", 
      "choices": [{
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "string" // Generated Markdown content for the section
        },
        "finish_reason": "stop"
      }],
      "usage": {
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "total_tokens": 0
      }
    }
    ```
    The `report_builder_service` extracts `choices[0].message.content`.
*   **Response Body (Error):** The `report_builder_service` expects HTTP errors from the LLM service (e.g., 4xx, 5xx). It handles these and translates them into its own error responses (see `ErrorCodes` in `models/schemas.py` and error handling in `api/generation.py`).

## 6. Open Questions

*   Should the Generation Service perform the vector store query, or should `report_builder_service` do it and pass the results? (Current plan: Generation Service does it).
*   What is the optimal strategy for including preceding report context within token limits? (Needs decision in Phase 2).
*   How are errors from the vector store search surfaced back through the Generation Service to the `report_builder_service`? (Needs clarification in Phase 3 error handling).

## 7. Key Context and Code Locations

Development of the features outlined in this plan will primarily involve components within the following directories:

*   **Report Builder Frontend:** `frontend/src/components/report_builder/`
    *   Contains UI components like `ReportDesignerPage.js`, `ReportConfigPanel.js`, `ReportPreviewPanel.js`.
    *   Will require updates for triggering generation/regeneration and displaying results.
*   **Report Builder Backend:** `backend/report_builder_service/`
    *   Contains the core logic (`main.py`) for managing report definitions, handling API requests (`/generate`, `/regenerate_section`), orchestrating calls to the Generation Service, and interacting with data storage.
*   **Report Builder Data:** `backend/report_builder_service/data/` (or wherever `reports_data.json` is stored)
    *   Location of persisted report definitions, including generated content.
*   **Direct Chat Frontend:** `frontend/src/components/direct_chat/`
    *   Reference for UI patterns related to LLM interaction (e.g., `DirectChat.js`).
*   **Direct Chat Backend:** `backend/direct_chat_service/`
    *   Reference for backend patterns related to LLM tasking (`app.py`), prompt construction, context management, and interaction with LLM services (`vllm_chat.py`).
*   **Generation Service / LLM Endpoint:** TBD (e.g., could be within `direct_chat_service`, a dedicated `generation_service`, or another MAGE component)
    *   The service responsible for receiving prompts, retrieving vector context, interacting with the base LLM, and returning generated text.
*   **Embedding Service:** `backend/embedding_service/` (Potentially)
    *   May be involved indirectly if the Generation Service delegates vector store querying.
*   **Wargame Builder Frontend:** `frontend/src/components/wargame_builder/`
    *   Reference for UI patterns related to real-time updates and interactive visualization.
    *   Components like `ExecutionChecklist.js`, `RelationshipMatrix.js`, and `WargameMap.js` demonstrate effective approaches to dynamic UI updates.
*   **Wargame Service Backend:** `backend/wargame_service/`
    *   Reference for backend patterns related to WebSocket communication and event handling.
    *   Can provide examples of handling real-time state synchronization between client and server.

This phased plan provides a structured approach for integrating LLM assistance into the Report Builder, ensuring consistency with existing MAGE patterns like Direct Chat and allowing for incremental development and testing. 