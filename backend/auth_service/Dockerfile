FROM mage-base:latest

# No need to install dependencies as they're in the base image

# Copy service-specific files
COPY . .

# Convert line endings to Unix format (LF)
RUN tr -d '\r' < /app/entrypoint.sh > /app/entrypoint_unix.sh && \
    mv /app/entrypoint_unix.sh /app/entrypoint.sh

# Make the script executable
RUN chmod +x /app/entrypoint.sh

# Use the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]