# Infrabot Agent

Small FastAPI service that proxies chat requests to Azure Open AI to answer common IT‑help‑desk questions.

## Features

- **RAG-based Chat**: Uses Azure OpenAI with retrieval-augmented generation for accurate responses
- **Milvus Vector Database**: Stores and searches document embeddings for context retrieval
- **Document Ingestion**: Automatically processes PDF documents from the knowledge base
- **RESTful API**: FastAPI-based service with streaming responses
- **Management Tools**: CLI tools for data ingestion and system status checking

## Quick start (local)
```bash
poetry install
cp .env.example .env
# Edit .env with your Azure OpenAI credentials
make run
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

### API Endpoints
- `POST /api/chat` - Chat with the assistant
- `POST /api/ingest` - Trigger document ingestion
- `GET /api/status` - Get system health status
- `GET /` - Health check

## Environment Variables
Copy `.env.example` to `.env` and configure:
- `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI endpoint
- `AZURE_OPENAI_DEPLOYMENT` - Chat model deployment name
- `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` - Embedding model deployment name
- `MILVUS_HOST` - Milvus server host (default: milvus-standalone)
- `MILVUS_PORT` - Milvus server port (default: 19530)

