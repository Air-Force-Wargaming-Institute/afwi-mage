# Wargame Builder Feature Plan

## 1. Overview & Goals
   - **Description:** Implement a feature allowing users to create, configure, run, and analyze autonomous wargame simulations within MAGE.
   - **Primary Goals:**
     - Enable users to define complex geopolitical scenarios involving multiple nations/organizations.
     - Allow detailed configuration of national postures using the DIME (Diplomacy, Information, Military, Economic) framework.
     - Facilitate connections to existing MAGE data resources for grounding simulations.
     - Run multiple simulation iterations with system-driven adjudication and scenario variation.
     - Generate actionable insights and reports based on user-defined research objectives.
     - Provide an intuitive and guided user experience for complex configuration tasks.

## 2. User Stories
   - As a user, I want to access a dedicated section for creating and managing Wargame Builds.
   - As a user, I want to create a new Wargame Build providing an initial name and description.
   - As a user, I want to define the narrative context ("Road to War"), primary research questions, and the desired number of simulation runs for my Wargame Build.
   - As a user, I want to visually select nations and pre-defined organizations (like NATO) on an interactive world map to include them in my wargame.
   - As a user, for each activated nation/organization, I want to configure its detailed DIME posture, strategic objectives, and specific capabilities/resources.
   - As a user, I want to define the relationships (alliances, partnerships, rivalries) between activated entities and characterize the nature of these relationships.
   - As a user, I want to link relevant data sources or documents from the MAGE retrieval system to specific nations or DIME components to inform agent behavior.
   - As a user, I want to initiate the wargame simulation, triggering the system to run the configured number of iterations.
   - As a user, I expect the system's adjudication agents to intelligently vary scenario parameters across iterations and evaluate agent actions to generate insights relevant to my research objectives.
   - As a user, I want to access comprehensive results after the simulation, including narrative reports from agents, structured data, analysis summaries, and visualizations comparing outcomes across iterations, specifically addressing my research objectives.
   - As a user, I want clear feedback on the configuration status of each nation/organization.
   - As a user, I want my progress during the configuration process to be saved automatically or easily savable to prevent data loss.
   - As a user, I may want to use or adapt pre-defined templates for common nation/organization postures to speed up configuration.
   - As a user, I want the ability to disable specific DIME configuration fields for an entity if they are not relevant (e.g., disable naval configuration for a landlocked nation).
   - As a user, I want tooltips explaining the purpose of each DIME field and the types of agents that might use that information.

