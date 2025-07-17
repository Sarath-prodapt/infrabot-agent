FROM python:3.12-slim
LABEL authors="sarath.r"

# Ensure python output is sent straight to terminal (useful for container logging)
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    netcat-openbsd \
    curl \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry + project deps (use stable version)
RUN pip install --no-cache-dir poetry==1.8.3

# Create non-root user
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup appuser

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./
# Create README.md if it doesn't exist (required by pyproject.toml)
RUN echo "# Infrabot Backend" > README.md

# Copy poetry.lock if it exists, otherwise it will be generated
COPY poetry.lock* ./

# Install dependencies with error handling
RUN export PIP_TIMEOUT=300 \
    && export PIP_DEFAULT_TIMEOUT=300 \
    && poetry config virtualenvs.create false \
    && (poetry check || (echo "Regenerating lock file..." && poetry lock --no-update)) \
    && poetry install --only main --no-root --no-cache

# Copy source code
COPY app ./app
COPY knowledgebase ./knowledgebase
COPY manage.py ./manage.py
COPY entrypoint.sh /app/entrypoint.sh

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Set environment variables for Azure Container Apps
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV HOME=/tmp
# Use environment variables with proper defaults for both local and Azure
ENV MILVUS_HOST=${MILVUS_HOST:-localhost}
ENV MILVUS_PORT=${MILVUS_PORT:-19530}
ENV BACKEND_URL=${BACKEND_URL:-http://localhost:8000}
ENV ENVIRONMENT=${ENVIRONMENT:-development}

# Create writable directories
RUN mkdir -p /tmp/matplotlib && chmod -R 777 /tmp/matplotlib

# Ensure proper ownership
RUN chown -R appuser:appgroup /app

# Add health check for Azure Container Apps
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Switch to non-root user
USER appuser

# Use entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
