# MAGE Kubernetes Implementation Checklist

This checklist outlines the prioritized tasks for deploying the MAGE application to an air-gapped RKE2 Kubernetes environment (running on Ubuntu Server 24.04 LTS), managed with Rancher, ensuring DISA STIG alignment.

## Phase 1: Foundational Air-Gap Infrastructure & Base Image Preparation

**Goal:** Establish the core offline environment and prepare the primary base image for air-gapped builds.

*   [ ] **1.1. Private Container Registry Setup (Harbor):**
    *   [ ] 1.1.1. Deploy Harbor as the private container registry within the air-gapped network.
    *   [ ] 1.1.2. Secure Harbor (TLS, authentication, RBAC) and establish access controls.
    *   [ ] 1.1.3. Document procedures for pushing, pulling, and managing images in Harbor, including vulnerability scanning and image signing features.
*   [ ] **1.2. Offline Artifact Repository Setup (Sonatype Nexus Repository OSS):**
    *   [ ] 1.2.1. Deploy Sonatype Nexus Repository OSS as the centralized offline artifact manager.
    *   [ ] 1.2.2. Configure Nexus with repositories for: 
        *   [ ] `apt` (for Ubuntu Server 24.04 LTS .deb packages - full mirror)
        *   [ ] `pypi` (for Python wheels/sdists)
        *   [ ] `helm` (for Kubernetes charts)
        *   [ ] `raw` (for binaries like RKE2/Harbor/Nexus installers, ISOs, scripts, etc.)
    *   [ ] 1.2.3. Populate Nexus repositories with essential OS packages (`.deb` files for Ubuntu Server 24.04 LTS).
    *   [ ] 1.2.4. Populate Nexus `pypi` repository with Python packages (wheels, sdists) listed in ALL `requirements.txt` files.
    *   [ ] 1.2.5. Populate Nexus `helm` repository with necessary charts (Traefik, Harbor, Prometheus, Grafana, MAGE application chart, etc.).
    *   [ ] 1.2.6. Populate Nexus `raw` repository with installers (RKE2, Harbor, Nexus itself for potential re-deployment, kubectl, etc.).
*   [ ] **1.3. Pre-load Public Base Images to Private Registry:**
    *   [ ] 1.3.1. `python:3.11-slim` (for `Dockerfile.base`, `wargame_service`, `report_builder_service`)
    *   [ ] 1.3.2. `postgres:13` (for `db`)
    *   [ ] 1.3.3. `nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04` (for `transcription_service`)
    *   [ ] 1.3.4. `vllm/vllm-openai:latest` (Tag with a specific version if possible, for `vLLM`)
    *   [ ] 1.3.5. `ollama/ollama:latest` (Tag with a specific version if possible, for `ollama`)
    *   [ ] 1.3.6. `busybox` (for `init-data` job, if still needed, or for utility tasks)
*   [ ] **1.4. `Dockerfile.base` Air-Gap Hardening:**
    *   [ ] 1.4.1. Modify `apt-get` commands to use the internal `apt` repository hosted on Sonatype Nexus Repository OSS.
    *   [ ] 1.4.2. Modify `pip install -r requirements.txt` (root `requirements.txt`) to use the private `pypi` repository hosted on Sonatype Nexus Repository OSS (`--index-url`, `--extra-index-url`) and add `--trusted-host` if Nexus is not on HTTPS with a CA trusted by build env.
    *   [ ] 1.4.3. Pre-download PyTorch CPU wheels (`torch`, `torchvision`, `torchaudio` from `https://download.pytorch.org/whl/cpu`) and include in private PyPI/vendored packages for `pip install` in `Dockerfile.base`.
    *   [ ] 1.4.4. Pre-download `unstructured`, `unstructured-inference`, `pytesseract`, `layoutparser`, `llama-cpp-python` and include in private PyPI/vendored packages for `pip install` in `Dockerfile.base`.
    *   [ ] 1.4.5. Modify NLTK data download:
        *   [ ] 1.4.5.1. Download `punkt` and `averaged_perceptron_tagger` data locally.
        *   [ ] 1.4.5.2. Package and `COPY` into `Dockerfile.base`, then extract to the correct NLTK data path. Remove `nltk.downloader` call.
    *   [ ] 1.4.6. Build `mage-base:latest` image using the hardened `Dockerfile.base` and push to private registry.
    *   [ ] 1.4.7. Verify `build-base-image.sh` script aligns with air-gapped build process (e.g., points to correct Dockerfile, handles context correctly).