## 3. UI/UX Design
   - **Navigation:** Add "Wargame Builder" item to the "Build Agents and Teams" side menu (`SideMenu.js` or similar).
   - **Wargames List Page (`WargamesListPage.js`):**
     - Displays existing Wargame Builds (using Material UI `Card` components).
     - "Create New Wargame" button.
     - Edit/Duplicate/Delete actions per card.
     - Clicking a card navigates to/opens the editor.
   - **Create Wargame Modal (`CreateWargameModal.js`):**
     - Input fields: `name` (required), `description` (optional).
     - On submit: Creates the build (currently via localStorage) and opens the editor.
   - **Wargame Editor Modal (`WargameEditorModal.js`):**
     - Large, fullscreen-capable modal.
     - Main Tabs (Material UI `Tabs`): "Configure and Execute", "Reports and Analysis".
     - **Configure and Execute Top Tab:**
         - Workflow Tabs (Custom implementation): "Configure & Setup", "Manage Actors & Theaters", "Configure Nations/Organizations", "Review & Execute".
         - **Configure & Setup (`ScenarioTab.js`):** 
             - Displays/Edits: `name`, `designer`, `securityClassification`. Shows dates.
             - Connect Knowledge Sources (Vectorstore/Database selection).
             - Wargame Parameters: `numberOfIterations`, `numberOfMoves`, `timeHorizon` (number/unit), `wargameStartDate`.
             - Display section showing calculated simulation info.
             - Description field (with editor modal).
             - Research Objectives list (add/edit/delete, with editor modal).
             - Road to War field (with editor modal, MAGE Assist button).
             - Approval switches for Description, Research Objectives, Wargame Parameters, Road to War.
         - **Manage Actors & Theaters (`CrafterTab.js`):**
             - Split pane layout (Map on right, Configuration/Relationships on left).
       - **Map Component (`WargameMap.js`):**
                 - `react-leaflet` integration.
                 - Dark mode map tiles.
                 - Click handlers for activating/deactivating nations.
                 - Visual feedback for activated/selected nations/orgs.
                 - Displays visual indicators for conflict theaters (colored borders, lead emphasis).
                 - Custom nation/org labels.
                 - Org marker/label display.
                 - Confirmation dialog for removing nations.
             - **Relationships Pane (`RelationshipMatrix.js`):** 
                 - Displays nation pairs.
                 - Allows setting relationship type (Ally, Partner, Neutral, Adversary, Enemy).
                 - Text field for relationship notes (with expand dialog).
                 - Progress indicator for relationship definition completion.
                 - *Note: Currently part of the Theater Config Modal workflow trigger.* 
             - **Manage Custom Entities Button:** Opens modal (`ManageEntitiesModal` inside `CrafterTab`) to create/delete custom nations/orgs.
             - **Configure Theaters Button:** Opens modal (`TheatersDialog` inside `CrafterTab`) containing `RelationshipMatrix` and `ConflictTheatersPane`.
             - **Conflict Theaters Pane (`ConflictTheatersPane.js`):** 
                 - Card-based UI for defining theaters.
                 - Selection of lead/supporting nations per side.
                 - Color coding per side.
                 - Theater name and description fields.
                 - Validation against relationship matrix.
         - **Configure Nations/Organizations (`NationConfigurationTab` within `WargameEditorModal.js`):**
             - Split Pane: Left shows `NationConfigPane`, Right shows `NationPosturePanel`.
             - **Nation Config Pane (`NationConfigPane.js`):**
                 - List of activated entities with flags and configuration status (Chip: New, Not Configured, Configured).
                 - Click an entity to load its details in the right pane.
             - **Nation Posture Panel (`NationPosturePanel.js`):**
                 - Displays selected entity flag/name.
                 - Tabbed interface: "General Configuration & Relationships", "Diplomacy", "Information", "Military", "Economic".
                 - **General Config Tab:**
                    - Section for uploading general supporting documents (treaties, history, etc.) with enable/disable switch.
                    - Read-only review of defined relationships for the selected entity.
                 - **DIME Tabs:**
                    - Detailed fields for each DIME element, including enhanced fields.
                    - Objectives list management (add/edit/delete) per DIME section with enable/disable switch.
                    - Field-level enable/disable switches.
                    - Tooltips explaining each field and listing associated agent types (with robot icon bullets).
                    - Support for fullscreen text editor (`TextEditorModal.js`).
                    - "Approve & Commit" button per field/section.
                    - "MAGE Assist" button placeholder.
                    - Document upload area for Military Doctrine.
         - **Review & Execute (`ExecutionChecklist.js` component):**
             - Displays validation status of the entire wargame configuration.
             - Checks Basic Info, Scenario Context, Sim Params, Entity DIME completion, Relationships.
             - Overall completion percentage and status.
             - Placeholder "Execute Wargame" button (enabled based on validation).
     - **Reports and Analysis Tab (`WargameReportsAnalysis.js`):**
       - Placeholder UI for displaying simulation reports and dashboards.
       - Placeholder for Research Objective outcome analysis.
   - **UX Enhancements:**
     - Material UI `Tooltip` components used extensively.
     - Visual progress indicators/checkmarks.
     - Fullscreen editor modal (`TextEditorModal.js`).
     - Approval status indicators (`approvedFields` state).
     - Enable/disable field functionality (`enabledFields` state).
     - Formatted tooltips with agent lists.

## 3.1 Frontend Development Principles
   - **Wireframing First:** (Partially followed, evolved during dev)
   - **Modularity:** Generally good component separation.
   - **Directory Structure:** Follows defined structure.
   - **Styling:** Adheres to existing theme and uses styled components.
   - **State Management:** Primarily prop drilling and local state. Context might be considered for `wargameData` later.

