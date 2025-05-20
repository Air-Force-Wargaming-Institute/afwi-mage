**This is the plan for getting MAGE to operate utilizing kubernetes**

## 1. Core Principles for Air-Gapped Kubernetes Deployment

*   **Private Container Registry (Harbor):** Essential for storing and distributing Docker images (application images, base images, Kubernetes components, third-party tools like Harbor itself) within the air-gapped network. All images must be pre-loaded into Harbor.
*   **Offline Artifact Repository (Sonatype Nexus Repository OSS):** A centralized repository manager (Sonatype Nexus) will be crucial for hosting OS packages (Ubuntu .deb files via an `apt` proxy/mirror), Python packages (`pypi` proxy/hosted), Helm charts (`helm` proxy/hosted), and raw artifacts (binaries, installers, scripts). This ensures all software dependencies are sourced internally.
*   **Dependency Management:** All software dependencies must be available within the air-gapped environment, primarily through Harbor (for container images) and Sonatype Nexus Repository OSS (for OS packages, language libraries, Helm charts, binaries), or be bundled into container images. Build processes must not attempt external downloads.
*   **Kubernetes Distribution and OS Choice:** RKE2 will be used as the Kubernetes distribution, running on **Ubuntu Server 24.04 LTS (Noble Numbat)** or the latest available LTS at time of deployment as the underlying OS for all nodes.
*   **Security Considerations:**
    *   **Image Security:** Scan images for vulnerabilities *before* transferring to the air-gapped environment. Use hardened base images.
    *   **NetworkPolicies:** Implement strict network policies to control traffic flow between pods and namespaces.
    *   **RBAC (Role-Based Access Control):** Enforce least privilege for users and service accounts.
    *   **Secrets Management:** Securely manage secrets using Kubernetes Secrets, potentially integrated with an external secrets manager like HashiCorp Vault (if an air-gapped version is available and approved).
    *   **Pod Security Admission/Policies:** Enforce security contexts for pods and containers.
*   **Installation and Configuration:** All installation media (Kubernetes components, OS images (specifically Ubuntu Server 24.04 LTS ISOs or latest LTS), private registry installers) and configuration files must be available offline. Configuration management tools (e.g., Ansible) must also operate in a disconnected mode.
*   **Update and Upgrade Strategies:** Develop a robust process for updating the OS (Ubuntu Server 24.04 LTS or latest LTS), Kubernetes cluster, and applications. This involves securely transferring new images, manifests, and patches into the air-gapped environment.
*   **Logging and Monitoring:** Deploy offline-capable solutions for logging (e.g., EFK stack - Elasticsearch, Fluentd, Kibana) and monitoring (e.g., Prometheus, Grafana). Ensure sufficient storage for logs and metrics.
*   **Licensing Compliance:** Verify all software licenses (OS - Ubuntu Server 24.04 LTS or latest LTS, Kubernetes, applications, tools) are compatible with air-gapped deployment and usage.
*   **Helm Chart Management:** If Helm is used, charts and their dependent images must be available in the private registry or as packaged files.
*   **Operator Management:** Kubernetes Operators used for managing stateful applications or other components must be installable and operable offline.
*   **Data Backup and Recovery:** Implement reliable backup and restore procedures for persistent data (databases, application data, configuration).

## 2. Analysis of MAGE Application for Kubernetes Deployment

