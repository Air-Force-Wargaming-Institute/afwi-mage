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

## 3. UI/UX Design
   - **Navigation:** Add "Wargame Builder" item to the "Build Agents and Teams" side menu (`SideMenu.js` or similar).
   - **Wargames List Page (`WargamesListPage.js`):**
     - Displays existing Wargame Builds (consider using Material UI `Card` components).
     - "Create New Wargame" button.
     - Clicking a card navigates to/opens the editor.
   - **Create Wargame Modal (`CreateWargameModal.js`):**
     - Input fields: `name` (required), `description` (optional).
     - On submit: Creates the build via API and ideally opens the full editor modal.
   - **Wargame Editor Modal (`WargameEditorModal.js`):**
     - Large, potentially full-screen modal.
     - Main Tabs (e.g., using Material UI `Tabs`): "Scenario & Reports", "Wargame Crafter".
     - **Scenario & Reports Tab (`ScenarioTab.js`):**
       - Input Fields: `roadToWar` (TextArea), `researchObjectives` (TextArea), `numberOfIterations` (NumberInput).
       - Display Area: Placeholder for future simulation reports/results.
     - **Wargame Crafter Tab (`CrafterTab.js`):**
       - Layout: Split pane (Map on right, Configuration list on left).
       - **Map Component (`WargameMap.js`):**
         - Integrate `react-leaflet`.
         - Load GeoJSON for country boundaries.
         - **Use dark mode map tiles** (e.g., CartoDB Dark Matter) via `TileLayer` URL.
         - **Style map controls** (zoom, attribution) to match the application theme using CSS overrides if necessary.
         - Click handlers for selecting/activating nations.
         - Visual feedback for activated/selected nations.
         - Potential display of custom organization zones/markers.
       - **Configure Nations Pane (`NationConfigPane.js`):**
         - List of activated nations/organizations, **each displayed with its corresponding flag**. (Use `react-world-flags` for nations, custom SVGs for organizations).
         - Status indicator (e.g., configured/not configured).
         - "Configure Disposition" button for each item, opening the Nation Posture Modal.
   - **Configure Nation Modal (`NationPostureModal.js`):**
     - Very large modal, potentially with internal navigation (Tabs or Accordion).
     - **Display the nation/organization flag prominently** in the modal header or title area.
     - **Section 1: Data & Relationships:**
       - UI for linking MAGE data sources (TBD).
       - UI for defining alliances/partnerships with other activated entities (dropdowns, text fields for characterization).
     - **Sections 2-5: DIME Configuration (e.g., `DiplomacyConfig.js`, `MilitaryConfig.js`, etc.):**
       - Structured input fields specific to each DIME element (detailed in Data Models/Backend).
       - Use appropriate controls (TextAreas, Sliders, Selects).
       - Include "Special Considerations" TextArea in each section.
   - **UX Enhancements:**
     - Implement auto-saving within modals or clear Save/Cancel patterns.
     - Use Material UI `Tooltip` components extensively for explaining fields.
     - Visual progress indicators/checkmarks in `NationConfigPane.js` (e.g., using Material UI `Chip` or `Icon`).
     - Consider loading states and feedback during API calls.
     - Explore theme consistency (`styles/theme.js`).

## 3.1 Frontend Development Principles
   - **Wireframing First:** Implement the complete frontend UI structure and flow using mock data before connecting to backend APIs. This allows for rapid iteration on UX and visualization of the full feature set.
   - **Modularity:** Keep React components focused and reasonably sized. Break down complex UIs into smaller, reusable sub-components to enhance maintainability and readability. Avoid creating monolithic component files.
   - **Directory Structure:**
     - Main Wargame Feature Components: `frontend/src/components/builder/wargames/`
     - Context Providers: `frontend/src/contexts/`
     - API Service Functions: `frontend/src/services/`
     - Reusable UI Elements/Hooks: `frontend/src/components/common/` (or a new `frontend/src/hooks/` if needed)
   - **Styling:** Adhere to the existing application theme and styling conventions. Utilize shared styled components and theme variables found in:
     - `frontend/src/styles/theme.js` (Main theme definitions)
     - `frontend/src/styles/StyledComponents.js` (Reusable styled wrappers/layouts)
     - `frontend/src/styles/ActionButtons.js` (Standardized action buttons)
     - `frontend/src/styles/ThemeProvider.js` (Applies theme and global styles)
   - **State Management:** Use React Context API (`frontend/src/contexts/`) for managing shared state related to the wargame builder (e.g., current build details, selected nations) where appropriate. Local component state should be used for UI-specific states (e.g., modal visibility).

