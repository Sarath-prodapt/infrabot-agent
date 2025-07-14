#!/bin/bash

set -e

# Default values
MILVUS_HOST_DEFAULT="milvus-standalone"
MILVUS_PORT_DEFAULT="19530"

# Use environment variables if set, otherwise use defaults
TARGET_HOST=${MILVUS_HOST:-$MILVUS_HOST_DEFAULT}
TARGET_PORT=${MILVUS_PORT:-$MILVUS_PORT_DEFAULT}

echo "Waiting for Milvus to propagate..."
sleep 10  # Reduced from 40 seconds

echo "Waiting for Milvus to start at $TARGET_HOST:$TARGET_PORT..."
timeout=60
count=0
until nc -z -w 2 "$TARGET_HOST" "$TARGET_PORT" || [ $count -eq $timeout ]; do
  echo "Milvus is unavailable - sleeping (attempt $count/$timeout)"
  sleep 2
  count=$((count + 1))
done

if [ $count -eq $timeout ]; then
  echo "Warning: Milvus connection timeout. Starting application anyway."
else
  echo "Milvus port is open. Starting application."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
