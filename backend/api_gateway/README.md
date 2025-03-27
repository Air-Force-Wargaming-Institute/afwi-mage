# AFWI-MAGE API Gateway

This directory contains the configuration for the Traefik API Gateway service which routes requests to the appropriate microservices.

## Configuration Files

- `traefik.yaml`: Static configuration loaded at startup (entrypoints, logging, provider settings)
- `dynamic_conf.yaml`: Dynamic configuration that can be modified without restart (middlewares, routers, services)

## Dynamic Configuration

The `dynamic_conf.yaml` file can be modified while Traefik is running to make changes to routing rules, middleware chains, and service configurations without requiring a restart. Traefik automatically detects and applies these changes due to the `watch: true` directive in the file provider configuration.

To update routing:
1. Edit the `dynamic_conf.yaml` file
2. Save the changes
3. Traefik will automatically detect and apply the new configuration

This feature is particularly useful for:
- Adding new services
- Modifying routing rules
- Adjusting middleware configurations
- Implementing A/B testing
- Changing load balancing strategies

## Directory Structure

```
api_gateway/
├── traefik.yaml           # Static configuration
├── dynamic_conf.yaml      # Dynamic configuration (routes, middlewares)
└── README.md              # This file
```

## Features

- **Service Discovery**: Automatically discovers services through Docker labels
- **Dynamic Configuration**: Updates routing rules without restart
- **Authentication**: ForwardAuth integration with auth service
- **Rate Limiting**: Per-service rate limits
- **Circuit Breaking**: Prevents cascading failures
- **Security Headers**: Sets appropriate security headers
- **Metrics**: Prometheus metrics endpoint
- **Dashboard**: Admin dashboard for monitoring
- **Health Checks**: Regular health checks for all services

## How to Use

The API Gateway is configured in `docker-compose.yml` and automatically starts with the other services. Access the dashboard at http://localhost:8080/dashboard/ (development only).

## Routes

All API routes begin with `/api/` prefix followed by the service name:

- `/api/auth/*` → Auth Service
- `/api/chat/*` → Chat Service
- `/api/upload/*` → Upload Service
- `/api/core/*` → Core Service
- etc.

Refer to `dynamic_conf.yaml` for the complete routing configuration.

## Logs

API Gateway logs are stored in `data/logs/traefik/` directory.

## Architecture

The gateway is implemented using Traefik v2.9, a modern HTTP reverse proxy and load balancer that makes deploying microservices easy. Traefik integrates natively with Docker and provides powerful middleware capabilities for authentication, rate limiting, and more.

```
┌───────────────┐      ┌─────────────────┐      ┌────────────────┐
│               │      │                 │      │                │
│   Frontend    │─────▶│   API Gateway   │─────▶│  Microservices │
│   (React)     │      │   (Traefik)     │      │  (FastAPI)     │
│               │      │                 │      │                │
└───────────────┘      └─────────────────┘      └────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │                 │
                       │  Auth Service   │
                       │  (FastAPI)      │
                       │                 │
                       └─────────────────┘
```

## Features

- **Unified Entry Point**: Single point of access for all microservices
- **Authentication**: JWT validation through ForwardAuth middleware
- **Rate Limiting**: Configurable rate limits per service
- **Load Balancing**: Automatic distribution of traffic across service instances
- **Circuit Breaking**: Prevents cascading failures across services
- **Health Checks**: Automatic routing only to healthy service instances
- **Metrics**: Prometheus-compatible metrics for monitoring
- **Logging**: Structured JSON logs for analysis
- **Security Headers**: Automatic addition of security headers to responses

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Network access to backend services

### Installation

1. Ensure the `app-network` Docker network exists:

```bash
docker network create app-network
```

2. Configure the gateway:

```bash
# Create required directories
mkdir -p api_gateway/logs/traefik api_gateway/dynamic

# Ensure correct permissions
chmod -R 755 api_gateway/logs
```

3. Start the gateway along with backend services:

```bash
# From project root
docker-compose -f docker-compose.yml -f api_gateway/docker-compose.gateway.yml up -d
```

### Configuration

The API Gateway uses two main configuration files:

- **traefik.yaml**: Static configuration that is loaded only at startup
- **dynamic_conf.yaml**: Dynamic configuration that can be reloaded without restarting

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DISABLE_AUTH | Toggle authentication on/off | false |
| PUBLIC_PATHS | Comma-separated list of public paths | /api/health,/api/docs,/api/openapi.json |
| DEV_MODE | Enable development mode | false |

### Accessing Services

All backend services are accessible through the gateway using the following URL pattern:

```
http://localhost/{service-path}
```

For example:
- Authentication: http://localhost/api/auth/login
- Chat service: http://localhost/api/chat/sessions
- Upload service: http://localhost/api/upload

### Dashboard

Traefik includes a dashboard for monitoring and troubleshooting:

```
http://traefik.localhost/
```

## Authentication

The API Gateway integrates with the Auth Service to validate JWT tokens on protected endpoints. The authentication flow works as follows:

1. Client sends request with JWT token in Authorization header
2. Gateway forwards token to Auth Service for validation
3. If valid, Auth Service returns HTTP 200 with user information headers
4. Gateway forwards original request to appropriate service with user headers
5. Backend service uses headers for authorization decisions

## Development

For development purposes, authentication can be toggled on/off using the `DISABLE_AUTH` environment variable:

```bash
# Disable authentication
DISABLE_AUTH=true docker-compose -f docker-compose.yml -f api_gateway/docker-compose.gateway.yml up -d
```

## Additional Documentation

Detailed documentation is available in the `/docs` directory:

- [Gateway Architecture Design](docs/gateway_architecture_design.md)
- [Logging Strategy](docs/logging_strategy.md)
- [Testing Strategy](docs/testing_strategy.md)

## Troubleshooting

### Common Issues

1. **Gateway not starting**
   - Check Docker logs: `docker logs mage_api_gateway`
   - Verify configuration files syntax
   - Ensure required ports are available

2. **Authentication failures**
   - Verify Auth Service is running
   - Check token validity
   - Review Auth Service logs

3. **Service unreachable**
   - Confirm service is running and healthy
   - Check network connectivity
   - Verify routing configuration 