## 3.2 Validation & Execution Readiness

To ensure wargame simulations have all required data before execution, a comprehensive validation system will be implemented:

- **ExecutionChecklist Component:** A dedicated component that validates all aspects of the wargame configuration and displays completion status with visual indicators.
- **Validation Scope:**
  - Basic Information: Wargame name, security classification, designer
  - Scenario Context: Road to War narrative, research objectives  
  - Simulation Parameters: Number of iterations, moves, time horizon
  - Entity Configuration: DIME framework completion for each entity
  - Relationship Matrix: Proper definition of inter-entity relationships
- **Visual Validation System:**
  - Color-coded status indicators (green for complete, red for incomplete)
  - Expandable sections showing detailed validation status
  - Overall completion percentage with progress bar
  - Contextual error messages explaining what needs to be completed
  - Entity-level breakdown of DIME configuration status
- **Integration Points:**
  - Dedicated tab in WargameEditorModal
  - Status indicators next to entities in the CrafterTab
  - Execute button enablement based on validation status

**Implementation Considerations:**
- Balance between comprehensive validation and user flexibility
- Progressive disclosure of validation requirements
- Clear, actionable error messages directing users to incomplete sections
- Real-time validation as users input data
- Performance optimization for large numbers of entities

## 4. Backend Architecture & Services
   - **Framework:** (Assuming Python/Flask/FastAPI based on project structure)
   - **API Endpoints:**
     - `POST /api/wargames`: Create new wargame build.
     - `GET /api/wargames`: List wargame builds.
     - `GET /api/wargames/{id}`: Get details of a specific wargame build.
     - `PUT /api/wargames/{id}`: Update general settings (name, desc, scenario).
     - `POST /api/wargames/{id}/nations`: Add/activate a nation/org.
     - `PUT /api/wargames/{id}/nations/{nation_id}`: Update configuration for a specific nation.
     - `DELETE /api/wargames/{id}/nations/{nation_id}`: Deactivate a nation.
     - `POST /api/wargames/{id}/run`: Trigger simulation run (asynchronous task).
     - `GET /api/wargames/{id}/status`: Check simulation status.
     - `GET /api/wargames/{id}/results`: Fetch simulation results (potentially paginated or filtered by iteration).
   - **Agent Architecture:**
     - Define base Agent class/structure.
     - **Nation Agents:** Composite agents, potentially with sub-modules/agents for each DIME component. State includes configuration, objectives, current perceived world state. **Consider using LangGraph for defining and executing the complex state machines and interactions within and between nation agents.**
     - **Adjudication Agent Team:** A coordinated group of agents responsible for scenario progression, event injection, action validation, and outcome assessment based on research objectives. Logic needs careful design (TBD). **May also leverage LangGraph for managing adjudication flow.**
     - **Analysis Agent (Optional):** Post-simulation agent to synthesize results across iterations and generate summaries aligned with research objectives.
   - **Simulation Engine:**
     - Manages game loop/turns/phases.
     - Facilitates communication/information flow between Nation Agents and Adjudicator.
     - Manages overall simulation state.
     - Handles asynchronous execution (e.g., using Celery or similar task queue).
     - **Event-Driven Communication:** Implement a message queue system (e.g., RabbitMQ, Kafka, or Redis Pub/Sub) to facilitate communication between agents (Nation-to-Nation, Nation-to-Adjudicator) and for broadcasting state changes or events. This supports actions like diplomatic messages, intel requests, report submissions, and adjudication updates.
   - **Database Integration:** Define mechanism for storing references to MAGE data (e.g., document IDs, database query parameters) within `NationConfiguration`. Agents need service access to retrieve this data during simulation.

