# Authentication Service

This service handles user authentication and authorization for the MAGE application.

## Service Details

- **Port**: 8010
- **Database**: PostgreSQL
- **Authentication**: JWT tokens (30-minute expiration)
- **Default Admin User**:
  - Username: `admin`
  - Password: `12345`

## Configuration

1. Environment Variables (`.env`):
   ```bash
   # Copy the template
   cp .env.example .env
   ```

2. Available Settings:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SECRET_KEY`: JWT signing key
   - `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time
   - `CORS_ORIGINS`: Allowed frontend origins

## API Endpoints

- `POST /api/users/token`: Login endpoint
- `GET /api/users/me`: Get current user
- `GET /api/users`: List all users (admin only)
- `POST /api/users`: Create new user (admin only)
- `PUT /api/users/{id}`: Update user (admin only)
- `DELETE /api/users/{id}`: Delete user (admin only)

## Development Notes

### Database Initialization
- Tables are created automatically on startup
- Admin user is created if no users exist
- Database name must match the one in `DATABASE_URL`

### Security Considerations
1. **Production Setup**:
   - Change default admin password
   - Use strong SECRET_KEY
   - Update CORS settings
   - Use HTTPS in production

2. **Token Management**:
   - Tokens expire after 30 minutes
   - Invalid tokens return 401 Unauthorized
   - Admin routes require admin permission

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   - Check if PostgreSQL is running
   - Verify database connection string
   - Ensure ports are available

2. **Can't Create Admin**
   - Check database logs
   - Verify database permissions
   - Ensure init scripts are running

3. **Authentication Fails**
   - Check token expiration
   - Verify user permissions
   - Ensure correct credentials

### Logs
```bash
# View service logs
docker compose logs auth

# View database logs
docker compose logs db
```