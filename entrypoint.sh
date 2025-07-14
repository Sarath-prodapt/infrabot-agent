#!/bin/sh
set -e

# Start Nginx in the background.
nginx -c /etc/nginx/nginx.conf &

# Start Uvicorn in the foreground, listening on localhost.
exec uvicorn app.main:app --host 127.0.0.1 --port 8000
