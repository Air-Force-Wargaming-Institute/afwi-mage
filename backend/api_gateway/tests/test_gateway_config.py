#!/usr/bin/env python3
"""
Basic tests for the Traefik gateway configuration.
These tests validate the configuration files for syntax and logical correctness.
"""

import os
import subprocess
import yaml
import pytest
import json
from pathlib import Path

# Root directory of the project
ROOT_DIR = Path(__file__).parent.parent.parent

# Gateway configuration directory
GATEWAY_DIR = ROOT_DIR / "api_gateway"

# Traefik configuration files
TRAEFIK_STATIC_CONFIG = GATEWAY_DIR / "traefik.yaml"
TRAEFIK_DYNAMIC_CONFIG = GATEWAY_DIR / "dynamic_conf.yaml"

def test_static_config_file_exists():
    """Test that the static configuration file exists."""
    assert TRAEFIK_STATIC_CONFIG.exists(), f"Static config file not found: {TRAEFIK_STATIC_CONFIG}"

def test_dynamic_config_file_exists():
    """Test that the dynamic configuration file exists."""
    assert TRAEFIK_DYNAMIC_CONFIG.exists(), f"Dynamic config file not found: {TRAEFIK_DYNAMIC_CONFIG}"

def test_static_config_yaml_syntax():
    """Test that the static configuration file has valid YAML syntax."""
    try:
        with open(TRAEFIK_STATIC_CONFIG, 'r') as file:
            yaml.safe_load(file)
    except yaml.YAMLError as e:
        pytest.fail(f"Static config file has invalid YAML syntax: {e}")

def test_dynamic_config_yaml_syntax():
    """Test that the dynamic configuration file has valid YAML syntax."""
    try:
        with open(TRAEFIK_DYNAMIC_CONFIG, 'r') as file:
            yaml.safe_load(file)
    except yaml.YAMLError as e:
        pytest.fail(f"Dynamic config file has invalid YAML syntax: {e}")

def test_static_config_required_fields():
    """Test that the static configuration file has all required fields."""
    with open(TRAEFIK_STATIC_CONFIG, 'r') as file:
        config = yaml.safe_load(file)
    
    # Check for required configuration sections
    assert 'entryPoints' in config, "Static config missing 'entryPoints' section"
    assert 'providers' in config, "Static config missing 'providers' section"
    
    # Check entry points
    assert 'web' in config['entryPoints'], "Static config missing 'web' entry point"
    
    # Check providers
    assert 'docker' in config['providers'], "Static config missing 'docker' provider"
    assert 'file' in config['providers'], "Static config missing 'file' provider"

def test_dynamic_config_middleware_definitions():
    """Test that the dynamic configuration file has required middleware definitions."""
    with open(TRAEFIK_DYNAMIC_CONFIG, 'r') as file:
        config = yaml.safe_load(file)
    
    # Check for HTTP section
    assert 'http' in config, "Dynamic config missing 'http' section"
    
    # Check for middlewares section
    assert 'middlewares' in config['http'], "Dynamic config missing 'middlewares' section"
    
    # Check for required middlewares
    middlewares = config['http']['middlewares']
    assert 'auth-middleware' in middlewares, "Dynamic config missing 'auth-middleware'"
    assert 'security-headers' in middlewares, "Dynamic config missing 'security-headers'"
    
    # Check for any rate limiting middleware
    rate_limit_middlewares = [m for m in middlewares.keys() if 'rate-limit' in m]
    assert len(rate_limit_middlewares) > 0, "Dynamic config missing rate limiting middleware"

def test_dynamic_config_service_definitions():
    """Test that the dynamic configuration file has service definitions."""
    with open(TRAEFIK_DYNAMIC_CONFIG, 'r') as file:
        config = yaml.safe_load(file)
    
    # Check for services section
    assert 'services' in config['http'], "Dynamic config missing 'services' section"
    
    # Check that we have at least one service defined
    services = config['http']['services']
    assert len(services) > 0, "Dynamic config has no services defined"
    
    # Check that each service has a loadBalancer section
    for service_name, service in services.items():
        assert 'loadBalancer' in service, f"Service '{service_name}' missing 'loadBalancer' section"
        assert 'servers' in service['loadBalancer'], f"Service '{service_name}' missing 'servers' section"

def test_dynamic_config_router_definitions():
    """Test that the dynamic configuration file has router definitions."""
    with open(TRAEFIK_DYNAMIC_CONFIG, 'r') as file:
        config = yaml.safe_load(file)
    
    # Check for routers section
    assert 'routers' in config['http'], "Dynamic config missing 'routers' section"
    
    # Check that we have at least one router defined
    routers = config['http']['routers']
    assert len(routers) > 0, "Dynamic config has no routers defined"
    
    # Check that each router has required fields
    for router_name, router in routers.items():
        assert 'rule' in router, f"Router '{router_name}' missing 'rule' field"
        assert 'service' in router, f"Router '{router_name}' missing 'service' field"
        assert 'entryPoints' in router, f"Router '{router_name}' missing 'entryPoints' field"

def test_docker_compose_gateway_config():
    """Test that the docker-compose gateway file has valid YAML syntax."""
    docker_compose_path = GATEWAY_DIR / "docker-compose.gateway.yml"
    assert docker_compose_path.exists(), f"Docker compose file not found: {docker_compose_path}"
    
    try:
        with open(docker_compose_path, 'r') as file:
            config = yaml.safe_load(file)
            
        # Check for required sections
        assert 'services' in config, "Docker compose missing 'services' section"
        assert 'api_gateway' in config['services'], "Docker compose missing 'api_gateway' service"
        
        # Check api_gateway service configuration
        gateway = config['services']['api_gateway']
        assert 'image' in gateway, "API Gateway service missing 'image' field"
        assert 'ports' in gateway, "API Gateway service missing 'ports' field"
        assert 'volumes' in gateway, "API Gateway service missing 'volumes' field"
        
    except yaml.YAMLError as e:
        pytest.fail(f"Docker compose file has invalid YAML syntax: {e}")

if __name__ == "__main__":
    # Run the tests
    pytest.main(["-xvs", __file__]) 