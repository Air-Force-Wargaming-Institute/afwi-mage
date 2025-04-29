# Plan for Fully Offline Docker Builds (Frontend & Backend)

**Goal:** To enable building and running the entire application (frontend and backend services) via Docker Compose in an environment with no internet access. This involves preparing all dependencies (system packages, language packages, base images, models, data) beforehand and modifying build scripts/Dockerfiles to use these local resources.

**Contact:** Parker

---

## Phase 1: Preparation (Internet Connection Required)

*Execute these steps on a machine with internet access.*

**1. Create Offline Artifacts Directory Structure:**

   Create a central location outside the project source to store downloaded artifacts.

   ```bash
   # In your workspace root (e.g., /e:/Git Repos/afwi-multi-agent-generative-engine/)
   mkdir offline_packages
   mkdir offline_packages/images
   mkdir offline_packages/backend_wheels
   mkdir offline_packages/backend_debs # (Only if using .deb method for system deps)
   mkdir offline_packages/nltk_data
   ```

**2. Download Base Docker Images:**

   Identify and save all base Docker images used by services in `backend/docker-compose.yml` and `frontend/Dockerfile`.

   *   **Identify:**
       *   `postgres:13` (from `docker-compose.yml`)
       *   `traefik:v3.3.4` (from `docker-compose.yml`)
       *   `redis/redis-stack:7.4.0-v3-x86_64` (from `docker-compose.yml`)
       *   `busybox` (from `docker-compose.yml`)
       *   `vllm/vllm-openai:latest` (from `backend/vLLM/Dockerfile.template`)
       *   `node:20-alpine` (or similar, check `frontend/Dockerfile`)
       *   `mage-common:latest` (Custom base image, needs build first)
       *   `mage-gpu:latest` (Custom base image, needs build first)
       *   Any base images used *within* `mage-common` or `mage-gpu` Dockerfiles (e.g., `python:3.11-slim`, `nvidia/cuda:...`). *Needs inspection of their Dockerfiles.*
   *   **Build Custom Bases (if not already built):**
       ```bash
       # From workspace root
       docker build -t mage-common:latest -f Dockerfile-multistage . --target common-stage
       docker build -t mage-gpu:latest -f Dockerfile-multistage . --target gpu-stage
       ```
   *   **Save Images:**
       ```powershell
       docker save postgres:13 -o offline_packages/images/postgres_13.tar
       docker save traefik:v3.3.4 -o offline_packages/images/traefik_v3.3.4.tar
       docker save redis/redis-stack:7.4.0-v3-x86_64 -o offline_packages/images/redis_stack_7.4.0.tar
       docker save busybox:latest -o offline_packages/images/busybox.tar
       docker save vllm/vllm-openai:latest -o offline_packages/images/vllm_openai.tar
       docker save node:20-alpine -o offline_packages/images/node_20_alpine.tar # Adjust tag if different
       docker save mage-common:latest -o offline_packages/images/mage_common.tar
       docker save mage-gpu:latest -o offline_packages/images/mage_gpu.tar
       # Add saves for python, nvidia/cuda etc. after inspecting base Dockerfiles
       ```

