# AFWI-MAGE API Gateway Architecture Design

## 1. Overview

The AFWI-MAGE API Gateway will serve as the unified entry point for all microservices in the Multi-Agent Generative Engine platform. It will handle routing, authentication, load balancing, and traffic management between clients and backend services.

### 1.1 Core Components

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

| Component | Technology | Purpose |
|-----------|------------|---------|
| API Gateway | Traefik v2.9 | Request routing, load balancing, middleware handling |
| Authentication | JWT tokens, ForwardAuth | User authentication, token validation |
| Services | FastAPI | Business logic implementation |
| Frontend | React | User interface |

## 2. Gateway Configuration Structure

### 2.1 Base Configuration (YAML)

```yaml
# Static configuration
api:
  dashboard: true
  insecure: true  # Disable in production

entryPoints:
  web:
    address: ":80"
  
providers:
  docker:
    exposedByDefault: false
    network: "app-network"
  file:
    directory: "/etc/traefik/dynamic"
    watch: true

accessLog:
  filePath: "/var/log/traefik/access.log"
  format: "json"

log:
  level: "INFO"
```

### 2.2 Dynamic Configuration (YAML)

```yaml
# Dynamic configuration - middleware
http:
  middlewares:
    auth-middleware:
      forwardAuth:
        address: "http://auth:8010/api/auth/validate"
        trustForwardHeader: true
        authResponseHeaders:
          - "X-User-ID"
          - "X-User-Role"
          - "X-User-Email"
    
    rate-limit:
      rateLimit:
        average: 100
        burst: 50
    
    security-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        contentSecurityPolicy: "default-src 'self'"
        referrerPolicy: "strict-origin-when-cross-origin"
```

## 3. Routing Configuration

### 3.1 Service Routing

Services will be dynamically discovered through Docker labels. Example service configuration:

```yaml
services:
  chat:
    # ... service config ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.chat.rule=PathPrefix(`/api/chat`)"
      - "traefik.http.routers.chat.entrypoints=web"
      - "traefik.http.services.chat.loadbalancer.server.port=8009"
      - "traefik.http.routers.chat.middlewares=auth-middleware@file,rate-limit@file"
```

### 3.2 Authentication Bypass Configuration

For development environments, authentication can be toggled on/off:

```yaml
# Conditional middleware based on environment variables
http:
  middlewares:
    conditional-auth:
      plugin:
        conditionalForwardAuth:
          auth:
            address: "http://auth:8010/api/auth/validate"
          condition: "{{ env `DISABLE_AUTH` `false` | eq `false` }}"
```

## 4. Scaling Considerations

### 4.1 Horizontal Scaling

```
┌───────────────┐
│   Frontend    │───┐
└───────────────┘   │
                    │    ┌─────────────────┐      ┌────────────────┐
┌───────────────┐   │    │                 │      │                │
│   Frontend    │───┼───▶│   API Gateway   │─────▶│  Service Pod 1 │
└───────────────┘   │    │   (Traefik)     │      │                │
                    │    │   Cluster       │      └────────────────┘
┌───────────────┐   │    │                 │      ┌────────────────┐
│   Frontend    │───┘    │                 │─────▶│  Service Pod 2 │
└───────────────┘        └─────────────────┘      │                │
                                                  └────────────────┘
```

The gateway architecture supports horizontal scaling through:

1. **Stateless Design**: Traefik instances are stateless and can be scaled horizontally
2. **Load Balancing**: Automatic load balancing between service instances
3. **Health Checks**: Routing only to healthy service instances

### 4.2 Configuration for Scaling

```yaml
# Service scaling configuration
services:
  chat:
    # ... service config ...
    deploy:
      replicas: 3
    labels:
      - "traefik.http.services.chat.loadbalancer.healthcheck.path=/health"
      - "traefik.http.services.chat.loadbalancer.healthcheck.interval=10s"
      - "traefik.http.services.chat.loadbalancer.sticky=true"
```

## 5. Traffic Management

### 5.1 Rate Limiting

Rate limiting will be configured per service with appropriate limits:

| Service | Rate Limit (req/min) | Burst | 
|---------|---------------------|-------|
| Auth | 60 | 20 |
| Chat | 120 | 40 |
| Upload | 30 | 10 |
| Core | 300 | 100 |

### 5.2 Circuit Breaking

```yaml
# Circuit breaker configuration
http:
  services:
    chat:
      loadBalancer:
        healthCheck:
          path: /health
          interval: "10s"
          timeout: "3s"
        circuitBreaker:
          expression: "NetworkErrorRatio() > 0.5 || ResponseCodeRatio(500, 600, 0, 600) > 0.5"
```

## 6. Security Design

### 6.1 Authentication Flow

1. Client requests resource from gateway
2. Gateway forwards authentication request to Auth Service
3. Auth Service validates JWT token
4. If valid, Auth Service returns HTTP 200 with user information headers
5. Gateway forwards original request to appropriate service with user headers
6. Service uses headers for authorization decisions

### 6.2 Security Headers

All responses will include security headers:

```yaml
middlewares:
  security-headers:
    headers:
      frameDeny: true
      contentTypeNosniff: true
      browserXssFilter: true
      contentSecurityPolicy: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
      referrerPolicy: "strict-origin-when-cross-origin"
      permissionsPolicy: "camera=(), microphone=(), geolocation=()"
```

## 7. Implementation Plan

### 7.1 Initial Setup

1. Add Traefik service to docker-compose.yml
2. Configure basic routing for one service
3. Test end-to-end communication

### 7.2 Authentication Integration

1. Configure ForwardAuth middleware
2. Implement auth bypass for development
3. Test with and without authentication

### 7.3 Advanced Features

1. Implement rate limiting
2. Configure circuit breakers
3. Add security headers
4. Set up caching for appropriate endpoints

## 8. Monitoring and Observability

### 8.1 Logging

```yaml
# Logging configuration
accessLog:
  filePath: "/var/log/traefik/access.log"
  format: "json"
  fields:
    headers:
      defaultMode: "keep"
      names:
        User-Agent: "keep"
        Authorization: "redact"
        Content-Type: "keep"
    clientIP: "keep"
    clientPort: "drop"
    requestMethod: "keep"
    requestPath: "keep"
    responseTime: "keep"
    responseStatus: "keep"
    responseSize: "keep"
```

### 8.2 Metrics

```yaml
# Prometheus metrics configuration
metrics:
  prometheus:
    entryPoint: metrics
    addServicesLabels: true
    addEntryPointsLabels: true
    buckets:
      - 0.1
      - 0.3
      - 1.2
      - 5.0
```

## 9. Conclusion

This architecture leverages Traefik as a powerful, Docker-aware API gateway to unify access to AFWI-MAGE microservices. It provides a robust foundation for authentication, load balancing, and traffic management while maintaining flexibility for development and production environments. 