## 5. Data Models (Illustrative - requires refinement)
   - **`WargameBuild`:**
     - `id`: String (UUID)
     - `name`: String
     - `description`: String
     - `roadToWar`: String (Markdown/Text)
     - `researchObjectives`: String (Markdown/Text)
     - `numberOfIterations`: Integer
     - `activatedEntities`: List[Object { `entityId`: String, `entityType`: 'nation' | 'organization', `configRef`: String }] // Ref to NationConfiguration
     - `simulationRunIds`: List[String] // Refs to SimulationRun documents/records
     - `createdAt`: DateTime
     - `updatedAt`: DateTime
   - **`NationConfiguration`:**
     - `id`: String (UUID)
     - `entityId`: String (e.g., 'USA', 'NATO')
     - `entityName`: String (e.g., 'United States', 'North Atlantic Treaty Organization')
     - `linkedDataSources`: List[Object { `sourceType`: String, `sourceId`: String }] // Pointers to MAGE data
     - `relationships`: Dict[entityId: String, Object { `relationType`: 'alliance' | 'partnership' | 'rivalry' | 'neutral', `details`: String }]
     - `diplomacyConfig`: Object { `objectives`: String, `posture`: String, `keyInitiatives`: String, `specialConsiderations`: String, ... } // TBD specific fields
     - `informationConfig`: Object { `objectives`: String, `propagandaThemes`: String, `cyberTargets`: String, `specialConsiderations`: String, ... } // TBD
     - `militaryConfig`: Object { `objectives`: String, `alertLevel`: String, `doctrine`: String, `domainPosture`: { `land`: ..., `sea`: ..., `air`: ..., `cyber`: ..., `space`: ... }, `specialConsiderations`: String, ... } // TBD
     - `economicConfig`: Object { `objectives`: String, `tradeFocus`: String, `resourceDeps`: String, `sanctionsPolicy`: String, `specialConsiderations`: String, ... } // TBD
   - **`SimulationRun`:**
     - `id`: String (UUID)
     - `wargameBuildId`: String
     - `iterationNumber`: Integer
     - `status`: String ('pending', 'running', 'completed', 'failed')
     - `startTime`: DateTime
     - `endTime`: DateTime
     - `scenarioVariations`: Object // Details of adjudicator tweaks for this run
     - `eventLog`: List[Object { `timestamp`: DateTime, `eventType`: String, `details`: Object }]
     - `entityReports`: Dict[entityId: String, String] // Narrative reports from agents
     - `adjudicatorLog`: String // Notes/rationale from adjudication
     - `analysisSummary`: String // High-level findings related to objectives

## 6. Implementation Phases (High-Level)
   - **Phase 1:** Foundational UI & API (Wargame Build CRUD, List Page, Editor Shell).
   - **Phase 2:** Scenario & Reports Tab (UI, API integration).
   - **Phase 3:** Wargame Crafter Tab (Map integration, Nation Activation UI/API).
   - **Phase 4:** Nation Configuration (Modal UI, Data Model, API, Define DIME fields).
   - **Phase 5:** Backend Agent & Simulation Skeleton (Basic agent structure, placeholder sim engine, async task setup).
   - **Phase 6:** Core Simulation Logic (Implement DIME-based agent behavior, Adjudication logic v1).
   - **Phase 7:** Results & Analysis (Fetch/display results, Basic analysis report generation).
   - **Phase 8:** Refinement & Enhancement (UX improvements, templates, visualizations, testing, optimization).