**3. Download Backend System Dependencies (`apt-get` packages):**

   **Method A (Recommended): Pre-build into Custom Base Images**
   *   **Identify:** List *all* unique packages from `apt-get install` commands across *all* backend Dockerfiles (`core_service`, `upload_service`, `extraction_service`, `embedding_service`, etc.).
   *   **Modify `mage-common`/`mage-gpu` Dockerfiles:** Create *new* Dockerfiles (e.g., `Dockerfile-mage-common-offline`, `Dockerfile-mage-gpu-offline`).
   *   In these new Dockerfiles, `FROM` the original base (e.g., `python:3.11-slim`) and add *one* `RUN apt-get update && apt-get install -y --no-install-recommends <ALL_PACKAGES_LISTED_HERE> && rm -rf /var/lib/apt/lists/*`.
   *   **Build Offline Base Images:**
       ```bash
       docker build -t mage-common-offline:latest -f Dockerfile-mage-common-offline .
       docker build -t mage-gpu-offline:latest -f Dockerfile-mage-gpu-offline .
       ```
   *   **Save Offline Base Images:**
       ```powershell
       docker save mage-common-offline:latest -o offline_packages/images/mage_common_offline.tar
       docker save mage-gpu-offline:latest -o offline_packages/images/mage_gpu_offline.tar
       ```
   *   *(Skip Method B if using this)*

   **Method B (Complex): Download `.deb` Packages**
   *   **Identify:** Same as Method A.
   *   **Download:** On a matching Linux distribution (e.g., Debian/Ubuntu container/VM), download all packages and their *recursive* dependencies. This is difficult to get right.
       ```bash
       # Example for one package (repeat for all, run in Linux):
       apt-get update
       apt download $(apt-cache depends --recurse --no-recommends --no-suggests --no-conflicts --no-breaks --no-replaces --no-enhances build-essential | grep "^\w")
       # Move all downloaded .deb files to offline_packages/backend_debs
       ```
   *   *(Use this method only if custom base images are not feasible)*

**4. Download Backend Python Packages (`.whl` files):**

   *   **Identify:** All `requirements.txt` files in backend services. Any packages installed directly via `pip install` in backend Dockerfiles (e.g., `unstructured`, `llama-cpp-python`).
   *   **Download:** Use `pip download` into the *single* `offline_packages/backend_wheels` directory. **Run this in a Linux environment (WSL/Docker) using a matching Python version (e.g., 3.11) for best compatibility.**
       ```bash
       # Example using Docker (run from workspace root):
       docker run --rm -v "$(pwd)/offline_packages/backend_wheels:/wheels" -v "$(pwd)/backend:/backend" python:3.11-slim bash -c " \
         pip install --upgrade pip wheel && \
         pip download --dest /wheels -r /backend/core_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/chat_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/auth_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/agent_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/upload_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/wargame_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/embedding_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/workbench_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/extraction_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/generation_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/direct_chat_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         pip download --dest /wheels -r /backend/review_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         # Add direct installs:
         pip download --dest /wheels unstructured==0.10.16 unstructured-inference==0.6.6 llama-cpp-python==0.2.11 --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         # Add pytesseract/layoutparser if used:
         # pip download --dest /wheels \"pytesseract>=0.3\" \"layoutparser[tesseract]>=0.3\" --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: && \
         echo 'Backend wheel downloads complete.' \
       "
       ```

**5. Prepare Frontend Node Packages:**

   *   **Ensure Lockfile:**
       ```bash
       cd frontend
       npm install --package-lock-only # Or yarn install --frozen-lockfile
       cd ..
       ```
   *   **Install & Archive:**
       ```bash
       cd frontend
       npm ci # Performs a clean install based on package-lock.json
       tar -czf ../offline_packages/frontend_node_modules.tar.gz node_modules
       cd ..
       # Optional: Clean up node_modules locally if desired after archiving
       # rm -rf frontend/node_modules
       ```

**6. Download Models and Data:**

   *   **LLM Models:**
       ```bash
       # Ensure git-lfs is installed (git lfs install)
       # Clone model specified in backend/Config.env (VLLM_Model_Folder)
       # Example:
       git clone https://huggingface.co/huihui-ai/DeepHermes-3-Llama-3-8B-Preview-abliterated backend/vLLM/models/DeepHermes-3-Llama-3-8B-Preview-abliterated
       ```
   *   **Embedding Models (Ollama):**
       *   Determine how Ollama loads models offline (e.g., pre-pulling into a volume, copying specific files). Refer to Ollama airgap documentation.
       *   Download required models (e.g., `nomic-embed-text`) and place them where needed for Ollama's offline loading mechanism (potentially `backend/ollama/models/` or a path mounted to `/root/.ollama` inside the container).
   *   **NLTK Data:**
       ```bash
       # Example for packages needed by extraction_service
       python -m nltk.downloader -d offline_packages/nltk_data punkt averaged_perceptron_tagger
       ```

---

## Phase 2: Airgapped Environment Setup

*Execute these steps on the target airgapped machine.*

