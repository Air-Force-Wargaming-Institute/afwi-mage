#!/bin/bash

# Script to toggle authentication modes in development environment

# Default values
MODE="prod"
ENV_FILE=".env"

# Display help
function show_help {
    echo "Toggle Authentication Mode Script"
    echo "--------------------------------"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -m, --mode [prod|dev|none]   Set authentication mode (default: prod)"
    echo "                               prod: Full authentication"
    echo "                               dev:  Lenient authentication (allows invalid tokens)"
    echo "                               none: No authentication"
    echo "  -e, --env-file PATH          Path to .env file (default: .env)"
    echo "  -h, --help                   Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --mode dev                Enable dev mode authentication"
    echo "  $0 --mode none               Disable authentication"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -m|--mode)
            MODE="$2"
            shift
            shift
            ;;
        -e|--env-file)
            ENV_FILE="$2"
            shift
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate the mode
if [[ "$MODE" != "prod" && "$MODE" != "dev" && "$MODE" != "none" ]]; then
    echo "Error: Invalid mode '$MODE'. Use 'prod', 'dev', or 'none'."
    exit 1
fi

# Check if the .env file exists
if [[ ! -f $ENV_FILE ]]; then
    echo "Error: Environment file '$ENV_FILE' not found."
    exit 1
fi

# Update the .env file
case $MODE in
    prod)
        echo "Setting production authentication mode..."
        sed -i 's/^DISABLE_AUTH=.*$/DISABLE_AUTH=false/' $ENV_FILE
        sed -i 's/^DEV_MODE=.*$/DEV_MODE=false/' $ENV_FILE
        ;;
    dev)
        echo "Setting development authentication mode..."
        sed -i 's/^DISABLE_AUTH=.*$/DISABLE_AUTH=false/' $ENV_FILE
        sed -i 's/^DEV_MODE=.*$/DEV_MODE=true/' $ENV_FILE
        ;;
    none)
        echo "Disabling authentication..."
        sed -i 's/^DISABLE_AUTH=.*$/DISABLE_AUTH=true/' $ENV_FILE
        sed -i 's/^DEV_MODE=.*$/DEV_MODE=false/' $ENV_FILE
        ;;
esac

# Print the current settings
echo "Current Authentication Settings:"
grep "DISABLE_AUTH" $ENV_FILE
grep "DEV_MODE" $ENV_FILE
echo ""
echo "Note: You may need to restart the auth service for changes to take effect."
echo "Run: docker-compose restart auth" 