## 7. Key Challenges & Considerations
   - **DIME Field Definition:** Balancing detail vs. usability; ensuring fields meaningfully drive agent behavior.
   - **Adjudication Logic:** Creating sophisticated, relevant, and non-trivial adjudication is complex. Requires careful design and iteration.
   - **Agent Interaction Model:** Defining how agents perceive the world state, communicate, and influence each other.
   - **Scalability:** Handling potentially long-running simulations with numerous agents per iteration * number of iterations. Requires efficient backend processing and potentially parallelization.
   - **Data Integration:** Seamlessly linking and utilizing potentially large MAGE datasets within the simulation context without overwhelming agents.
   - **UI Complexity:** Managing the large amount of configuration data in an intuitive way.
   - **Meaningful Analysis:** Designing the output and analysis features to directly address the user's research objectives effectively.

## 8. Future Enhancements
   - Wargame configuration templates (Nations, Scenarios).
   - Advanced visualizations (timelines, relationship maps, posture shifts).
   - User-defined global events or injects during simulation setup.
   - Support for non-state actors or other entity types.
   - Real-time simulation monitoring (optional).
   - Comparative analysis tools across different Wargame Builds.

## 9. Implementation Checklist (Frontend First)

**Phase 0: Setup & Dependencies**
- [x] Install `react-world-flags` (`npm install react-world-flags`).
- [ ] Gather SVG files for key organization flags (e.g., NATO, UN, EU) and place them in `frontend/src/assets/flags/organizations/`.
- [ ] Create a helper component/function (`OrgFlagDisplay.js`?) to render organization flags from local SVGs based on an identifier.

**Phase 1: Foundational UI & Navigation**
- [x] Add "Wargame Builder" navigation item to `MultiAgentBuilder.js` & associated Route.
- [x] Create directory: `frontend/src/components/builder/wargames/`.
- [x] Create component file: `WargamesListPage.js`.
- [x] Implement basic layout for `WargamesListPage.js` (e.g., using `StyledContainer`, `Typography` for title).
- [x] Add "Create New Wargame" button (e.g., using `AddButton` from `ActionButtons.js`).
- [x] Create component file: `CreateWargameModal.js`.
- [x] Implement modal structure (`Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`).
- [x] Add form fields (`TextField` for Name, Description) to `CreateWargameModal.js`.
- [x] Implement state management for modal visibility and form inputs in `WargamesListPage.js` or a parent component.
- [x] Implement mock "Create" action on modal submit (e.g., console log data, close modal).
- [x] Create component file: `WargameEditorModal.js`.
- [x] Implement basic modal structure for the editor.
- [x] Implement Material UI `Tabs` for "Scenario & Reports" and "Wargame Crafter".
- [x] Connect Wargame List Card click action to open `WargameEditorModal.js` (passing mock build ID/data).
- [x] Display placeholder content for each tab based on selection.

**Phase 2: Scenario & Reports Tab UI**
- [x] Create component file: `ScenarioTab.js`.
- [x] Implement layout within `ScenarioTab.js`.
- [x] Add `TextField` (multiline) for "Road to War".
- [x] Add `TextField` (multiline) for "Research Objectives".
- [x] Add `TextField` (type number) for "Number of Iterations".
- [x] Implement state management for these fields within `WargameEditorModal.js` or a dedicated context.
- [x] Add placeholder area/component for displaying simulation reports.