## Phase 2: Kubernetes Cluster & Core Infrastructure Setup (RKE2 & Rancher)

**Goal:** Provision the RKE2 cluster (on Ubuntu Server 24.04 LTS) and configure essential Kubernetes services.

*   [ ] **2.1. RKE2 Cluster Installation & Hardening:**
    *   [ ] 2.1.1. Install RKE2 on designated Ubuntu Server 24.04 LTS nodes according to air-gapped installation procedures.
    *   [ ] 2.1.2. Apply relevant DISA STIGs to the underlying Ubuntu Server 24.04 LTS host OS of Kubernetes nodes.
    *   [ ] 2.1.3. Configure RKE2 according to security best practices and DISA STIG recommendations (e.g., CIS benchmarks for RKE2 on Ubuntu 24.04 LTS).
*   [ ] **2.2. Rancher Installation & Configuration:**
    *   [ ] 2.2.1. Install Rancher to manage the RKE2 cluster, following air-gapped deployment guides.
    *   [ ] 2.2.2. Secure Rancher access (authentication, authorization, RBAC).
*   [ ] **2.3. Kubernetes Networking Setup:**
    *   [ ] 2.3.1. Configure CNI (e.g., Canal, Calico) if not default, ensuring compliance with security requirements.
    *   [ ] 2.3.2. Plan and implement `NetworkPolicies` namespace by namespace.
*   [ ] **2.4. Storage Configuration:**
    *   [ ] 2.4.1. Identify and provision persistent storage solutions (e.g., NFS, local-path-provisioner, SAN, Ceph) accessible by the RKE2 cluster.
    *   [ ] 2.4.2. Create `StorageClasses` for different storage tiers if applicable (e.g., `fast-ssd`, `bulk-hdd`).
*   [ ] **2.5. GPU Enablement:**
    *   [ ] 2.5.1. Install NVIDIA Kubernetes device plugin on worker nodes equipped with L40S GPUs.
    *   [ ] 2.5.2. Verify GPU availability and scheduling in the cluster.
*   [ ] **2.6. Ingress Controller (Traefik):**
    *   [ ] 2.6.1. Deploy Traefik as an Ingress Controller (e.g., using Helm chart from the Sonatype Nexus Repository OSS, ensuring chart images are in Harbor).
    *   [ ] 2.6.2. Configure Traefik to use Kubernetes CRD provider (replace Docker provider).
    *   [ ] 2.6.3. Expose Traefik via `LoadBalancer` (if available) or `NodePort` service.
*   [ ] **2.7. Monitoring & Logging (Initial Setup):**
    *   [ ] 2.7.1. Deploy Prometheus & Grafana for metrics collection (using images from Harbor and Helm charts from Sonatype Nexus Repository OSS).
    *   [ ] 2.7.2. Deploy an EFK-like stack (Elasticsearch, Fluentd, Kibana) for log aggregation (using images from Harbor and Helm charts from Sonatype Nexus Repository OSS).
*   [ ] **2.8. Define Namespaces:**
    *   [ ] 2.8.1. Create namespaces (e.g., `mage-services`, `mage-data`, `mage-infra`).

## Phase 3: Local Development Kubernetes Testing (Docker Desktop)

**Goal:** Validate Kubernetes manifests and basic service interactions on a local development machine.

*   [ ] **3.1. Setup Docker Desktop Kubernetes:**
    *   [ ] 3.1.1. Ensure Kubernetes is enabled in Docker Desktop settings.
    *   [ ] 3.1.2. Allocate sufficient resources (CPU, Memory, Disk) to Docker Desktop.
*   [ ] **3.2. Local Image Management Strategy:**
    *   [ ] 3.2.1. Option A (Recommended for simplicity initially): Use publicly available images for base layers (e.g., `python:3.11-slim` from Docker Hub) for initial manifest testing if local Harbor is not yet set up or is resource-intensive for local dev machine.
    *   [ ] 3.2.2. Option B (Closer to air-gap simulation): Attempt to run a lightweight local Docker registry or a local Harbor instance if machine resources permit. Populate with key images.
    *   [ ] 3.2.3. Ensure application images built locally are accessible to Docker Desktop Kubernetes.
