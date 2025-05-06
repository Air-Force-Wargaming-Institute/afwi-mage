#!/bin/bash

# airgapped_deploy.sh
# Script to deploy services in an airgapped environment.
# Assumes this script is in the 'deployment_scripts' folder of the AirgapDeploymentPackage
# when executed on the airgapped machine.

set -e # Exit immediately if a command exits with a non-zero status.

# --- Get Base Paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_BASE_DIR="$(dirname "$SCRIPT_DIR")"

BACKEND_SERVICES_ZIPS_DIR="$PACKAGE_BASE_DIR/backend_services"
BUILD_CONTEXTS_BASE_DIR="$PACKAGE_BASE_DIR/build_contexts" # New
VLLM_CONTEXT_DIR="$BUILD_CONTEXTS_BASE_DIR/vllm_context"
OLLAMA_CONTEXT_DIR="$BUILD_CONTEXTS_BASE_DIR/ollama_context"
FRONTEND_CONTEXT_DIR="$PACKAGE_BASE_DIR/frontend_context"
DOCKER_IMAGES_DIR="$PACKAGE_BASE_DIR/docker_images"
TEMP_DEPLOY_ROOT="$PACKAGE_BASE_DIR/temp_deployment_area"

# ANSI Color Codes
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- Helper Functions ---
load_docker_images() {
    echo -e "${GREEN}--- Loading Docker Images from $DOCKER_IMAGES_DIR ---${NC}"
    if [ ! -d "$DOCKER_IMAGES_DIR" ]; then
        echo -e "${YELLOW}Warning: Docker images directory not found: $DOCKER_IMAGES_DIR${NC}"
        return
    fi
    
    local tar_files
    mapfile -t tar_files < <(find "$DOCKER_IMAGES_DIR" -maxdepth 1 -name "*.tar" -print0 | xargs -0 || true)

    if [ ${#tar_files[@]} -eq 0 ] || [ -z "${tar_files[0]}" ]; then # Check if array is empty or first element is empty string
        echo -e "${YELLOW}Warning: No Docker image .tar files found in $DOCKER_IMAGES_DIR.${NC}"
        return
    fi

    for tar_file in "${tar_files[@]}"; do
        if [ -f "$tar_file" ]; then 
            echo "Loading image from $tar_file..."
            if docker load -i "$tar_file"; then
                echo -e "${CYAN}Successfully loaded $(basename "$tar_file").${NC}"
            else
                echo -e "${RED}Error: Failed to load Docker image $tar_file.${NC}"
            fi
        fi
    done
    echo -e "${GREEN}--- Docker Image Loading Complete ---${NC}"
}

get_available_backend_services() {
    local services_str=""
    if [ ! -d "$BACKEND_SERVICES_ZIPS_DIR" ]; then
        echo -e "${YELLOW}Warning: Backend services Zips directory $BACKEND_SERVICES_ZIPS_DIR not found.${NC}" >&2
        echo ""
        return
    fi

    local zip_files
    mapfile -t zip_files < <(find "$BACKEND_SERVICES_ZIPS_DIR" -maxdepth 1 -name "*_airgapped.zip" -print0 | xargs -0 || true)

    for zip_file in "${zip_files[@]}"; do
        if [ -f "$zip_file" ]; then
            local service_name
            service_name=$(basename "$zip_file" _airgapped.zip)
            services_str+="$service_name:BackendService " # Format: Name:Type
        fi
    done
    echo "$services_str"
}

get_available_context_builds() {
    local contexts_str=""
    # VLLM
    if [ -d "$VLLM_CONTEXT_DIR" ] && [ -f "$VLLM_CONTEXT_DIR/Dockerfile" ]; then
        contexts_str+="vllm:BuildContext "
    else
        echo -e "${YELLOW}Warning: vLLM context or its Dockerfile not found in $VLLM_CONTEXT_DIR. Skipping.${NC}" >&2
    fi
    # Ollama
    if [ -d "$OLLAMA_CONTEXT_DIR" ] && [ -f "$OLLAMA_CONTEXT_DIR/Dockerfile" ]; then
        contexts_str+="ollama:BuildContext "
    else
        echo -e "${YELLOW}Warning: Ollama context or its Dockerfile not found in $OLLAMA_CONTEXT_DIR. Skipping.${NC}" >&2
    fi
    # Frontend
    if [ -d "$FRONTEND_CONTEXT_DIR" ] && [ -f "$FRONTEND_CONTEXT_DIR/Dockerfile" ]; then
        contexts_str+="frontend:BuildContext "
    else
        echo -e "${YELLOW}Warning: Frontend context or its Dockerfile not found in $FRONTEND_CONTEXT_DIR. Skipping.${NC}" >&2
    fi
    echo "$contexts_str"
}

deploy_item() {
    local item_name_type="$1"
    local item_name="${item_name_type%:*}"
    local item_type="${item_name_type#*:}"
    
    local build_context_path=""

    echo -e "\n${YELLOW}--- Deploying $item_type: $item_name ---${NC}"

    if [ "$item_type" == "BackendService" ]; then
        local service_zip_path="$BACKEND_SERVICES_ZIPS_DIR/${item_name}_airgapped.zip"
        local service_extracted_path="$TEMP_DEPLOY_ROOT/$item_name"

        if [ ! -f "$service_zip_path" ]; then
            echo -e "${RED}Error: Service package $service_zip_path not found.${NC}"
            return 1
        fi
        mkdir -p "$TEMP_DEPLOY_ROOT"
        if [ -d "$service_extracted_path" ]; then
            echo "Removing previous extraction for $item_name at $service_extracted_path..."
            rm -rf "$service_extracted_path"
        fi
        echo "Creating extraction directory: $service_extracted_path"
        mkdir -p "$service_extracted_path"
        echo "Extracting $service_zip_path to $service_extracted_path..."
        if ! unzip -q "$service_zip_path" -d "$service_extracted_path"; then
            echo -e "${RED}Error: Failed to extract service package $service_zip_path. Make sure 'unzip' is installed.${NC}"
            return 1
        fi
        echo "Extraction complete."
        build_context_path="$service_extracted_path"
    elif [ "$item_type" == "BuildContext" ]; then
        if [ "$item_name" == "vllm" ]; then build_context_path="$VLLM_CONTEXT_DIR"; 
elif [ "$item_name" == "ollama" ]; then build_context_path="$OLLAMA_CONTEXT_DIR"; 
elif [ "$item_name" == "frontend" ]; then build_context_path="$FRONTEND_CONTEXT_DIR"; 
else
            echo -e "${RED}Error: Unknown BuildContext name '$item_name'.${NC}"
            return 1
        fi
        echo "Preparing to build from context: $build_context_path"
    else
        echo -e "${RED}Error: Unknown item type '$item_type'.${NC}"
        return 1
    fi

    local dockerfile_path="$build_context_path/Dockerfile"
    if [ ! -f "$dockerfile_path" ]; then
        echo -e "${RED}Error: Dockerfile not found at $dockerfile_path for $item_name. Skipping build.${NC}"
        return 1
    fi

    local image_tag_name="${item_name}-airgapped:latest"
    echo "Building Docker image '$image_tag_name' for $item_name from context: $build_context_path..."
    
    local current_dir
    current_dir=$(pwd)
    cd "$build_context_path" || { echo -e "${RED}Failed to cd into $build_context_path${NC}"; return 1; }
    
    if docker build -t "$image_tag_name" . ; then
        echo -e "${CYAN}Successfully built Docker image '$image_tag_name'.${NC}"
        echo "To run this service (as part of docker-compose), ensure the image name '$image_tag_name' is referenced in the docker-compose.yml from the backend_support directory."
        echo "Consult service-specific documentation or the main docker-compose.yml for run details."
    else
        echo -e "${RED}Error: Failed to build Docker image for $item_name.${NC}"
    fi
    cd "$current_dir" || { echo -e "${RED}Failed to cd back to $current_dir${NC}"; return 1; }
    echo -e "${YELLOW}--- Deployment for $item_type '$item_name' Finished ---${NC}"
}

# --- Main Script Logic ---
echo -e "${CYAN}Airgapped Deployment Script Started.${NC}"
echo "Expected Package Base Directory: $PACKAGE_BASE_DIR"

# Command-line argument parsing
SERVICE_NAME_ARG=""
DEPLOY_ALL_ARG=false
LIST_SERVICES_ONLY_ARG=false
DEPLOY_ALL_BACKEND_ARG=false
DEPLOY_ALL_CONTEXTS_ARG=false

# Using getopts for more robust argument parsing
while getopts ":s:albc" opt; do # b for backend-all, c for contexts-all
  case $opt in
    s) SERVICE_NAME_ARG="$OPTARG" ;;
    a) DEPLOY_ALL_ARG=true ;; 
    l) LIST_SERVICES_ONLY_ARG=true ;; 
    b) DEPLOY_ALL_BACKEND_ARG=true ;; 
    c) DEPLOY_ALL_CONTEXTS_ARG=true ;; 
    \?) echo -e "${RED}Invalid option: -$OPTARG${NC}" >&2; exit 1 ;; 
    :) echo -e "${RED}Option -$OPTARG requires an argument.${NC}" >&2; exit 1 ;;
  esac
