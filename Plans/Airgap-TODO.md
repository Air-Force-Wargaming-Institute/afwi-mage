# Airgap Deployment TODO List

This document tracks the remaining tasks and areas for improvement for the airgapped deployment of the AFWI Multi-Agent Generative Engine.

## I. Core Deployment Scripting (Airgapped Environment - Phase 2)

These are critical for enabling the actual deployment in an airgapped environment.

-   **[IN PROGRESS] Create `airgapped_deploy.ps1` (PowerShell Deployment Script)** (Initial version drafted)
    -   [X] Design script to take a service name or allow selection (via parameters: `$ServiceName`, `$DeployAllServices`, or interactive).
    -   [X] Script should extract the `${ServiceName}_airgapped.zip` from `../backend_services/` (relative to script location within package).
    -   [X] Navigate into the extracted service directory (using `Push-Location`).
    -   [X] Execute `docker build -t ${service_name}-airgapped .` using the local Dockerfile and resources.
    -   [X] Provide instructions for `docker run`.
    -   [X] Includes Docker image loading from `../docker_images/*.tar`.
    -   [X] Interactive service selection implemented.
    -   [ ] TODO: Offer basic lifecycle management (start, stop, logs for running containers) in a future iteration.
    -   [X] Design is general for multiple services.
-   **[IN PROGRESS] Create `airgapped_deploy.sh` (Bash Deployment Script)** (Initial version drafted)
    -   [X] Implement equivalent functionality to `airgapped_deploy.ps1` for Linux environments (image loading, service listing/selection, extraction, build, run instructions).
    -   [ ] TODO: (Bash) Offer basic lifecycle management (start, stop, logs for running containers) in a future iteration.

## II. Dependency & Packaging Integrity (Preparation Environment - Phase 1)

Ensuring the prepared packages are complete and correct.

-   **[DONE] Verify/Create/Standardize `copy_wheels_from_list.ps1` for each service**
    -   [X] Ensured this script exists (or was created/standardized) in every service directory that has a `download_wheels.ps1` (agent, auth, chat, core, direct_chat, embedding, extraction, generation, review, upload, workbench services).
    -   [X] Confirmed it correctly copies wheels from `../backend_wheels` to the service-local `./wheels` based on `downloaded_wheels_list.txt`, using a standardized template.
-   **[ ] Fix "No downloaded wheel found for requirement..." warnings**
    -   [ ] **Investigate `auth_service`:** Determine why packages like `python-multipart`, `psycopg2-binary`, etc., are reported as not found locally despite being in `backend_wheels`.
        -   [ ] Check logic in `auth_service/download_wheels.ps1` that generates `downloaded_wheels_list.txt`.
        -   [X] Check `auth_service/copy_wheels_from_list.ps1`. (Standardized)
    -   [ ] **Investigate `chat_service`:** Similar investigation for packages like `langchain-core`, `python-dotenv`, etc.
        -   [ ] Check logic in `chat_service/download_wheels.ps1` for list generation.
        -   [X] Check `chat_service/copy_wheels_from_list.ps1`. (Standardized)
    -   [ ] Review other services for similar warnings once they are successfully processed by `download_all_wheels.ps1`.
-   **[ ] NLTK Data Handling for `extraction_service`**
    -   [X] Ensured this script exists (or was created/standardized) in every service directory that has a `download_wheels.ps1` (agent, auth, chat, core, direct_chat, embedding, extraction, generation, review, upload, workbench services).
    -   [X] Confirmed it correctly copies wheels from `../backend_wheels` to the service-local `./wheels` based on `downloaded_wheels_list.txt`, using a standardized template.
-   **[IN PROGRESS] Fix "No downloaded wheel found for requirement..." warnings**
    -   [IN PROGRESS] **Investigate `auth_service`:** Determine why packages like `python-multipart`, `psycopg2-binary`, etc., are reported as not found locally despite being in `backend_wheels`.
        -   [X] Enhanced `auth_service/download_wheels.ps1` with diagnostics for list generation.
        -   [X] `auth_service/copy_wheels_from_list.ps1` was standardized.
    -   [IN PROGRESS] **Investigate `chat_service`:** Similar investigation for packages like `langchain-core`, `python-dotenv`, etc.
        -   [X] Enhanced `chat_service/download_wheels.ps1` with diagnostics for list generation.
        -   [X] `chat_service/copy_wheels_from_list.ps1` was standardized.
    -   [ ] Review other services for similar warnings once they are successfully processed by `download_all_wheels.ps1` (recommend running `download_all_wheels.ps1` and checking output after these changes).
-   **[ ] NLTK Data Handling for `extraction_service`**
    -   [ ] Confirm NLTK data downloaded by `extraction_service/download_wheels.ps1` is included in its `${ServiceName}_airgapped.zip`.
    -   [ ] Ensure its `Dockerfile` correctly copies and utilizes this packaged NLTK data.

## III. Dockerfile Standardization

-   **[ ] Review/Create `Dockerfile` for each airgappable service**
    -   [ ] Ensure each service (e.g., `core_service`, `direct_chat_service`, `embedding_service`, `extraction_service`, `generation_service`, `review_service`, `upload_service`, `workbench_service`, etc.) has a `Dockerfile`.
    -   [ ] Standardize Dockerfiles to use the multi-stage build pattern outlined in `Airgap-Plan.md`.
    -   [ ] Tailor for service-specific build steps or runtime configurations (e.g., entrypoints, ENV VARS).

## IV. Documentation & Plan Updates

-   **[ ] Update `Airgap-Plan.md`**
    -   [ ] Reflect the current PowerShell-centric script ecosystem (`download_all_wheels.ps1` and service-specific `.ps1` scripts) for preparation.
    -   [ ] Clearly state that deployment scripts will be PowerShell (`.ps1`) and Bash (`.sh`).
    -   [ ] Update the list of services with implemented/verified airgapped support.
    -   [ ] Add details about the role and function of `copy_wheels_from_list.ps1`.
    -   [ ] Incorporate findings/solutions for complex dependencies (e.g., `onnx` in `embedding_service`).
-   **[ ] Service-Specific READMEs for complex dependencies**
    -   [ ] For services like `embedding_service` with difficult dependencies (`onnx`), document any manual preparation steps, version compromises, or pre-built image recommendations in their respective READMEs.

## V. Helper & Verification Scripts (Nice-to-haves)

-   **[ ] Create Package Verification Script (PowerShell)**
    -   [ ] Script to check contents of `DeploymentZIPs` (e.g., all services zipped, essential files present in zips).
-   **[ ] Create Airgapped Service Lister/Deployer Script (PowerShell/Bash)**
    -   [ ] A helper in the airgapped environment to list services available in the transferred `DeploymentZIPs` and prompt which to deploy (could be part of `airgapped_deploy.sh/.ps1`).

## VI. Testing

-   **[ ] End-to-End Test for each service**
    -   [ ] Prepare package in a "connected" environment (using PowerShell scripts).
    -   [ ] Transfer to a simulated "airgapped" environment.
    -   [ ] Deploy using `airgapped_deploy.sh/.ps1`.
    -   [ ] Verify service functionality.

---

Next Steps: Review this TODO list and prioritize items. 