*   [ ] **3.3. Deploy Core Non-GPU Services:**
    *   [ ] 3.3.1. Start with `db` (PostgreSQL), `redis`.
    *   [ ] 3.3.2. Deploy `api_gateway` (Traefik) locally.
    *   [ ] 3.3.3. Deploy a subset of stateless application services (e.g., `core`, `auth`) that do not require GPUs.
*   [ ] **3.4. Manifest Validation & Basic Testing:**
    *   [ ] 3.4.1. Validate Kubernetes YAML/Helm chart syntax and structure.
    *   [ ] 3.4.2. Test basic service deployment, pod startup, and health checks.
    *   [ ] 3.4.3. Verify inter-service communication (DNS resolution, network connectivity) for deployed services.
    *   [ ] 3.4.4. Test ConfigMap and Secret mounting and consumption.
    *   [ ] 3.4.5. Test basic Ingress routing through local Traefik.
*   [ ] **3.5. GPU Service Mocking/Limited Testing (If Feasible):**
    *   [ ] 3.5.1. Acknowledge that full GPU-accelerated testing is likely not feasible or representative.
    *   [ ] 3.5.2. If attempting GPU passthrough to Docker Desktop K8s, document steps and outcomes.
    *   [ ] 3.5.3. Consider deploying GPU services with configurations that allow them to run in a CPU-only/limited mode if available, for basic pod lifecycle testing.
*   [ ] **3.6. Document Local Testing Limitations:**
    *   [ ] 3.6.1. Clearly note differences from the production air-gapped RKE2 environment (e.g., no true air-gap, limited resources, single-node, different K8s distribution, GPU capabilities).

## Phase 4: Application Dockerfile & Configuration Hardening (Air-Gap)

**Goal:** Ensure all application service Dockerfiles are buildable offline and configurations are secure.

*   [ ] **4.1. `transcription_service` Dockerfile Hardening:**
    *   [ ] 4.1.1. Update `FROM` to use `nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04` from the Harbor private registry.
    *   [ ] 4.1.2. Modify `apt-get` commands:
        *   [ ] 4.1.2.1. Remove PPA `ppa:deadsnakes/ppa`. Ensure Python 3.10 is available via base image (e.g. `nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04` which is Ubuntu 22.04 based) or via official Ubuntu 24.04 LTS repositories (if compatible and Python 3.10 is needed & available) mirrored in Sonatype Nexus Repository OSS, or internal OS package repo for Ubuntu 24.04 LTS.
        *   [ ] 4.1.2.2. Use internal OS package mirror (hosted on Sonatype Nexus Repository OSS) or vendored `.deb`s for `git`, `ffmpeg`, etc.
    *   [ ] 4.1.3. Pre-download PyTorch GPU wheels (`cu118`) and `setuptools-rust`; make available via private `pypi` repository on Sonatype Nexus Repository OSS for `pip install`.
    *   [ ] 4.1.4. Replace `git+https://github.com/m-bain/whisperX.git`:
        *   [ ] 4.1.4.1. Clone `whisperX` repository.
        *   [ ] 4.1.4.2. Package `whisperX` (e.g., create a wheel).
        *   [ ] 4.1.4.3. Add to private PyPI/vendored packages and update `pip install`.
    *   [ ] 4.1.5. Remove hardcoded `HF_TOKEN` (will be managed as K8s Secret).
    *   [ ] 4.1.6. Ensure `MODEL_CACHE_DIR` and `HF_HOME` point to paths that will be backed by PVs/PVCs.
*   [ ] **4.2. `report_builder_service` Dockerfile Hardening:**
    *   [ ] 4.2.1. Update `FROM` to use `python:3.12-slim` from the Harbor private registry.
    *   [ ] 4.2.2. Modify `apt-get` for `pandoc`, etc., to use internal OS package mirror (Sonatype Nexus Repository OSS).
    *   [ ] 4.2.3. Modify `pip install -r requirements.txt` to use private `pypi` repository (Sonatype Nexus Repository OSS).
