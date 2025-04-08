# AFWI MAGE Authentication Design Decisions

## Overview

This document outlines the key design decisions for implementing authentication in the AFWI MAGE API Gateway. These decisions balance security, flexibility, and developer experience.

## Key Design Decisions

### 1. API Gateway Authentication Flow

**Decision**: Implement a ForwardAuth pattern using Traefik's middleware capabilities.

**Rationale**:
- Centralizes authentication logic to avoid duplication across services
- Provides consistent behavior across all protected endpoints
- Allows for authentication toggling without modifying service code
- Simplifies authentication debugging and troubleshooting

**Implementation**:
- Each request is routed through a ForwardAuth middleware that checks for valid JWT tokens
- Auth service provides token validation endpoint specifically for the gateway
- User information is passed to backend services via custom headers

### 2. JWT Validation Requirements

**Decision**: Implement comprehensive JWT validation in the Auth Service.

**Rationale**:
- JWTs must be cryptographically secure and properly validated
- User data must be verified against the database for each request
- Token expiration must be enforced to limit attack surface

**Implementation**:
- Validate token signature using the configured secret key
- Verify token has not expired
- Ensure token has proper claims (username/sub)
- Verify the user still exists in the database

### 3. Authentication Toggle Mechanism

**Decision**: Implement a multi-level toggle mechanism for authentication.

**Rationale**:
- Developers need a simple way to disable authentication during development
- Some environments (testing, staging) may require different auth behaviors
- Production environments must enforce strict authentication

**Implementation**:
- Global toggle: `DISABLE_AUTH` environment variable in auth service
- Public paths: Configurable list of paths that don't require authentication
- Development mode: `DEV_MODE` environment variable for lenient validation
- Different middleware chains in Traefik configuration for each mode

### 4. Auth Bypass Mechanisms

**Decision**: Create multiple auth bypass mechanisms for different scenarios.

**Rationale**:
- Different development scenarios require different levels of authentication
- Testing should be able to bypass authentication selectively
- Bypassing should always be a conscious and documented decision

**Implementation**:
- Completely disabled auth for early development (`DISABLE_AUTH=true`)
- Lenient auth for testing with invalid tokens (`DEV_MODE=true`)
- Public path exceptions for docs and health checks (`PUBLIC_PATHS` setting)
- Convenience script for toggling auth modes (`toggle_auth.sh`)

### 5. User Information Propagation

**Decision**: Propagate user information via HTTP headers to backend services.

**Rationale**:
- Backend services need user context without re-validating tokens
- Headers provide a lightweight way to share this information
- Standard naming conventions ensure consistent usage

**Implementation**:
- `X-Auth-User`: Username of the authenticated user
- `X-Auth-Role`: Permission level (admin, data_scientist, basic_user)
- `X-Auth-Status`: Authentication status (authenticated, disabled, public)
- `X-Auth-User-ID`: Database ID of the authenticated user

### 6. Security Considerations

**Decision**: Implement robust security practices for authentication.

**Rationale**:
- JWT authentication requires specific security considerations
- Sensitive data should never be exposed through the API Gateway
- Clear documentation prevents security misconfigurations

**Implementation**:
- Use adequate key length for JWT signing
- Set appropriate token expiration times
- Document security risks of auth bypassing
- Use HTTPS in production environments
- Configure proper CORS headers

## Development vs. Production Considerations

### Development
- Auth bypassing allowed via environment variables
- Development tokens with longer expiration
- Lenient validation for faster development cycles
- Detailed error messages for troubleshooting

### Production
- Strict token validation enforced
- No auth bypassing allowed
- Shorter token expiration times
- Limited error details in responses
- HTTPS required for all authenticated requests

## Conclusion

The authentication design for the API Gateway provides a secure, flexible mechanism for protecting MAGE services. By centralizing authentication through the API Gateway using Traefik's ForwardAuth middleware, we ensure consistent behavior while providing the necessary flexibility for development and testing.

The toggle mechanisms allow for easy switching between authentication modes without code changes, making development more efficient. Security is maintained in production by enforcing strict validation rules and disabling bypass mechanisms.

## Next Steps

1. Implement the token validation endpoint in the Auth Service
2. Configure Traefik middleware for authentication
3. Update service configurations with appropriate labels
4. Add toggle script to the deployment process
5. Document the authentication flow for developers 