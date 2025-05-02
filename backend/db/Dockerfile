# Use the official PostgreSQL 13 image as the base
FROM postgres:13

# Copy the initialization script from the parent directory (the build context)
# into the directory where PostgreSQL looks for init scripts.
COPY init-multiple-databases.sh /docker-entrypoint-initdb.d/init-multiple-databases.sh

# Ensure the script has execute permissions within the container
RUN chmod +x /docker-entrypoint-initdb.d/init-multiple-databases.sh 