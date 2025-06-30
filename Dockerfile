FROM python:3.12-slim
LABEL authors="sarath.r"

# Ensure python output is sent straight to terminal (useful for container logging)
ENV PYTHONUNBUFFERED=1

# Install system dependencies for PDF processing and SSL certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    tesseract-ocr \ 
    libgl1-mesa-glx \
    libglib2.0-0 \
    ca-certificates \ 
    nginx \ 
    && update-ca-certificates \ 
    && rm -rf /var/lib/apt/lists/*

# 1️⃣ Install Poetry + project deps
RUN pip install --no-cache-dir poetry==2.1.3
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup appuser

WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false \ 
    && poetry install --only main --no-root


# 2️⃣ Copy source
COPY app ./app
COPY nginx.conf /etc/nginx/nginx.conf
COPY knowledgebase ./knowledgebase

# Ensure the app directory and its contents are owned by the appuser
RUN chown -R appuser:appgroup /app

# Set environment variables and create writable directories before switching user
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV HOME=/tmp
RUN mkdir -p /tmp/matplotlib && chmod -R 777 /tmp/matplotlib

# Switch to the non-root user
USER appuser

# 3️⃣ Launch
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]