**Phase 3: Wargame Crafter Tab UI (Map & Nation List)**
- [x] Create component file: `CrafterTab.js`.
- [x] Implement split-pane layout (e.g., using `Grid` or flexbox).
- [x] Create component file: `WargameMap.js`.
- [x] Install `react-leaflet` and `leaflet` dependencies (`npm install react-leaflet leaflet`).
- [x] Install Leaflet types (`npm install --save-dev @types/leaflet`).
- [x] Implement basic `MapContainer`, `TileLayer` in `WargameMap.js`.
- [x] **Configure `TileLayer` to use a dark theme URL** (e.g., CartoDB Dark Matter).
- [x] Find or create basic world GeoJSON data (using simplified dummy data for now).
- [x] Load and display GeoJSON layer on the map (`GeoJSON` component from `react-leaflet`).
- [x] Implement `eventHandlers` on GeoJSON layer for `click` events.
- [x] Add logic to track selected/activated nations (store IDs in state/context).
- [x] Implement visual styling changes for selected/activated nations on the map (e.g., change fill color).
- [x] Create list display for activated nations in the left pane of `CrafterTab.js`.
- [x] **Integrate flag display** next to each nation/organization name in the list (using `react-world-flags`).
- [x] Add a "Configure Disposition" button for each listed nation.
- [x] Implement placeholder action for the "Configure Disposition" button (temporary status change until modal is created).

**Phase 4: Nation Configuration Modal UI**
- [x] Create component file: `NationPostureModal.js`.
- [x] Implement large modal structure.
- [x] **Add flag display** to the modal title/header area.
- [x] Add internal navigation (e.g., `Tabs` or `Accordion`) for "Data & Relationships", "Diplomacy", "Information", "Military", "Economic".
- [x] **Data & Relationships Section:**
- [x]   Add placeholder UI for linking MAGE data sources.
- [x]   Add UI for selecting other activated nations (e.g., `Select`, `Checkbox` group).
- [x]   Add UI for defining relationship type (e.g., `Select`: Alliance, Partnership, Rivalry).
- [x]   Add `TextField` for relationship details/characterization.
- [x] **DIME Sections (Diplomacy, Information, Military, Economic):**
- [x]   Add relevant `TextField` (standard and multiline) components for objectives, posture, specific items.
- [x]   Add `TextField` (multiline) for "Special Considerations" in each DIME section.
- [x] Implement local state management within `NationPostureModal.js` for its form fields.
- [x] Connect "Configure Disposition" button in `CrafterTab.js` to open this modal, passing the relevant nation ID/data.
- [x] Implement mock "Save" action for the modal.

**Next Steps:**
- [x] Enhance GeoJSON data with real-world country boundaries (replace dummy data)
- [x] Create a helper component for displaying organization flags
- [x] Implement "Add Organization" functionality in the CrafterTab
- [x] Extract the nation list to a separate component (NationConfigPane) for better organization
- [ ] Create a dedicated service for wargame data operations
- [ ] Add validation to the NationPostureModal
- [ ] Extend error handling in all components
- [ ] Implement data persistence with localStorage for configuration data
- [ ] Prepare for backend API integration

**Phase 5: Backend Agent & Simulation Skeleton (Placeholder API)**
- [ ] Define basic API service functions (`frontend/src/services/wargameService.js`) with placeholder implementations (return mock data, log calls).
- [ ] Connect frontend UI actions (create, update build, configure nation) to call these placeholder service functions.

*(Backend implementation phases follow)*

## 10. Conflict Theaters System Implementation

### 10.1 Overview
The Conflict Theaters System allows users to represent multiple large-scale conflicts within a single wargame scenario by defining theaters of conflict with primary antagonists and supporting nations. This feature enhances scenario complexity and realism, particularly for modeling World War-style scenarios with multiple fronts.

### 10.2 UI/UX Design
- **ConflictTheatersPane.js**: A dedicated component that manages conflict theater definition and visualization
  - **Position**: Integrated into the CrafterTab as a collapsible panel below the NationConfigPane
  - **Layout**: Vertical list of theater cards with "Add Theater" button at bottom
  - **Visual Design**: Clean, card-based interface with color coding that matches map visualization

- **TheaterCard Component**:
  - Header with theater name (editable) and delete/collapse controls
  - Two primary columns representing opposing sides, each with:
    - Lead Nation Selector (dropdown limited to activated nations)
    - Nation flag display for selected lead nation
    - Supporting Nations multi-select field
    - Mini flag display for each supporting nation
  - Color coding for each side (e.g., blue vs. red, with variations for multiple theaters)
  - Theater description field (optional)

