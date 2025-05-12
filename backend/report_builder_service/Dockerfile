FROM python:3.9-slim

WORKDIR /app

# Install pandoc and additional dependencies for Markdown to Word conversion
RUN apt-get update && \
    apt-get install -y pandoc build-essential wget python3-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Verify pandoc installation
RUN pandoc --version && \
    python -c "import pypandoc; print(f'pypandoc version: {pypandoc.__version__}')"

COPY . .

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8019} --log-level debug"] 