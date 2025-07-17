# Infrabot Agent

Small FastAPI service that proxies chat requests to Azure Open AI to answer common IT‑help‑desk questions.

## Features

- **RAG-based Chat**: Uses Azure OpenAI with retrieval-augmented generation for accurate responses
- **Milvus Vector Database**: Stores and searches document embeddings for context retrieval
- **Document Ingestion**: Automatically processes PDF documents from the knowledge base
- **RESTful API**: FastAPI-based service with streaming responses
- **Management Tools**: CLI tools for data ingestion and system status checking
- **Azure Container Apps Ready**: Optimized for deployment on Azure Container Apps

## Quick start (local)

```bash
# Install dependencies
poetry install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your Azure OpenAI credentials

# Start Milvus database (required)
cd ../milvus
docker-compose up -d

# Return to backend directory
cd ../infrabot-backend

# Run document ingestion
python manage.py ingest

# Start the application
poetry run uvicorn app.main:app --reload
```

## Data Management

### Initial Setup
1. Place your PDF documents in the `knowledgebase/` directory
2. Configure your Azure OpenAI credentials in `.env`
3. Ensure Milvus is running (see Docker Compose setup)

### Document Ingestion
Run document ingestion using the management script:
```bash
# Ingest documents into Milvus
python manage.py ingest

# Check system status
python manage.py status

# Validate Milvus connection
python manage.py validate
```

## API Endpoints

### Core Endpoints
- `POST /api/chat` - Chat with the assistant (streaming response)
- `POST /api/ingest` - Trigger document ingestion
- `GET /api/status` - Get system health status
- `GET /health` - Health check for Azure Container Apps
- `GET /` - Root health check

### Chat API Example
```bash
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I reset my password?",
    "history": []
  }'
```

## Environment Variables

Create a `.env` file with the following configuration:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-openai-service.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=your-chat-model-deployment
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=your-embedding-deployment
AZURE_OPENAI_EMBEDDING_MODEL_NAME=text-embedding-3-large

# Milvus Configuration
MILVUS_HOST=localhost  # Use milvus-service for Azure Container Apps
MILVUS_PORT=19530
MILVUS_COLLECTION_NAME=infrabot_knowledgebase

# Application Configuration
ENVIRONMENT=development  # Use 'azure' for Container Apps
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

## Docker Deployment

### Build and Run Locally
```bash
# Build the image
docker build -t infrabot-backend .

# Run with local Milvus
docker run -p 8000:8000 \
  -e MILVUS_HOST=host.docker.internal \
  --env-file .env \
  infrabot-backend
```

### Azure Container Registry
```bash
# Build and push to Azure Container Registry
az acr build --registry your-registry --image infrabot-backend:latest .
```

## Azure Container Apps Deployment

### Prerequisites
- Azure CLI installed and logged in
- Azure Container Registry set up
- Milvus database deployed (see deployment scripts)

### Deploy to Azure Container Apps
```bash
# Set environment variables
export RESOURCE_GROUP="infrabot-rg"
export ENVIRONMENT_NAME="infrabot-env"
export ACR_NAME="your-registry"

# Deploy Milvus service
az containerapp create \
  --name milvus-service \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image milvusdb/milvus:latest \
  --target-port 19530 \
  --ingress internal \
  --cpu 1.0 \
  --memory 2Gi

# Deploy backend service
az containerapp create \
  --name backend-service \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_NAME.azurecr.io/infrabot-backend:latest \
  --target-port 8000 \
  --ingress internal \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    ENVIRONMENT=azure \
    MILVUS_HOST=milvus-service \
    MILVUS_PORT=19530 \
  --secrets \
    azure-openai-api-key="your-api-key" \
  --secret-env-vars \
    AZURE_OPENAI_API_KEY=azure-openai-api-key
```

## Local Development with Docker Compose

Create a `docker-compose.yml` in the project root:
```yaml
version: '3.8'
services:
  backend:
    build: ./infrabot-backend
    ports:
      - "8000:8000"
    environment:
      - MILVUS_HOST=milvus
    depends_on:
      - milvus
    volumes:
      - ./infrabot-backend:/app
    
  milvus:
    image: milvusdb/milvus:latest
    ports:
      - "19530:19530"
    environment:
      - ETCD_ENDPOINTS=embedded
```

## Project Structure
```
infrabot-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── models.py            # Pydantic models
│   └── services/
│       ├── __init__.py
│       ├── load_data.py     # Vector DB and RAG chain
│       ├── ingest_service.py # Document ingestion
│       ├── openai_llm.py    # Azure OpenAI integration
│       └── connection_manager.py # Database connections
├── knowledgebase/           # PDF documents for ingestion
├── tests/                   # Test files
├── manage.py               # Management CLI
├── pyproject.toml          # Poetry dependencies
├── Dockerfile              # Container definition
├── entrypoint.sh           # Container startup script
└── README.md               # This file
```

## Troubleshooting

### Common Issues

1. **Milvus Connection Failed**
   ```bash
   # Check if Milvus is running
   python manage.py validate
   
   # Restart Milvus
   cd ../milvus && docker-compose restart
   ```

2. **Poetry Lock File Issues**
   ```bash
   # Regenerate lock file
   poetry lock --no-update
   ```

3. **Document Ingestion Fails**
   ```bash
   # Check knowledge base path
   python manage.py status
   
   # Ensure PDFs are in knowledgebase/ directory
   ls knowledgebase/*.pdf
   ```

### Health Checks
```bash
# Check application health
curl http://localhost:8000/health

# Check detailed status
curl http://localhost:8000/api/status
```

## Development

### Running Tests
```bash
poetry run pytest
```

### Code Formatting
```bash
poetry run black .
poetry run ruff check .
```

### Adding Dependencies
```bash
poetry add package-name
poetry add --group dev package-name  # for dev dependencies
```

## License

This project is licensed under the MIT License.