- **Map Integration**:
  - Update WargameMap.js to display visual indicators of conflict theaters
  - Nations in conflict receive a colored border matching their theater assignment
  - Lead nations receive additional visual emphasis (e.g., pulsing border or larger indicator)
  - Multiple theaters use different color schemes to distinguish between conflicts
  - Optional toggle to highlight specific theaters on the map

### 10.3 Data Model Extension
Add a new data structure to the existing WargameBuild model:

```javascript
conflictTheaters: [
  {
    id: String, // UUID
    name: String, // e.g., "Pacific Theater"
    description: String, // optional context
    sides: [
      {
        id: String, // e.g., "side1"
        leadNationId: String, // reference to an activated nation
        supportingNationIds: [String], // array of references to activated nations
        colorCode: String // CSS color code
      },
      {
        id: String, // e.g., "side2"
        leadNationId: String,
        supportingNationIds: [String],
        colorCode: String
      }
    ]
  }
]
```

### 10.4 Component Architecture
1. **ConflictTheatersPane.js**:
   - Main container component
   - Manages theaters list state
   - Provides context for theater data
   - Handles theater CRUD operations
   - Implements drag-and-drop functionality for nation assignment

2. **TheaterCard.js**:
   - Individual theater configuration interface
   - Manages single theater state
   - Validates lead nation selections
   - Enforces rules (e.g., a nation cannot be on both sides)

3. **ConflictVisualization.js**:
   - Extension to WargameMap.js
   - Renders theater highlights on the map
   - Implements toggle controls for theater visibility

### 10.5 Implementation Steps
1. **Create Base Components**:
   - Implement ConflictTheatersPane.js shell
   - Create TheaterCard.js component
   - Add "Add Theater" functionality

2. **State Management**:
   - Extend WargameContext to include theater data
   - Implement hooks for theater operations
   - Create validation functions for theater configurations

3. **UI Implementation**:
   - Build the theater cards interface with Material UI
   - Implement drag-and-drop using react-dnd or similar
   - Create color selector for theater sides

4. **Map Integration**:
   - Extend WargameMap.js to visualize theaters
   - Add toggle controls for theater display
   - Implement highlight effects for nations in conflict

5. **Data Persistence**:
   - Update API endpoints to save/load theater data
   - Implement temporary localStorage backup
   - Add validation before simulation execution

### 10.6 User Workflow
1. User activates nations using the existing nation selection process
2. User navigates to the Conflict Theaters panel and clicks "Add Theater"
3. User names the theater (e.g., "Pacific War")
4. User selects primary antagonists (e.g., US vs. Japan)
5. User assigns supporting nations to each side via dropdown or drag-and-drop
6. System visualizes the theater on the map with appropriate color coding
7. User can edit, delete, or add additional theaters as needed

### 10.7 Design Considerations
- **Intuitive UI**: Interface should make the concept of "theaters" immediately clear
- **Visual Coherence**: Theater visualization should enhance map readability without overwhelming
- **Flexibility**: Support for asymmetric conflicts (e.g., one lead nation vs. multiple smaller nations)
- **Data Integrity**: Prevent invalid configurations (e.g., same nation on opposing sides)
- **Performance**: Efficient rendering of multiple theaters on complex maps

### 10.8 Future Enhancements
- Theater-specific configuration options (e.g., terrain importance, weather effects)
- Timeline integration to show evolution of conflict theaters
- Sub-theater definition for complex scenarios
- Theater-specific objectives and victory conditions
- Integration with simulation engine to model resource allocation across theaters

## 11. Implementation Checklist (Conflict Theaters System)

**Phase 1: Core Components**
- [ ] Create ConflictTheatersPane.js component file
- [ ] Implement basic layout and styling
- [ ] Create TheaterCard.js component
- [ ] Implement "Add Theater" functionality
- [ ] Build state management for theaters list