## 3.2 Validation & Execution Readiness
- [x] ExecutionChecklist Component: Created and integrated.
- [x] Validation Scope: Implemented checks for most areas.
- [x] Visual Validation System: Implemented status indicators, progress bar, expandable sections.
- [x] Integration Points: Displayed in Review & Execute tab.

## 4. Backend Architecture & Services
   - (No backend implemented yet)
   - **API Endpoints (Needed):** 
     - `POST /api/wargames`: Create new build (takes initial name/desc).
     - `GET /api/wargames`: List builds.
     - `GET /api/wargames/{id}`: Get full build data.
     - `PUT /api/wargames/{id}`: Update full build data (or potentially partial updates).
     - `DELETE /api/wargames/{id}`: Delete build.
     - `POST /api/wargames/{id}/upload/{entity_id?}/{section?}`: Endpoint for handling file uploads (general or doctrine).
     - `POST /api/wargames/{id}/execute`: Trigger simulation run.
     - `GET /api/wargames/{id}/status`: Check simulation status.
     - `GET /api/wargames/{id}/results`: Fetch results.

## 5. Data Models / API Payload Structure

This section details the primary data structure representing a single wargame build that needs to be persisted by the backend. This structure will be sent in the body of `PUT /api/wargames/{id}` requests and received from `GET /api/wargames/{id}`.

```json
{
  "id": "string", // Unique identifier (UUID)
  "name": "string", // Wargame name (ScenarioTab)
  "description": "string", // Optional description (ScenarioTab)
  "designer": "string", // Designer name (ScenarioTab)
  "securityClassification": "string", // e.g., "UNCLASSIFIED", "CONFIDENTIAL" (ScenarioTab)
  "roadToWar": "string", // Narrative text (ScenarioTab)
  "researchObjectives": [
    "string" // List of objectives (ScenarioTab)
  ],
  "numberOfIterations": "number", // Simulation parameter (ScenarioTab)
  "numberOfMoves": "number", // Simulation parameter (ScenarioTab)
  "timeHorizon": "string", // e.g., "12 months" (ScenarioTab)
  "wargameStartDate": "string", // ISO 8601 Date string or null (ScenarioTab)
  "selectedVectorstore": "string", // ID or name of selected vectorstore (ScenarioTab)
  "selectedDatabase": "string", // ID or name of selected database (ScenarioTab)
  "approvedFields": { // Top-level approvals (ScenarioTab)
    "description": "boolean",
    "roadToWar": "boolean",
    "researchObjectives": "boolean",
    "wargameParameters": "boolean" // Covers iterations, moves, time, start date, security
  },
  "activatedEntities": [ // List of nations/orgs (CrafterTab, NationConfigPane)
    {
      "entityId": "string", // e.g., "USA", "NATO"
      "entityName": "string",
      "entityType": "nation | organization",
      "isConfigured": "boolean", // Overall status (updated on saving NationPosturePanel)
      "isCustom": "boolean", // Indicates if created via Manage Entities Modal
      "configData": { // Detailed DIME + General Config (NationPosturePanel)
        "generalConfig": {
          "supportingDocuments": [
            // Store metadata; actual files handled separately
            { "id": "string", "name": "string", "size": "number", "type": "string", "lastModified": "number" }
          ]
        },
        "diplomacy": {
          "objectives": ["string"],
          "posture": "string",
          "keyInitiatives": "string",
          "prioritiesMatrix": "string",
          "redLines": "string",
          "treatyObligations": "string",
          "diplomaticResources": "string",
          "specialConsiderations": "string"
        },
        "information": {
          "objectives": ["string"],
          "propagandaThemes": "string",
          "cyberTargets": "string",
          "strategicCommunicationFramework": "string",
          "intelCollectionPriorities": "string",
          "disinformationResilience": "string",
          "mediaLandscapeControl": "string",
          "specialConsiderations": "string"
        },
        "military": {
          "objectives": ["string"],
          "alertLevel": "string",
          "doctrine": "string", // Text summary
          "doctrineFiles": [
            // Store metadata; actual files handled separately
            { "id": "string", "name": "string", "size": "number", "type": "string", "lastModified": "number" }
          ],
          "forceStructureReadiness": "string",
          "escalationLadder": "string",
          "decisionMakingProtocol": "string",
          "forceProjectionCapabilities": "string",
          "defenseIndustrialCapacity": "string",
          "domainPosture": {
            "land": "string",
            "sea": "string",
            "air": "string",
            "cyber": "string",
            "space": "string"
          },
          "specialConsiderations": "string"
        },
        "economic": {
          "objectives": ["string"],
          "tradeFocus": "string",
          "resourceDeps": "string",
          "sanctionsPolicy": "string",
          "economicWarfareTools": "string",
          "criticalInfrastructureResilience": "string",
          "strategicResourceAccess": "string",
          "financialSystemLeverage": "string",
          "technologyTransferControls": "string",
          "specialConsiderations": "string"
        },
        "approvedFields": { // Field-level approvals (NationPosturePanel)
          "generalConfig.supportingDocuments": "boolean", // Example structure
          "diplomacy.objectives": "boolean",
          "diplomacy.posture": "boolean",
          // ... other DIME fields ...
          "military.domainPosture.land": "boolean",
          // ... etc.
        },
        "enabledFields": { // Field-level enable/disable state (NationPosturePanel)
           "generalConfig": { "supportingDocuments": "boolean" },
           "diplomacy": { "objectives": "boolean", "posture": "boolean", /*...*/ },
           "information": { "objectives": "boolean", "propagandaThemes": "boolean", /*...*/ },
           "military": {
             "objectives": "boolean", "alertLevel": "boolean", "doctrine": "boolean", /*...*/,
             "domainPosture": { "land": "boolean", "sea": "boolean", /*...*/ },
             /*...*/
           },
           "economic": { "objectives": "boolean", "tradeFocus": "boolean", /*...*/ }
        }
      } // end configData
    } // end entity object
  ],
  "customEntities": [ // List of user-created entities (CrafterTab)
      {
        "entityId": "string",
        "entityName": "string",
        "entityType": "nation | organization",
        "isCustom": true
      }
  ],
  "nationRelationships": { // (RelationshipMatrix / CrafterTab)
    // Key is "{entityId1}_{entityId2}" (sorted IDs)
    "USA_RUS": {
      "type": "adversary | ally | partner | neutral | enemy",
      "notes": "string"
    }
    // ... more relationships
  },
  "conflictTheaters": [ // (ConflictTheatersPane / CrafterTab)
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "sides": [
        { "id": "side1", "leadNationId": "string", "supportingNationIds": ["string"], "colorCode": "string" },
        { "id": "side2", "leadNationId": "string", "supportingNationIds": ["string"], "colorCode": "string" }
      ]
    }
    // ... more theaters
  ],
  "createdAt": "string", // ISO 8601 Date string
  "modifiedAt": "string", // ISO 8601 Date string
  "lastExecuted": "string | null" // ISO 8601 Date string or null
}
```

