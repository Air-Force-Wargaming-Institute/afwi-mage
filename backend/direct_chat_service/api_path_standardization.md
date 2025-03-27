# Direct Chat Service API Path Standardization

## Background

The direct chat service currently uses an inconsistent API path structure with `/api/v1/chat` instead of the standard `/api/{service}/{endpoint}` pattern used by other services.

## Migration Plan

We are standardizing all API paths across the MAGE platform. For direct chat service, we're transitioning from `/api/v1/chat` to `/api/direct-chat`.

### Phase 1: Support Both Paths (Current)

- The service now responds to both `/api/v1/chat/*` and `/api/direct-chat/*` endpoints
- The health check is available at both `/api/v1/health` and `/api/direct-chat/health`
- Traefik is configured to route requests to both path patterns
- Frontend code has been updated to use the new standardized paths

### Phase 2: Monitor and Communicate (Next 2 Weeks)

- Monitor API usage to ensure all clients are transitioning to the new paths
- Update documentation to reflect the new standardized paths
- Communicate with any external consumers about the path change

### Phase 3: Deprecation Warning (Month 2)

- Add deprecation warnings in logs when the old `/api/v1/chat` paths are used
- Update the service to return a deprecation header in responses to old paths
- Communicate a timeline for full deprecation of the old paths

### Phase 4: Remove Legacy Paths (Month 3)

- Remove support for old `/api/v1/chat` paths
- Update Traefik configuration to only route to the standardized paths
- Clean up the codebase to remove all references to the old paths

## Benefits of Standardization

1. Consistent API design across all services
2. Simplified routing configuration
3. Easier developer onboarding
4. Better API discoverability
5. Consistent health check endpoints 