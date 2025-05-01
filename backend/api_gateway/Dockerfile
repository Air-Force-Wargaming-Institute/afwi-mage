# Use the official Traefik image
FROM traefik:v2.10

# Create directories for configuration and logs
RUN mkdir -p /etc/traefik/dynamic /var/log/traefik

# Copy configuration files
COPY traefik.yaml /etc/traefik/traefik.yaml
COPY dynamic_conf.yaml /etc/traefik/dynamic/dynamic_conf.yaml

# Set proper permissions
RUN chmod 600 /etc/traefik/traefik.yaml \
    && chmod 600 /etc/traefik/dynamic/dynamic_conf.yaml \
    && chmod 755 /var/log/traefik

# Expose ports
EXPOSE 80 8080 8082 8083

# Command to run Traefik
CMD ["traefik", "--configfile=/etc/traefik/traefik.yaml"] 