**1. Transfer Artifacts:**

   *   Copy the entire `offline_packages` directory to the airgapped machine.
   *   Copy the entire project source code (`afwi-multi-agent-generative-engine`) to the airgapped machine.

**2. Load Docker Images:**

   ```powershell
   # Load all base images, custom base images, etc.
   docker load -i offline_packages/images/postgres_13.tar
   docker load -i offline_packages/images/traefik_v3.3.4.tar
   docker load -i offline_packages/images/redis_stack_7.4.0.tar
   docker load -i offline_packages/images/busybox.tar
   docker load -i offline_packages/images/vllm_openai.tar
   docker load -i offline_packages/images/node_20_alpine.tar # Adjust tag if different
   # Add loads for python, nvidia/cuda etc.
   # Load custom base images (Offline Method A)
   docker load -i offline_packages/images/mage_common_offline.tar
   docker load -i offline_packages/images/mage_gpu_offline.tar
   # OR Load original custom base images (Offline Method B)
   # docker load -i offline_packages/images/mage_common.tar
   # docker load -i offline_packages/images/mage_gpu.tar
   ```

**3. Prepare Local Dependencies:**

   *   **Frontend:** Unpack `node_modules`.
       ```bash
       # From workspace root on airgapped machine
       tar -xzf offline_packages/frontend_node_modules.tar.gz -C frontend/
       ```
   *   **Backend System (.deb - Method B only):** Ensure `offline_packages/backend_debs` is accessible.
   *   **NLTK Data:** Ensure `offline_packages/nltk_data` is accessible.
   *   **Models:** Ensure models cloned/downloaded in Phase 1 are correctly placed within the project structure (e.g., `backend/vLLM/models/<model_folder>`).

---

## Phase 3: Code/Configuration Modifications (Apply before build)

*These changes should ideally be made **before** transferring the code to the airgapped environment, but can be done there if necessary.*

**1. Backend Dockerfiles (System Dependencies):**

   *   **If using Method A (Custom Offline Base Images):**
       *   In **all** backend service Dockerfiles (`core_service/Dockerfile`, `upload_service/Dockerfile`, etc.):
           *   Change `FROM mage-common:latest` to `FROM mage-common-offline:latest`.
           *   Change `FROM mage-gpu:latest` to `FROM mage-gpu-offline:latest`.
           *   **Remove** all `RUN apt-get update && apt-get install ...` lines.
   *   **If using Method B (.deb Packages):**
       *   In **all** backend service Dockerfiles:
           *   **Remove** `apt-get update`.
           *   Add `COPY offline_packages/backend_debs /tmp/debs/` near the top (adjust source path relative to build context).
           *   Change `RUN apt-get install -y <packages...>` to `RUN dpkg -i /tmp/debs/*.deb || apt-get -f install --no-install-recommends -y`. *Warning: This is less reliable.*

**2. Backend Dockerfiles (Python Dependencies):**

   *   Modify **all** backend service Dockerfiles to use multi-stage builds for wheels:
       ```dockerfile
       # Stage 1: Copy wheels (adjust source path as needed relative to build command)
       FROM scratch as wheels_copier
       COPY offline_packages/backend_wheels /wheels

       # Stage 2: Actual build
       # FROM mage-common:latest  OR mage-common-offline:latest
       FROM mage-common-offline:latest # Example using offline base

       WORKDIR /app

       # Remove apt-get installs if using offline base image

       # Copy wheels from the first stage
       COPY --from=wheels_copier /wheels /app/wheels

       # Copy requirements and install using local wheels
       COPY requirements.txt .
       # Ensure ALL pip install commands use --no-index --find-links
       RUN pip install --no-index --find-links=/app/wheels -r requirements.txt
       # Example for embedding_service:
       # RUN pip install --no-index --find-links=/app/wheels unstructured==0.10.16 ... --no-deps

       # Copy application code
       COPY . .

       # Ensure editable installs also use offline wheels
       # RUN pip install --no-index --find-links=/app/wheels -e . (for core_service)

       # ... rest of Dockerfile ...
       ```