## 6. Implementation Phases (High-Level)
   - **Phase 1:** Foundational UI & API (Wargame Build CRUD, List Page, Editor Shell) - *Mostly Complete (UI/LocalStorage)*
   - **Phase 2:** Scenario & Reports Tab (UI, API integration) - *UI Complete, API Pending*
   - **Phase 3:** Wargame Crafter Tab (Map integration, Nation Activation UI/API) - *UI Complete, API Pending*
   - **Phase 4:** Nation Configuration (Modal UI, Data Model, API, Define DIME fields) - *UI Complete, API Pending*
   - **Phase 5:** Backend Implementation (Service Creation, API Endpoints, Storage) - *Not Started*
   - **Phase 6:** Backend Agent & Simulation Skeleton (Basic agent structure, placeholder sim engine, async task setup) - *Not Started*
   - **Phase 7:** Core Simulation Logic (Implement DIME-based agent behavior, Adjudication logic v1) - *Not Started*
   - **Phase 8:** Results & Analysis (Fetch/display results, Basic analysis report generation) - *Placeholder UI Complete*
   - **Phase 9:** Refinement & Enhancement (UX improvements, templates, visualizations, testing, optimization) - *Ongoing*

## 7. Backend Integration & API Gateway (Traefik)

   - **Goal:** Integrate the new wargame builder frontend with a dedicated backend service via the existing Traefik API gateway.
   - **API Gateway Setup:**
     - Uses Traefik v3.3.4.
     - Configuration split into static (`traefik.yaml`) and dynamic (`dynamic_conf.yaml`).
     - Employs path-based routing (e.g., `/api/core`, `/api/auth`).
     - Uses File Provider for dynamic configuration (changes should be auto-detected).
   - **Docker Compose Structure:**
     - Microservice architecture (`core`, `agent`, `upload`, etc.).
     - Shared bridge network (`app-network`) for inter-service communication.
     - Central PostgreSQL database (`db`) hosting multiple logical databases.
     - Persistent data stored via Docker volumes mapped to host directories (e.g., `../data`).
   - **Required Steps:**
     - **1. Create Backend Service:**
       - Develop the service application (e.g., Python FastAPI/Flask).
       - Implement logic to handle CRUD operations for wargame builds.
     - **2. Define Storage:**
       - **Initial Plan:** Store each `WargameBuild` object (as defined in Section 5) as a JSON file.
       - **Location:** `/app/data/wargames/{wargame_id}.json` within the service container (maps to host `../data/wargames/`). Create this directory if it doesn't exist.
       - *(Long-term Consideration: Migrate to a dedicated `wargame_db` within the central PostgreSQL instance)*.
     - **3. Add Service to `docker-compose.yml`:**
       - Define a new service (e.g., `wargame_service`).
       - Specify `build` context.
       - Mount necessary volumes (`../data:/app/data`).
       - Add to `app-network`.
       - Define `depends_on: [init-data]` (and `db` if using Postgres later).
       - Set necessary environment variables.
     - **3.5 Refactor Service Structure (Best Practices):**
       - Separate concerns into modules: `main.py` (entry), `app.py` (FastAPI instance), `config.py`, `api/` (routers), `schemas.py` (models), `crud.py` (data logic).
     - **4. Implement API Endpoints:**
       - Create endpoints within the `wargame_service` matching the required functionality:
         - `GET /` (List)
         - `POST /` (Create)
         - `GET /{wargame_id}` (Read)
         - `PUT /{wargame_id}` (Update)
         - `DELETE /{wargame_id}` (Delete)
         - *(File upload endpoint TBD)*.
     - **5. Configure Traefik Routing:**
       - Edit `api_gateway/dynamic_conf.yaml`.
       - Add an HTTP Router (e.g., `wargame-router`) matching path prefix `/api/wargame`.
       - Add an HTTP Service (e.g., `wargame-service`) defining the load balancer pointing to `http://wargame_service:PORT` (using the internal port of the new service).
       - Add `stripPrefix` middleware to the router.
   - **Checklist:**
     - [x] Create `wargame_service` directory & initial code structure.
     - [x] Add `wargame_service` definition to `docker-compose.yml`.
     - [x] Define JSON file storage logic within the service.
     - [x] Implement CRUD API endpoints in the service.
     - [x] Add routing rules for `/api/wargame` to `dynamic_conf.yaml`.
     - [x] Update frontend service calls to use `/api/wargame` endpoints.
     - [x] Refactor `wargame_service` into modules (`app.py`, `config.py`, `api/`, `schemas.py`, `crud.py`).

## 8. Key Challenges & Considerations
   - (Renumbered from 7 - Content remains relevant)

## 9. Future Enhancements
   - (Renumbered from 8 - Content remains relevant)

## 10. Implementation Checklist (Frontend First)
    - (Renumbered from 9 - Content remains relevant, status updated)
    **Next Steps (Backend Focus):**
    - [ ] Define precise API schemas based on the documented payload.
    - [ ] Implement backend service (e.g., Flask/FastAPI).
    - [ ] Implement database models or file storage logic for the `WargameBuild` structure.
    - [ ] Implement API endpoints for CRUD operations.
    - [ ] Connect frontend service functions (`wargameService.js`) to backend API endpoints.
    - [ ] Implement file upload handling on the backend.


## 11. Conflict Theaters System Implementation
   - (Renumbered from 10 - Content remains relevant)

## 12. Implementation Checklist (Conflict Theaters System)
   - (Renumbered from 11 - Content remains relevant, status updated)

## 13. Enhanced Theater Configuration Workflow
   - (Renumbered from 12 - Content remains relevant, status updated)