done
shift $((OPTIND-1))

# Step 0: Load Docker Images
load_docker_images

# Step 1: Discover Available Items
ALL_DEPLOYABLE_ITEMS_STR="$(get_available_backend_services)$(get_available_context_builds)"
IFS=' ' read -r -a ALL_DEPLOYABLE_ITEMS <<< "$ALL_DEPLOYABLE_ITEMS_STR"

# Filter out empty elements that might result from empty strings from functions
temp_array=()
for item in "${ALL_DEPLOYABLE_ITEMS[@]}"; do
  if [[ -n "$item" ]]; then
    temp_array+=("$item")
  fi
done
ALL_DEPLOYABLE_ITEMS=("${temp_array[@]}")

if [ ${#ALL_DEPLOYABLE_ITEMS[@]} -eq 0 ]; then
    echo -e "${YELLOW}Warning: No backend service packages or buildable contexts found. Please check package structure.${NC}"
    exit 1
fi

echo -e "\n${GREEN}Available items for deployment:${NC}"
for i in "${!ALL_DEPLOYABLE_ITEMS[@]}"; do
    item_name_type="${ALL_DEPLOYABLE_ITEMS[$i]}"
    printf "  %s. %s (%s)\n" "$((i+1))" "${item_name_type%:*}" "${item_name_type#*:}"
done

if [ "$LIST_SERVICES_ONLY_ARG" = true ]; then
    echo -e "\nListing items only. Exiting."
    exit 0
fi

# Step 2: Determine which items to deploy
ITEMS_TO_DEPLOY=()
if [ "$DEPLOY_ALL_ARG" = true ]; then
    echo -e "\n${GREEN}Deploying ALL available backend services and build contexts.${NC}"
    ITEMS_TO_DEPLOY=("${ALL_DEPLOYABLE_ITEMS[@]}")
elif [ "$DEPLOY_ALL_BACKEND_ARG" = true ]; then
    echo -e "\n${GREEN}Deploying ALL available backend services (from zips).${NC}"
    for item in "${ALL_DEPLOYABLE_ITEMS[@]}"; do if [[ "$item" == *":BackendService" ]]; then ITEMS_TO_DEPLOY+=("$item"); fi; done
elif [ "$DEPLOY_ALL_CONTEXTS_ARG" = true ]; then
    echo -e "\n${GREEN}Deploying ALL available build contexts.${NC}"
    for item in "${ALL_DEPLOYABLE_ITEMS[@]}"; do if [[ "$item" == *":BuildContext" ]]; then ITEMS_TO_DEPLOY+=("$item"); fi; done
fi

if [ -n "$SERVICE_NAME_ARG" ]; then
    found_arg_item=false
    for item_name_type in "${ALL_DEPLOYABLE_ITEMS[@]}"; do
        item_name="${item_name_type%:*}"
        if [ "$item_name" = "$SERVICE_NAME_ARG" ]; then
            # Avoid duplicates if combined with -DeployAll* flags
            is_duplicate_in_selection=false
            for existing_selection in "${ITEMS_TO_DEPLOY[@]}"; do
                if [[ "$existing_selection" == "$item_name_type" ]]; then
                    is_duplicate_in_selection=true; break
                fi
            done
            if ! $is_duplicate_in_selection; then ITEMS_TO_DEPLOY+=("$item_name_type"); fi
            echo -e "\n${GREEN}Selected item via parameter: $item_name (${item_name_type#*:})${NC}"
            found_arg_item=true
            break
        fi
    done
    if [ "$found_arg_item" = false ]; then
        echo -e "${RED}Error: Item '$SERVICE_NAME_ARG' not found in available packages or contexts.${NC}"
        if [ ${#ITEMS_TO_DEPLOY[@]} -eq 0 ]; then exit 1; fi
    fi
fi

if [ ${#ITEMS_TO_DEPLOY[@]} -eq 0 ] && ! $DEPLOY_ALL_BACKEND_ARG && ! $DEPLOY_ALL_CONTEXTS_ARG && ! $DEPLOY_ALL_ARG ; then # Interactive selection
    echo -e "\n${GREEN}Please choose items to deploy.${NC}"
    echo "Enter numbers separated by commas (e.g., 1,3), 'all', or press Enter to skip deployment."
    read -r -p "Enter your choice(s): " choice
    if [[ -z "$choice" ]]; then echo "No selection made. Exiting."; exit 0; fi
    if [[ "$choice" == "all" ]]; then ITEMS_TO_DEPLOY=("${ALL_DEPLOYABLE_ITEMS[@]}"); else
        IFS=',' read -r -a indices <<< "$choice"
        for index_str in "${indices[@]}"; do
            index_str=$(echo "$index_str" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//') 
            if [[ "$index_str" =~ ^[0-9]+$ ]]; then
                idx=$((index_str - 1))
                if (( idx >= 0 && idx < ${#ALL_DEPLOYABLE_ITEMS[@]} )); then
                    selected_item_for_interactive="${ALL_DEPLOYABLE_ITEMS[$idx]}"
                    is_duplicate_in_selection_interactive=false
                    for existing_selection_interactive in "${ITEMS_TO_DEPLOY[@]}"; do
                        if [[ "$existing_selection_interactive" == "$selected_item_for_interactive" ]]; then
                             is_duplicate_in_selection_interactive=true; break
                        fi
                    done
                    if ! $is_duplicate_in_selection_interactive; then ITEMS_TO_DEPLOY+=("$selected_item_for_interactive"); fi
                else echo -e "${YELLOW}Warning: Invalid selection: $index_str. Out of range.${NC}"; fi
            else echo -e "${YELLOW}Warning: Invalid input: '$index_str'. Numbers or 'all'.${NC}"; fi
        done
    fi
fi

if [ ${#ITEMS_TO_DEPLOY[@]} -eq 0 ]; then
    echo -e "\n${YELLOW}No items selected or matched for deployment. Exiting.${NC}"
    exit 0
fi

# Step 3: Deploy selected items
echo -e "\n${MAGENTA}--- Starting Deployment Process for Selected Items ---${NC}"
for item_to_deploy_name_type in "${ITEMS_TO_DEPLOY[@]}"; do
    echo "- ${item_to_deploy_name_type%:*} (${item_to_deploy_name_type#*:})"
done

for item_to_deploy_item in "${ITEMS_TO_DEPLOY[@]}"; do
    deploy_item "$item_to_deploy_item"
done

echo -e "\n${MAGENTA}--- Airgapped Deployment Script Finished ---${NC}"
echo "All selected images should now be built or loaded."
echo "To start the services, navigate to the '../backend_support/' directory from here,"
echo "and use the modified 'docker-compose.yml' file. Example: docker compose up -d" 