**3. Backend Dockerfiles (NLTK Data):**

   *   In `backend/extraction_service/Dockerfile` (and any others using NLTK):
       *   **Remove** the `RUN python -m nltk.downloader ...` line.
       *   Add `COPY offline_packages/nltk_data /app/nltk_data` (adjust source path relative to build context and destination path based on where NLTK expects it, usually `/usr/share/nltk_data` or configurable via `NLTK_DATA` env var).

**4. Frontend Dockerfile (`frontend/Dockerfile`):**

   *   Modify to copy the pre-installed `node_modules` instead of running `npm install`.
       ```dockerfile
       # FROM node:20-alpine # Or your original base

       WORKDIR /app

       # Copy package.json and lock file (still good practice)
       COPY package*.json ./

       # Copy the pre-built node_modules
       COPY node_modules ./node_modules

       # Copy the rest of the application source code
       COPY . .

       # Run the build command (if applicable)
       RUN npm run build # Or your build script

       # EXPOSE 3000 # Or your frontend port
       # CMD ["npm", "start"] # Or your start command
       ```

**5. Build Scripts (`Run-MAGE.ps1`):**

   *   Verify that paths used for copying/referencing offline artifacts (like `Dockerfile.template` generation or any checks) are correct relative to the script's execution directory in the airgapped environment. The current setup using `$PSScriptRoot` and relative paths should generally work if the structure is maintained.

---

## Phase 4: Offline Build & Deployment

*Execute these steps on the target airgapped machine.*

**1. Navigate to Workspace Root:**

   ```powershell
   cd /path/to/afwi-multi-agent-generative-engine
   ```

**2. Run the Build:**

   *   The primary script should now handle the build process using the local artifacts.
       ```powershell
       ./Run-MAGE.ps1
       ```
   *   Alternatively, if `Run-MAGE.ps1` doesn't orchestrate everything, run manually:
       ```powershell
       # If custom base images weren't built/loaded via Run-MAGE.ps1
       # docker build -t mage-common-offline:latest -f Dockerfile-mage-common-offline .
       # docker build -t mage-gpu-offline:latest -f Dockerfile-mage-gpu-offline .

       # Build all services defined in docker-compose.yml
       docker compose build --no-cache # Use --no-cache for the first offline build to ensure changes apply
       ```

**3. Start Services:**

   ```powershell
   docker compose up -d
   ```

---

## Phase 5: Verification & Troubleshooting

*   **Check Container Logs:** `docker logs <container_name>` for each service (e.g., `docker logs afwi-multi-agent-generative-engine-core-1`). Look for errors related to missing files, packages, or connection attempts.
*   **Verify Service Endpoints:** Use `curl` or browser access (if available on the airgapped network) to check key service endpoints (API Gateway, individual services if mapped).
*   **Common Issues:**
    *   **Missing Wheels:** `pip install` fails with "No matching distribution found". Ensure the wheel for the correct platform/python version is in `offline_packages/backend_wheels`.
    *   **Incorrect Wheel Platform:** Build succeeds, but runtime error occurs (e.g., `ImportError: ... no matching architecture`). Ensure wheels were downloaded for the correct target architecture (`manylinux..._x86_64`).
    *   **Missing System Deps:** Runtime errors related to missing shared libraries (`.so` files) or commands. Double-check the package list and ensure the custom base image (Method A) or `.deb` installation (Method B) was successful.
    *   **Base Image Not Found:** `docker build` or `docker compose build` fails with "manifest not found" or "pull access denied". Ensure the required base image `.tar` was loaded correctly in Phase 2.
    *   **Path Errors:** `COPY failed: file not found`. Verify the source paths in `COPY` commands within Dockerfiles relative to the build context (usually the directory containing the Dockerfile or the directory `docker build` / `docker compose build` is run from). Check paths in `Run-MAGE.ps1`.
    *   **Frontend Build Issues:** `npm run build` fails. Check logs; often related to missing dependencies if `node_modules` wasn't correctly prepared/copied.

---

**Owner:** Parker
**Status:** Plan Created (YYYY-MM-DD) 