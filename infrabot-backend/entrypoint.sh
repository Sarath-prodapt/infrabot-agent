#!/bin/bash

set -e

# Azure Container Apps service discovery
TARGET_HOST=${MILVUS_HOST:-localhost}
TARGET_PORT=${MILVUS_PORT:-19530}

echo "Starting InfraBot Backend for Azure Container Apps..."
echo "Environment: ${ENVIRONMENT:-development}"
echo "Connecting to Milvus at $TARGET_HOST:$TARGET_PORT"

# Wait for Milvus service to be available (with shorter timeout for faster startup)
echo "Waiting for Milvus service to be ready..."
timeout=60  # Reduced timeout
count=0

# Check if Milvus is available, but don't block startup
while [ $count -lt $timeout ]; do
  if nc -z -w 2 "$TARGET_HOST" "$TARGET_PORT" 2>/dev/null; then
    echo "Successfully connected to Milvus at $TARGET_HOST:$TARGET_PORT"
    break
  fi
  
  if [ $((count % 10)) -eq 0 ]; then
    echo "Waiting for Milvus at $TARGET_HOST:$TARGET_PORT (attempt $count/$timeout)"
  fi
  
  sleep 2
  count=$((count + 2))
done

if [ $count -ge $timeout ]; then
  echo "Warning: Could not connect to Milvus at $TARGET_HOST:$TARGET_PORT within timeout"
  echo "Starting application anyway - Milvus connection will be retried at runtime"
fi

# Start the FastAPI application with Azure-optimized settings
echo "Starting FastAPI application..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 1 \
  --log-level info \
  --access-log \
  --timeout-keep-alive 65 \
  --use-colors