*   **Service Inventory and Dependencies:** (To be populated based on `docker-compose.yml` and `project_structure.md`)
*   **Container Image Analysis:**
    *   **General Observations (Critical Discrepancy RESOLVED):**
        *   **`Dockerfile.base` has been provided. It IS the base for `core`, `agent`, `extraction`, `upload`, `embedding`, `direct_chat`, `workbench`, `auth`, and `chat` services.** This clarifies that these services receive their primary OS and Python dependencies from `mage-base:latest`.
        *   **Air-Gap Strategy for `mage-base:latest` is PARAMOUNT.** Making `Dockerfile.base` buildable offline is key to air-gapping ~9 services.
        *   **Details of `Dockerfile.base`:**
            *   Base: `python:3.11-slim` (needs to be in private registry).
            *   OS Packages (`apt-get`): Installs `build-essential`, `libpq-dev`, `postgresql-client`, `libmagic1`, `libreoffice` suite, `python3-uno`, `tesseract-ocr`, `libtesseract-dev`, `poppler-utils`, `pkg-config`, `curl`. These `apt` sources must be internal, or packages vendored for air-gapped builds.
            *   Python Packages (`pip install`):
                *   Installs from a root `requirements.txt`.
                *   Installs CPU versions of `torch`, `torchvision`, `torchaudio` (from external `--index-url`).
                *   Installs `unstructured`, `unstructured-inference`, `pytesseract`, `layoutparser`, `llama-cpp-python`.
                *   All these pip installs require a private PyPI or vendored packages.
            *   NLTK Data: Uses `nltk.downloader` for `punkt` and `averaged_perceptron_tagger`. This will fail offline and needs to be replaced by copying pre-downloaded NLTK data.
            *   Sets `CUDA_VISIBLE_DEVICES=-1` by default.
        *   Public base images for other services (ensure specific version tags, not `latest`, are used and mirrored to a private registry):
            *   `wargame_service`: `python:3.11-slim`
            *   `db`: `postgres:13`
            *   `transcription_service`: `nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04`
            *   `report_builder_service`: `python:3.12-slim`
            *   `vllm` service (from `vLLM/Dockerfile`): `vllm/vllm-openai:latest`
            *   `ollama` service (from `ollama/Dockerfile`): `ollama/ollama:latest`
    *   **OS Package Installation (`apt-get`):**
        *   `workbench_service`: Installs `build-essential`, `git`, `ffmpeg`, `libsm6`, `libxext6`.
        *   `transcription_service`: Installs `git`, `ffmpeg`, `software-properties-common`, adds `ppa:deadsnakes/ppa` (problematic for air-gap), and installs `python3.10`.
        *   `report_builder_service`: Installs `pandoc`, `build-essential`, `wget`, `python3-dev`.
        *   All `apt-get` operations need to be adapted for offline builds (use internal repositories, pre-downloaded `.deb` packages, or ensure dependencies are in `mage-base`). PPAs cannot be used.
    *   **Python Package Installation (`pip install`):**
        *   Most services install packages from a `requirements.txt` file. These will require a private PyPI, vendored packages, or pre-installation in `mage-base`.
        *   `core_service` & `workbench_service`: Their Dockerfiles also run `pip install -r requirements.txt`. If these are the same as or a subset of the root `requirements.txt` installed in `Dockerfile.base`, these steps might be redundant or could be optimized if their dependencies are fully met by `mage-base:latest`.
        *   `transcription_service`: Upgrades pip, installs `torch`, `torchvision`, `torchaudio` from a specific `--index-url` (GPU version - `cu118` - needs offline wheels), installs `setuptools-rust`, and critically, installs `whisperX` directly from GitHub (`git+https://github.com/m-bain/whisperX.git`). This Git dependency is a major blocker and must be replaced with a packaged version.
        *   `wargame_service`, `report_builder_service` also install from `requirements.txt`.
    *   **Model Handling & Storage:**
        *   `vLLM/Dockerfile`: `ADD`s a model (`DeepHermes-3-Llama-3-8B-Preview-abliterated`) directly into the image from its build context (`backend/vLLM/models/`).
        *   `ollama/Dockerfile`: `COPY`s a model (`nomic-embed-text-v1.5.f32.gguf`) directly into the image from its build context (`backend/ollama/`).
        *   Both approaches make images large but self-contained for air-gapping. Model updates require image rebuilds. An alternative for Kubernetes is storing models on PVs/PVCs for more flexible updates, but requires pre-populating these volumes.
        *   `transcription_service`: Uses `MODEL_CACHE_DIR` and `HF_HOME` environment variables, with Docker Compose mounting host volumes (`../data/transcription/whisper_models`, `../data/transcription/huggingface_cache`) to these locations. Models are expected to be externally persisted. For Kubernetes, this means pre-populated PVs/PVCs.
        *   `extraction_service`: NLTK data (3.5GB) downloaded on first build and cached in `nltk_data_volume`. This needs to be pre-loaded onto a PVC or baked into an image for Kubernetes.
    *   **Entrypoints & CMDs:**
        *   `upload_service`: CMD starts `soffice` (LibreOffice) in the background and then `uvicorn`. Consider splitting into two containers or using a supervisor if `soffice` is a long-running service. Ensure `mage-base` (or the service's new base if `mage-base` is removed) includes LibreOffice.
        *   `embedding_service`: CMD is `python3 /app/docker-start.py` (custom script to launch Uvicorn, no external calls observed).
        *   `vLLM/Dockerfile`: Uses `/entrypoint.sh`. Script forces `--tensor-parallel-size=2` and `--gpu-memory-utilization=0.88`; starts `vllm.entrypoints.openai.api_server`. No external calls. Kubernetes compatible.
        *   `ollama/Dockerfile`: Uses `/entrypoint.sh`. Script checks for `nomic-embed-text` model, runs `ollama create -f Modelfile` if not found (requires `Modelfile` in image and offline create capability), then starts `ollama serve`. Potential issue if `Modelfile` is missing or `ollama create` attempts online actions despite offline ENV VARS.
        *   `auth_service/Dockerfile`: Uses `/entrypoint.sh`. Script waits for `db` service, creates `authdb` if needed (uses `psql`, `pg_isready`), creates tables, runs `init_db.py`. Hardcoded `PGPASSWORD=password` is a security risk; should use secrets. Otherwise, Kubernetes compatible.
        *   `direct_chat_service`, `workbench_service`: Use `uvicorn --reload`. Remove `--reload` for production.
    *   **GPU Requirements:**
        *   `transcription_service`: Based on `nvidia/cuda` image, uses PyTorch with CUDA. Docker Compose reserves 1 GPU.
        *   `vllm`: Docker Compose reserves 2 GPUs.
        *   `ollama`: Implicitly needs GPU if using GGUF models effectively.
    *   **Security & Configuration:**
        *   `transcription_service`: Hardcoded `HF_TOKEN`. Must be removed and managed as a Kubernetes Secret.
        *   `vLLM`: Uses `ipc: host`. This needs careful consideration for Kubernetes (Pod `hostIPC: true`).
        *   Environment variables are extensively used for configuration, which aligns well with ConfigMaps and Secrets in Kubernetes.
    *   **Missing `Modelfile` for `ollama` service:** The `ollama/entrypoint.sh` refers to a `Modelfile` for `ollama create`. This file and its contents are needed if this step is required.
*   **Configuration Management:** (Current use of environment variables, config files)
*   **Persistent Data Requirements:** (Database volumes, NLTK data, AI/ML model storage, uploaded files, logs, session data)
*   **Networking:** (Inter-service communication patterns, API Gateway functionality, exposure requirements)
*   **Resource Requirements:** (CPU, memory, GPU specifications for services like `transcription`, `vLLM`, `ollama`, `embedding`)
*   **Secrets Management:** (Database credentials, API keys, JWT secrets, other sensitive tokens)
*   **Initialization Logic:** (Current `init-data` service, database schema creation in `init-multiple-databases.sh`)

## 3. Kubernetes Implementation Plan for MAGE

*   **Local Development Testing Strategy (Docker Desktop):**
    *   Before deploying to a full RKE2 environment, initial testing of Kubernetes manifests and basic service interactions will be performed on the development machine using Docker Desktop's built-in Kubernetes cluster.
    *   **Objectives:**
        *   Validate the syntax and structure of Kubernetes YAML files or Helm charts.
        *   Test deployment of core non-GPU services (e.g., databases, API gateway, core application logic).
        *   Verify basic inter-service communication, ConfigMap/Secret consumption, and Ingress routing.
        *   Familiarize with `kubectl` and Kubernetes deployment workflows.
    *   **Image Management for Local Testing:**
        *   Initially, public base images might be used from Docker Hub for simplicity if a local Harbor instance is not yet running or is too resource-intensive for the development machine.
        *   Application images built locally will be used.
        *   As progress is made, a lightweight local registry or a local Harbor instance might be incorporated to better simulate the air-gapped image sourcing.
    *   **Limitations of Local Testing:**
        *   Full GPU-accelerated workload testing will likely be unrepresentative or not feasible.
        *   It does not simulate the true air-gapped nature, the full RKE2 environment, multi-node behavior, or production-level resource constraints and security hardening (DISA STIGs).
        *   This step is primarily for early manifest validation and developer familiarization, not a replacement for staging/production environment testing.

*   **Prerequisites:**
    *   **Private Docker Registry (Harbor):** Setup and populate Harbor. This includes Harbor's own images, all MAGE application images, base images, and any third-party tool images. (Details in relevant Harbor setup sections).
    *   **Offline Artifact Repository (Sonatype Nexus Repository OSS):** Setup and populate Sonatype Nexus Repository OSS with `apt` (Ubuntu 24.04 LTS mirror), `pypi`, `helm`, and `raw` repositories. This includes OS packages, Python packages, Helm charts, and binaries like RKE2/Harbor/Nexus installers.
    *   **Kubernetes Cluster:** Provisioned in the air-gapped environment. Confirmed: **RKE2** on **Ubuntu Server 24.04 LTS**. Worker nodes will have access to **three Nvidia L40S GPUs** each where applicable. **(Recommendation)** RKE2 is a good choice for security-conscious (aligns with DISA STIGs) and air-gapped environments due to its focus on security features and simplified offline installation. **(Recommendation)** Ensure the NVIDIA Kubernetes device plugin is installed and configured on worker nodes with GPUs to enable scheduling of GPU-accelerated workloads. Ensure nodes have appropriate resources (CPU, memory) and network connectivity within the cluster.
    *   **Helm (Optional but Recommended):** If using Helm, ensure Helm CLI is available in the deployment environment and charts are pre-packaged or in the offline artifact repository.
    *   **kubectl:** Configured to interact with the air-gapped Kubernetes cluster.
*   **Kubernetes Manifests Strategy (General Approach - to be detailed per service):**
    *   **Namespaces:** Create dedicated namespaces for better organization and resource management (e.g., `mage-services`, `mage-data`, `mage-infra`).
    *   **Workload Resources:**
        *   `Deployments`: For stateless services (most of the MAGE application services like `core`, `agent`, `upload`, `extraction`, `embedding`, `chat`, `direct_chat`, `workbench`, `report_builder`, `wargame`).
        *   `StatefulSets`: For stateful services:
            *   `db` (PostgreSQL): Requires stable network identity and persistent storage.
            *   `redis`: If used for persistent or semi-persistent data requiring stable identity.
            *   Potentially `vLLM` and `ollama` if model-loading or state benefits from stable pod names/storage, though usually managed as `Deployments` if models are on shared PVCs or baked in.
    *   **Service Discovery & Networking:**
        *   `Services` (ClusterIP): For internal communication between pods (e.g., `core-service` exposing port 8000 internally).
        *   `Ingress` (using Traefik as Ingress Controller): To expose the `api_gateway` functionality to users/clients within the air-gapped network. Traefik `IngressRoute` and `Middleware` CRDs will be used to replicate existing routing and middleware logic.
    *   **Configuration:**
        *   `ConfigMaps`: For all non-sensitive configurations currently managed by environment variables in `docker-compose.yml` or configuration files copied into images (unless those files contain secrets).
        *   `Secrets`: For all sensitive data: database passwords (`POSTGRES_PASSWORD`), JWT secrets (`SECRET_KEY`), API keys (`HF_TOKEN` - which should be removed from Dockerfile and managed here), any other credentials.
    *   **Storage:**
        *   `PersistentVolumeClaims` (PVCs): For each service requiring persistent storage. See "Persistent Data Requirements" for more details. **(Info)** An LLM like the 70B parameter model is ~43GB. Vector stores and databases will also require significant storage. The specific storage solutions for PVs are still to be determined (TBD). **(Recommendation)** Plan for significant, high-performance, and reliable persistent storage (e.g., backed by NFS, SAN, or a distributed storage solution like Ceph, if available, or appropriately configured local SSDs). The choice will depend on available infrastructure and performance needs, especially for model serving and vector database I/O.
            *   `db`: For PostgreSQL data (`postgres_data` volume).
            *   `extraction_service`: For NLTK data (`nltk_data_volume`).
            *   `transcription_service`: For Whisper and Hugging Face model caches (`/app/.cache/whisperx`, `/app/.cache/huggingface`).
            *   General `../data` mount: This is used by many services (`core`, `agent`, `upload`, `extraction`, `embedding`, `wargame`, `workbench`, `direct_chat`). This needs to be broken down. If it's for shared read-write access, a ReadWriteMany (RWX) capable PV (like NFS) would be needed, or re-architect to use dedicated RWO volumes and service-to-service communication for data sharing. If it's primarily for uploads, logs, and outputs, specific PVCs per service or for shared log/output aggregators should be defined.
            *   `ollama_data`: For Ollama models if not baked into the image, and other operational data.
            *   `vLLM_models` (if not baking into image): For vLLM models.
        *   `PersistentVolumes` (PVs): Must be provisioned by the cluster administrator in the air-gapped environment, matching the `StorageClass` and size requirements of PVCs. Could be backed by local storage (for single-node dev/test), NFS, or other SAN/block storage solutions available.
        *   `StorageClasses`: Define different types of storage if available (e.g., `fast-ssd`, `bulk-hdd`).
    *   **Initialization & Lifecycle:**
        *   `InitContainers`: Ideal for:
            *   Running database schema migrations/initialization (replacing `db/init-multiple-databases.sh` logic, triggered against the PostgreSQL service after it's ready).
            *   Pre-populating NLTK data to a volume if not baked into the image.
            *   Waiting for dependent services (e.g., waiting for database to be ready before an app starts).
            *   Replacing the `init-data` Docker Compose service for creating initial directory structures on volumes.
        *   `Jobs`/`CronJobs`: For any batch tasks, cleanup operations, or scheduled reports (if applicable).
        *   **Probes (Liveness, Readiness, Startup):** Define for all service Deployments/StatefulSets. Use the health check paths identified in `dynamic_conf.yaml` (e.g., `/api/auth/health`) for liveness and readiness probes. Startup probes can be useful for services with long start times.
    *   **Security & RBAC:**
        *   `ServiceAccounts`: Create dedicated service accounts for pods where necessary, avoiding default service accounts with broad permissions.
        *   `Roles` & `RoleBindings` / `ClusterRoles` & `ClusterRoleBindings`: Implement least-privilege access for service accounts and users. **(Info)** This is critical for DISA STIG compliance.
        *   `NetworkPolicies`: Restrict inter-pod communication to only what is explicitly required (e.g., `core_service` only allows ingress from `api_gateway` and specific internal services that need it). **(Info)** Essential for DISA STIG compliance.
    *   **Resource Management:**
        *   `ResourceQuotas`: Set per namespace to limit total CPU, memory, GPU, and storage.
        *   `LimitRanges`: Define default resource requests and limits for pods in a namespace.
        *   **GPU Resources:** For `transcription`, `vLLM`, `ollama`, specify GPU requests and limits (e.g., `nvidia.com/gpu: 1`, up to 3 based on Nvidia L40S availability per node). Requires NVIDIA device plugin for Kubernetes to be installed on nodes.
    *   `HorizontalPodAutoscalers` (HPAs): For stateless services like `core`, `agent`, `extraction`, etc., based on CPU/memory metrics (requires metrics server).
    *   `PodDisruptionBudgets` (PDBs): To ensure service availability during voluntary disruptions (e.g., node maintenance).
*   **Service-Specific Kubernetes Configuration (High-Level - details to be expanded):**
    *   **`db` (PostgreSQL):**
        *   `StatefulSet` with 1 replica (or more if planning replication).
        *   `Service` (ClusterIP) for internal access on port 5432.
        *   PVC for `/var/lib/postgresql/data`.
        *   `ConfigMap` for basic PostgreSQL config, `Secret` for `POSTGRES_USER`, `POSTGRES_PASSWORD`.
        *   `InitContainer` (or rely on existing entrypoint logic if `init-multiple-databases.sh` is robust) to create databases: `dbname`, `authdb`, `transcriptiondb`.
        *   Liveness/Readiness probes using `pg_isready`.
    *   **`redis`:**
        *   `StatefulSet` or `Deployment` (depending on persistence needs).
        *   `Service` (ClusterIP) on port 6379.
        *   PVC if persistence is needed.
        *   Liveness/Readiness probes (`redis-cli ping`).
    *   **`api_gateway` (Traefik):**
        *   Deployed as a `Deployment` or `DaemonSet` (if needing to run on specific edge nodes).
        *   `Service` of type LoadBalancer (if an external LB is available in air-gapped env) or NodePort to expose ports 80, 443 (for HTTPS, if configured).
        *   `ConfigMaps` for `traefik.yaml` static config.
        *   `IngressRoute` and `Middleware` CRDs to define routing for all backend services, mirroring `dynamic_conf.yaml`.
        *   Mount `/var/run/docker.sock` is NOT applicable. Traefik will use the Kubernetes API provider.
        *   Health checks via its own `/ping` endpoint and metrics.
    *   **Application Services (e.g., `core`, `agent`, `auth`, `chat`, `upload`, etc.):**
        *   `Deployment` for each.
        *   `Service` (ClusterIP) for each, exposing their respective ports.
        *   `ConfigMaps` for environment variables.
        *   `Secrets` for any sensitive env vars.
        *   Mount common data volumes (`../data`) via PVCs (strategy for this shared volume needs refinement - RWX or break down per service).
        *   Liveness/Readiness probes using their `/health` endpoints (e.g., `/api/core/health`).
    *   **GPU Enabled Services (`transcription`, `vLLM`, `ollama`):**
        *   As above, but `Deployments` will include `resources.limits.nvidia.com/gpu: <count>`.
        *   Ensure tolerations for GPU taints if nodes are dedicated.
        *   `vLLM`: Entrypoint script is fine. `hostIPC: true` on PodSpec if absolutely required for NCCL.
        *   `ollama`: Entrypoint script attempts to create model if not present. If `Modelfile` is needed, it must be in the image and offline-friendly. If models are baked in and Ollama registers them automatically, the `ollama create` logic in entrypoint might be simplified or removed. Probes to Ollama API endpoint.
*   **Data Management and Migration:**
    *   **NLTK Data (`extraction_service`):**
        *   Option 1 (Recommended for Air-Gap): Bake into `extraction_service` image or `mage-base` image.
        *   Option 2: Pre-populate a PVC. An `InitContainer` could potentially fetch from an internal artifact store if available.
    *   **AI Models (`vLLM`, `ollama`, `transcription_service`, general `/backend/models`):
        *   Option 1 (Baked-in - as currently done by `vLLM`, `ollama`): Simplifies deployment for specific models but increases image size and makes updates harder (image rebuild).
        *   Option 2 (PVCs - as done by `transcription_service` for caches): Create PVCs for models. Models must be pre-loaded onto these PVs in the air-gapped environment. This offers flexibility for model updates without image changes.
        *   A combination might be used: base models baked in, fine-tuned or frequently changing models on PVCs.
        *   The general `/models` directory used by `agent_service` needs a clear strategy (PVC or baked into `agent_service` or `mage-base`).
    *   **Database Initialization (`init-multiple-databases.sh`):**
        *   The script logic can be run by an `InitContainer` in the PostgreSQL `StatefulSet` pod, or by a one-off `Job` that runs after the PostgreSQL service is up.
        *   Ensure the script targets the Kubernetes service name for PostgreSQL.
    *   **Shared `/data` Volume:** The broad `../data:/app/data` mount needs careful planning.
        *   Identify subdirectories (uploads, logs, outputs, datasets, workbench, etc.).
        *   **Uploads:** Likely a dedicated PVC, potentially RWX if multiple services write, or RWO with a single service managing writes.
        *   **Logs:** Kubernetes typically handles stdout/stderr logs. For persistent aggregated logs, an EFK-like stack with its own storage is preferred over direct file writing by apps.
        *   **Outputs/Datasets/Workbench:** Dedicated PVCs per service or shared RWX PVCs if necessary. Evaluate access patterns.

## 4. Initial Findings and Areas Requiring More Information

*   **Initial Findings (from `docker-compose.yml`):**
    *   The application consists of approximately 15+ services, including databases, LLM servers, and custom application logic.
    *   Heavy reliance on Docker volumes for data persistence and shared data, which will map to Kubernetes PVs/PVCs.
    *   GPU resources are explicitly required for the `transcription` service and implicitly for `vLLM` and `ollama`.
    *   Traefik is already used as an API gateway, which can be leveraged or replaced by a Kubernetes-native Ingress solution (potentially still using Traefik as the Ingress controller).
    *   A single PostgreSQL instance serves multiple databases; this can be maintained in Kubernetes.
    *   Initialization script (`init-multiple-databases.sh`) for databases is present.
    *   `init-data` service for directory setup can be replaced by `InitContainers` or hostPath volumes with appropriate permissions if absolutely necessary (though generally discouraged for application data).
    *   `extra_hosts` directive for `host.docker.internal` needs investigation to understand its purpose and how to replicate or eliminate the need in Kubernetes.
*   **Information Needed from User (Intent & Environment):**
    *   **Kubernetes Environment:**
        *   Specific Kubernetes distribution to be used: **Confirmed: RKE2.**
        *   Underlying OS for Kubernetes Nodes: **Confirmed: Ubuntu Server 24.04 LTS (or latest LTS at deployment).**
        *   Details of the air-gapped network infrastructure (IP ranges, DNS availability, NTP server): **Still Pending.**
        *   Available storage solutions for PVs (e.g., NFS, local path provisioner, SAN, Ceph): **Still Pending.** **(Critical)** This is crucial given the large data volumes identified (e.g., ~43GB LLM, vector stores). The choice of storage solution will significantly impact performance and reliability.
        *   GPU availability and type on Kubernetes worker nodes: **Confirmed: Three Nvidia L40S GPUs per relevant node.** **(Recommendation)** Ensure the NVIDIA Kubernetes device plugin is installed on these worker nodes. Factor GPU memory and compute capabilities of the L40S into resource planning for services like `vLLM`, `ollama`, and `transcription`.
        *   How will the private container registry be hosted and accessed?: **Confirmed: Harbor will be used.** Further details on its specific deployment (VM, dedicated hardware, within K8s itself - though less common for the registry serving that K8s cluster initially) and resource allocation are pending.
    *   **Operational Requirements:**
        *   Performance, high availability, and scalability requirements for critical services: **Still Pending.**
        *   Specific security compliance standards to meet: **Confirmed: DISA STIGs.** **(Recommendation)** All aspects of the Kubernetes deployment, from the underlying OS hardening (apply relevant STIGs to the host OS) to RKE2 configuration (leverage RKE2's security features and hardening guides) and application security (NetworkPolicies, PodSecurityPolicies/Admission, RBAC, secrets management), must be meticulously aligned with DISA STIG requirements. Regular audits and vulnerability scanning (using air-gapped tools) will be necessary.
        *   Existing tools for CI/CD or configuration management that need to operate in an air-gapped mode: **Confirmed: None at this time, but potential for future use.** **(Recommendation)** Design the deployment process (e.g., using Helm with version-controlled values files, or Kustomize overlays) to be inherently automatable, even if initial deployments are manual. This will ease future transitions to CI/CD.
        *   How will cluster and application administration be performed in the air-gapped environment?: **Confirmed: Administration will primarily be performed using a Kubernetes Web UI, specifically Rancher.** **(Recommendation)** Rancher is an excellent choice for managing RKE2 clusters, offering comprehensive lifecycle management, user management, monitoring integration, and application deployment capabilities through its web UI. This aligns well with DISA STIGs if Rancher itself is deployed securely and access controls are strictly enforced.
            *   **Primary Method:** Rancher UI for day-to-day operations, monitoring, and application lifecycle management.
            *   **Supplementary Method:** Direct `kubectl` access via a secure, hardened jump host (bastion host) should still be available for advanced troubleshooting, initial cluster bootstrapping if needed, and scripted automation tasks. This provides a fallback and allows for lower-level interactions when necessary.
            The chosen method(s) must be secure, auditable, and enforce least privilege, aligning with DISA STIGs. Desktop UIs like Lens could be considered for individual power users if secure `kubeconfig` management and application transfer can be ensured.
        *   Estimated data volumes for databases, models, and other persistent storage?: **Partially Confirmed: One LLM is ~43GB. Databases will store chat sessions, document uploads, and vectorstores (which can become large).** Total storage needs further detailed estimation per service. **(Recommendation)** Plan for significant, high-performance persistent storage. The L40S GPUs have substantial VRAM, but models also need to be loaded from disk quickly. Vector databases can also have high I/O demands.
        *   Backup and disaster recovery (DR) requirements (RPO/RTO): **Confirmed: None at this time.** **(Recommendation)** While not an immediate formal requirement, it is highly advisable to implement basic backup strategies, especially for critical stateful data like the PostgreSQL database (e.g., using `pg_dump` or other database backup tools) and any irreplaceable application data on PVs. Even simple, regularly scheduled backups can prevent significant data loss. Store backups securely within the air-gapped environment.
    *   **Application Specifics:**
        *   **`core_service` & `workbench_service` `requirements.txt`:** Are the `requirements.txt` files in these service directories intended to install *additional* packages not covered by the root `requirements.txt` used in `Dockerfile.base`, or is it an overlap?
        *   **`ollama` `Modelfile`:** Is a `Modelfile` used with `ollama create` in `ollama/entrypoint.sh` (located at `backend/ollama/models/Modelfile` or `backend/ollama/Modelfile`)? If so, please provide its contents. (Still pending)
        *   What is the exact purpose of `host.docker.internal` access for services like `chat`, `workbench`, `direct_chat_service`? (Still pending)
*   **Information to be Found in Code/Config (Further Analysis Needed):**
    *   **Critical Dockerfiles:** (All main Dockerfiles now provided and analyzed, `Dockerfile.base` was key).
    *   **Critical Scripts (Entrypoints):** (All key scripts now seem to be provided and analyzed).
    *   **Root `requirements.txt` (used by `Dockerfile.base`):** The content of this file is needed to fully plan Python dependency vendoring.
    *   **`requirements.txt` for `core_service` and `workbench_service`:** Contents needed to check for overlap/necessity.
    *   **Configuration Files for `host.docker.internal`:** Review configuration files within `chat`, `workbench`, and `direct_chat_service` to see how `host.docker.internal` is being used.
    *   **Included Docker Compose Files (for completeness):**
        *   `backend/ollama/docker-compose.ollama.yml` (Content still needed to confirm runtime specifics for Ollama, ensure images will be pulled from Harbor).
    *   **All Dockerfiles (re-check for any missed details):** Detailed review for `FROM` instructions (base images from Harbor), `RUN` commands involving package managers (`apt` for Ubuntu Server 24.04 LTS using Nexus), `pip` (using Nexus), `COPY --from=...` (multi-stage builds), and any `curl`/`wget`/`git` commands (should be eliminated or replaced with artifacts from Nexus).
*   **API Gateway / Ingress Analysis (Traefik):**
    *   The existing Traefik configuration (`traefik.yaml`, `dynamic_conf.yaml`) is robust and provides a good blueprint for Kubernetes Ingress.
    *   **Static Config (`traefik.yaml`):** Defines entrypoints, file provider for dynamic config, logging, and Prometheus metrics. These settings will be configured in the Kubernetes deployment of Traefik (e.g., via Helm chart values).
    *   **Dynamic Config (`dynamic_conf.yaml`):**
        *   **Middlewares:** Defines critical middlewares for authentication (`forwardAuth` to `auth-service`), CORS, rate limiting, security headers, retries, and compression. These can be translated to Traefik `Middleware` CRDs in Kubernetes.
        *   **Routers:** Defines `PathPrefix`-based routing for all backend services. These will translate to `IngressRoute` CRDs or standard `Ingress` resources.
        *   **Services & Health Checks:** Backend services are defined with target URLs (Docker service names) and specific health check paths (e.g., `/api/auth/health`). These health check paths are vital for configuring Kubernetes liveness and readiness probes for each corresponding application Pod.
    *   **Kubernetes Translation:** Traefik can be used as the Ingress Controller in Kubernetes. The Docker provider will be replaced by the Kubernetes Ingress or CRD provider. Existing routing logic and middleware functionality can be largely preserved using Traefik CRDs.
*   **Build Process Modifications (Air-Gap Compliance):**
    *   **For `Dockerfile.base` (target OS for `python:3.11-slim` base is Debian-based, similar to Ubuntu):**
        *   **OS Packages (`apt-get`):** Configure `apt` to use the internal `apt` repository hosted on Sonatype Nexus Repository OSS for Ubuntu Server 24.04 LTS compatible `.deb` packages.
        *   **Python Packages (`pip`):** Configure `pip` to use the internal `pypi` repository hosted on Sonatype Nexus Repository OSS.
        *   **NLTK Data:** Download `punkt` and `averaged_perceptron_tagger` data. Create a tarball (e.g., `nltk_data.tar.gz`). `COPY nltk_data.tar.gz /app/` and then `RUN tar -xzf /app/nltk_data.tar.gz -C /app/nltk_data && rm /app/nltk_data.tar.gz`. Adjust paths as needed. The `nltk.downloader` line must be removed.
    *   **For Individual Service Dockerfiles:**
        *   **Services using `mage-base:latest`:** If their `requirements.txt` (e.g., in `core_service`, `workbench_service`) are genuinely different and additive to what `mage-base:latest` provides, then those `pip install` commands also need to follow the private PyPI/vendored package strategy. If dependencies are already covered by `mage-base`, remove redundant `pip install` steps.
        *   **`wargame_service`, `report_builder_service`:** (Use non-`mage-base` public images like `python:3.11-slim` and `python:3.12-slim` which are Debian-based). Their `apt-get install` commands should use the internal `apt` repository on Nexus for Ubuntu-compatible `.deb`s, and `pip install -r requirements.txt` should use the internal `pypi` repository on Nexus.
        *   **`transcription_service`:**
            *   Base image `nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04` needs to be in Harbor.
            *   `apt-get` for `git`, `ffmpeg` needs offline sources for Ubuntu from the Nexus `apt` repository (target Ubuntu 24.04 LTS for these packages). Python 3.10 handling needs to be confirmed (see previous notes - ideally update service or use pre-packaged Python 3.10 from Nexus if essential and available/approved for 24.04 LTS).
            *   PyTorch GPU wheels and `setuptools-rust` should be hosted on the Nexus `pypi` repository.
            *   The packaged `whisperX` wheel should be hosted on the Nexus `pypi` repository.
            *   `HF_TOKEN` hardcoding must be removed; use Kubernetes secrets at runtime if token is still needed (though for air-gap, model downloads should be pre-done).
        *   **`vLLM`, `ollama`:** Their public base images (`vllm/vllm-openai:latest`, `ollama/ollama:latest`) must be in the private registry (use specific version tags). Ensure their internal OS is compatible with your tooling if you need to add packages, or that they are self-contained.
        *   **General:** Remove `--reload` flags from Uvicorn commands in production Dockerfiles (`direct_chat_service`, `workbench_service`).
*   **Logging and Monitoring Implementation:**
    *   **Logging:** Deploy offline-capable solutions for logging (e.g., EFK stack - Elasticsearch, Fluentd, Kibana).
    *   **Monitoring:** Deploy Prometheus and Grafana for monitoring Kubernetes and application metrics.
*   **Information Needed from User (Intent & Environment):**
    *   **Kubernetes Environment:** (OS confirmed to be **Ubuntu Server 24.04 LTS or latest LTS**, other questions remain relevant)
    *   **Operational Requirements:** (Questions remain relevant)
    *   **Application Specifics:**
        *   **`core_service` & `workbench_service` `requirements.txt`:** Are the `requirements.txt` files in these service directories intended to install *additional* packages not covered by the root `requirements.txt` used in `Dockerfile.base`, or is it an overlap?
        *   **`ollama` `Modelfile`:** Is a `Modelfile` used with `ollama create` in `ollama/entrypoint.sh` (located at `backend/ollama/models/Modelfile` or `backend/ollama/Modelfile`)? If so, please provide its contents. (Still pending)
        *   What is the exact purpose of `host.docker.internal` access for services like `chat`, `workbench`, `direct_chat_service`? (Still pending)
*   **Information to be Found in Code/Config (Further Analysis Needed):**
    *   **Critical Dockerfiles:** (All main Dockerfiles now provided and analyzed, `Dockerfile.base` was key).
    *   **Critical Scripts (Entrypoints):** (All key scripts now seem to be provided and analyzed).
    *   **Root `requirements.txt` (used by `Dockerfile.base`):** The content of this file is needed to fully plan Python dependency vendoring.
    *   **`requirements.txt` for `core_service` and `workbench_service`:** Contents needed to check for overlap/necessity.
    *   **Configuration Files for `host.docker.internal`:** Review configuration files within `chat`, `workbench`, and `direct_chat_service` to see how `host.docker.internal` is being used.
    *   **Included Docker Compose Files (for completeness):**
        *   `backend/ollama/docker-compose.ollama.yml` (Content still needed to confirm runtime specifics for Ollama, ensure images will be pulled from Harbor).
    *   **All Dockerfiles (re-check for any missed details):** Detailed review for `FROM` instructions (base images from Harbor), `RUN` commands involving package managers (`apt` for Ubuntu Server 24.04 LTS using Nexus), `pip` (using Nexus), `COPY --from=...` (multi-stage builds), and any `curl`/`wget`/`git` commands (should be eliminated or replaced with artifacts from Nexus).

---
*Next Steps: Detailed review of service Dockerfiles and included compose files, focusing on Ubuntu Server 24.04 LTS (or latest LTS) compatibility for package management (via Sonatype Nexus Repository OSS) and dependencies, especially Python versions for services like `transcription_service`.*