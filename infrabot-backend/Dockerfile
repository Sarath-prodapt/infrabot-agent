FROM python:3.12-slim
LABEL authors="sarath.r"

# Ensure python output is sent straight to terminal (useful for container logging)
ENV PYTHONUNBUFFERED=1


RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    nginx \
    netcat-openbsd \
    curl \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 1️⃣ Install Poetry + project deps
RUN pip install --no-cache-dir poetry==2.1.3
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup appuser

WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN export PIP_TIMEOUT=300 \
    && export PIP_DEFAULT_TIMEOUT=300 \
    && poetry config virtualenvs.create false \
    && poetry install --only main --no-root


# 2️⃣ Copy source
COPY app ./app
COPY knowledgebase ./knowledgebase
COPY manage.py ./manage.py
COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Install Azure CLI for managing Azure resources
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# Ensure the app directory and its contents are owned by the appuser
RUN chown -R appuser:appgroup /app

# Set environment variables and create writable directories before switching user
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV HOME=/tmp
RUN mkdir -p /tmp/matplotlib && chmod -R 777 /tmp/matplotlib

# Expose the port the app runs on
EXPOSE 8000

# Switch to the non-root user
USER appuser

# 3️⃣ Launch
ENTRYPOINT ["/app/entrypoint.sh"]
