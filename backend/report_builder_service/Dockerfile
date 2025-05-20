# First stage: Install dependencies and wheels
FROM afwi-mage-base:3.12-slim AS builder

WORKDIR /build

# Install pandoc and additional system dependencies
# RUN apt-get update && \
#     apt-get install -y pandoc build-essential wget python3-dev && \
#     apt-get clean && \
#     rm -rf /var/lib/apt/lists/*

# Copy requirements and wheel files for installation
COPY requirements.txt /build/
COPY wheels/ /build/wheels/

# Install dependencies from local wheels
# Ensure this command matches the airgapped strategy (no network access for pip)
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt

# Create a new virtual environment (optional but good practice)
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install dependencies into the virtual environment
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt

# Verify pandoc installation (can be done here or in final stage)
RUN pandoc --version && \
    python -c "import pypandoc; print(f'pypandoc version: {pypandoc.__version__}')"

# Second stage: Create the final image
FROM afwi-mage-base:3.12-slim

WORKDIR /app

# Copy the virtual environment from the builder stage
COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

# Copy application code
COPY . .

# Verify pandoc again in the final environment if critical
# RUN pandoc --version

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8019} --log-level debug"] 