*   [ ] **4.3. `wargame_service` Dockerfile Hardening:**
    *   [ ] 4.3.1. Update `FROM` to use `python:3.11-slim` from the Harbor private registry.
    *   [ ] 4.3.2. Modify `pip install -r requirements.txt` to use private `pypi` repository (Sonatype Nexus Repository OSS).
*   [ ] **4.4. `core_service` & `workbench_service` Dockerfiles:**
    *   [ ] 4.4.1. Update `FROM mage-base:latest` (from Harbor private registry).
    *   [ ] 4.4.2. Analyze their `requirements.txt`. If they contain packages *additional* to `Dockerfile.base`'s root `requirements.txt`, ensure these are available in private `pypi` repository on Sonatype Nexus Repository OSS and `pip install` uses offline sources.
    *   [ ] 4.4.3. If their `requirements.txt` are subsets/duplicates, consider removing redundant `pip install` steps.
*   [ ] **4.5. Services using `mage-base:latest` (agent, auth, chat, direct_chat, embedding, extraction, upload):**
    *   [ ] 4.5.1. Ensure `FROM mage-base:latest` points to the Harbor private registry version.
    *   [ ] 4.5.2. Verify no direct external calls in their Dockerfiles (should be covered by `mage-base`).
*   [ ] **4.6. `vLLM` Dockerfile & Configuration:**
    *   [ ] 4.6.1. Update `FROM vllm/vllm-openai:latest` (specific version from Harbor private registry).
    *   [ ] 4.6.2. Confirm model `ADD` path in `backend/vLLM/models/` is correct.
    *   [ ] 4.6.3. Review `entrypoint.sh` for any external dependencies (seems self-contained).
*   [ ] **4.7. `ollama` Dockerfile & Configuration:**
    *   [ ] 4.7.1. Update `FROM ollama/ollama:latest` (specific version from Harbor private registry).
    *   [ ] 4.7.2. Confirm model `COPY` path for `nomic-embed-text-v1.5.f32.gguf`.
    *   [ ] 4.7.3. Review `entrypoint.sh`:
        *   [ ] 4.7.3.1. If `ollama create -f Modelfile` is used, ensure `Modelfile` is present in the image and `ollama create` works offline.
        *   [ ] 4.7.3.2. Provide or create `Modelfile` if necessary for `nomic-embed-text` model, ensuring it uses the already copied GGUF file.
*   [ ] **4.8. `db` Dockerfile:**
    *   [ ] 4.8.1. Update `FROM postgres:13` (from Harbor private registry).
    *   [ ] 4.8.2. Verify `init-multiple-databases.sh` script is correctly copied and has correct permissions.
*   [ ] **4.9. Remove `--reload` from Uvicorn:**
    *   [ ] 4.9.1. `direct_chat_service/Dockerfile` CMD.
    *   [ ] 4.9.2. `workbench_service/Dockerfile` CMD.
*   [ ] **4.10. Secrets Management - Code Review:**
    *   [ ] 4.10.1. `auth_service/Dockerfile` entrypoint: Remove hardcoded `PGPASSWORD=password` default logic; rely on environment variables injected by Kubernetes Secrets.
    *   [ ] 4.10.2. Globally scan all code and configuration for hardcoded secrets, API keys, or sensitive URLs.
*   [ ] **4.11. `host.docker.internal` Resolution:**
    *   [ ] 4.11.1. Investigate why `chat`, `workbench`, `direct_chat_service` use `extra_hosts: - "host.docker.internal:host-gateway"` in `docker-compose.yml`.
    *   [ ] 4.11.2. Determine the Kubernetes equivalent (e.g., service DNS, external IP if accessing host services outside K8s) or refactor application logic to use K8s service names.

## Phase 5: Kubernetes Manifest Creation & Initial Deployment (to RKE2 staging/prod)

**Goal:** Define Kubernetes resources for all MAGE services and achieve initial deployment to a target RKE2 environment.

*   [ ] **5.1. Helm Chart Creation (or Kustomize Structure):**
    *   [ ] 5.1.1. Set up a Helm chart for the MAGE application or a Kustomize base/overlay structure.
    *   [ ] 5.1.2. Create templates for `Deployment`, `StatefulSet`, `Service`, `ConfigMap`, `