**Phase 2: UI Development**
- [ ] Design and implement theater card interface
- [ ] Create lead nation selector dropdowns
- [ ] Implement supporting nations multi-select
- [ ] Add color coding for theater sides
- [ ] Implement card expand/collapse functionality
- [ ] Add delete theater capability
- [ ] Create error states and validation feedback

**Phase 3: Data Integration**
- [ ] Extend WargameContext to include theater data
- [ ] Implement data validation functions
- [ ] Create temporary localStorage persistence
- [ ] Prepare API endpoint specifications
- [ ] Add theater data to the simulation configuration

**Phase 4: Map Visualization**
- [ ] Extend WargameMap.js to accept theater data
- [ ] Implement theater visualization on the map
- [ ] Create toggle controls for theater display
- [ ] Add highlighting effects for lead nations
- [ ] Implement color management for multiple theaters

**Phase 5: User Experience Refinement**
- [ ] Add comprehensive tooltips
- [ ] Implement drag-and-drop for nation assignment
- [ ] Create animated transitions for better feedback
- [ ] Add keyboard navigation support
- [ ] Optimize for various screen sizes
- [ ] Implement comprehensive error handling

## 12. Enhanced Theater Configuration Workflow

### 12.1 Overview

To provide a more structured approach to theater configuration, a guided workflow will be implemented that requires users to define bilateral relationships between all nations before configuring theaters. This ensures that conflict theaters are based on clearly defined alliances and adversarial relationships.

### 12.2 Relationship Matrix Component

A new component will be created to manage nation-to-nation relationships:

- **Interface**: Left pane of a widened theater configuration modal
- **Content**: Grid showing all possible nation/organization pairs
- **Relationship Types**: Ally, Partner, Neutral, Adversary, Enemy
- **Input Method**: Quick select buttons with color coding
- **Completion Tracking**: Progress indicator showing percentage of relationships defined

### 12.3 Workflow Implementation

1. **Step 1: Relationship Definition**
   - User opens the modal via "Configure Theaters of Conflict" button
   - Left pane shows all nation pairs requiring relationship definition
   - User must define all relationships before proceeding
   - Progress indicator tracks completion status

2. **Step 2: Theater Configuration**
   - Once all relationships are defined, the right pane becomes enabled
   - Users can now define theaters based on established relationships
   - Theater suggestions may be offered based on relationship patterns
   - Side assignments are validated against relationship data

### 12.4 Data Model Extensions

Add a `nationRelationships` field to the wargame data structure:

```javascript
nationRelationships: {
  [entityId1_entityId2]: {
    type: "ally" | "partner" | "neutral" | "adversary" | "enemy",
    notes: String // Optional notes about the relationship
  }
}
```

### 12.5 Implementation Steps

1. **Modal Redesign**
   - Split the modal into two columns with a divider
   - Add conditional rendering for the theater configuration side

2. **Relationship Matrix Component**
   - Create a scrollable grid showing all nation pairs
   - Implement relationship selector buttons
   - Add completion tracking and validation

3. **Workflow Logic**
   - Implement completion check logic
   - Add theater side enabling/disabling based on completion
   - Add user guidance notifications

4. **Theater Validation**
   - Validate theater compositions against relationships
   - Flag inconsistencies (e.g., allies on opposing sides)
   - Offer suggestions for theater compositions

### 12.6 User Experience Considerations

- Clear visual indication of current workflow step
- Intuitive relationship selection UI 
- Helpful error messages and guidance
- Progress tracking to indicate completion
- Performance optimization for handling many nation pairs
- Effective use of vertical space with scrollable areas

### 12.7 Potential Future Enhancements

- Semi-automated theater suggestions based on relationship clustering
- Ability to import relationship configurations from templates
- Visualization of relationship networks
- Bulk relationship setting for similar nation groups
