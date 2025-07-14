# app.py

from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import asyncio
import time
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

import logging
import json
from pydantic import BaseModel, Field
from typing import List, Dict, Any, AsyncGenerator
from app.services.load_data import build_vector_db, create_rag_chain
from app.services.ingest_service import ingest_documents, validate_milvus_connection
from langchain_core.messages import AIMessage, HumanMessage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(title="Prodapt IT Helpdesk LLM")

# Add performance middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configuring CORS:
origins = [
    "http://localhost:8000",  # For FastAPI in Docker Compose on default port 8000
    "http://localhost",       # For Nginx in Docker Compose on default port 80
    "http://localhost:3000",  # Common React dev port, if you run it outside Nginx sometimes
    "http://localhost:8080",  # A common alternative port to Nginx to
]

# Allow CORS requests from React frontend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses larger than 1KB

class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="The user's command or question")
    history: List[Dict[str, str]] = Field([], description="The conversation history")


try:
    embeddings, retriever = build_vector_db()
    retrieval_qa_chain = create_rag_chain(retriever)
    logging.info("FastAPI app initialized successfully with retriever and RAG chain.")
except Exception as e:
    logging.error(f"Failed to initialize FastAPI app: {e}")
    raise e

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest) -> StreamingResponse:
    user_query = request.prompt.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    chat_history = [
        HumanMessage(content=msg["content"]) if msg["role"] == "user" else AIMessage(content=msg["content"])
        for msg in request.history
    ]

    async def stream_generator() -> AsyncGenerator[str, None]:
        logging.info(f"Starting RAG chain astream with prompt: {user_query[:200]}")
        
        chunk_count = 0
        try:
            async for chunk in retrieval_qa_chain.astream({"input": user_query, "chat_history": chat_history}):
                if chunk_count < 5:
                    logging.debug(f"Stream chunk [{chunk_count}]: {str(chunk)[:200]}")
                chunk_count += 1
                
                content_to_yield = None
                if isinstance(chunk, dict):
                    if "answer" in chunk and chunk["answer"] is not None:
                        content_to_yield = chunk["answer"]
                elif hasattr(chunk, "content"): # For AIMessageChunk, HumanMessageChunk from LLMs
                    content_to_yield = chunk.content
                elif isinstance(chunk, str): # If chain's final output parser (e.g., StrOutputParser) yields strings
                    content_to_yield = chunk
                
                if content_to_yield:
                    # Ensure we always yield a string
                    if not isinstance(content_to_yield, str):
                        logging.warning(f"Converting non-string content to string: {type(content_to_yield)}")
                        content_to_yield = str(content_to_yield)
                    
                    # Only yield non-empty strings
                    if content_to_yield.strip():
                        yield content_to_yield
            logging.info(f"Finished RAG chain astream. Total chunks: {chunk_count}")
        except Exception as e:
            logging.error(f"Error during RAG chain astream: {e}", exc_info=True)
            # If error happens mid-stream, client connection will break.
            error_message = f"ERROR: {str(e)}"
            yield error_message

    try:
        logging.info(f"Received chat request with query: {user_query[:100]}")
        # Return the streaming response. The frontend expects plain text chunks.
        return StreamingResponse(stream_generator(), media_type="text/plain; charset=utf-8")
    except Exception as e:
        logging.error(f"Error setting up streaming chat request: {e}", exc_info=True)
        # This HTTPException is for errors occurring *before* StreamingResponse is returned
        raise HTTPException(status_code=500, detail="Internal server error during streaming setup.")

@app.post("/api/ingest")
async def trigger_ingestion():
    """Trigger document ingestion into Milvus."""
    try:
        logging.info("Starting document ingestion via API...")
        success = ingest_documents()
        if success:
            # Reinitialize the retriever and chain after successful ingestion
            global embeddings, retriever, retrieval_qa_chain
            embeddings, retriever = build_vector_db()
            retrieval_qa_chain = create_rag_chain(retriever)
            return {"status": "success", "message": "Document ingestion completed successfully"}
        else:
            return {"status": "error", "message": "Document ingestion failed"}
    except Exception as e:
        logging.error(f"Ingestion endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@app.get("/api/status")
async def get_status():
    """Get system status including Milvus connection and knowledge base."""
    try:
        # Check Milvus connection
        milvus_status = validate_milvus_connection()
        
        # Check knowledge base path
        from app.services.ingest_service import KNOWLEDGEBASE_PATH
        kb_exists = KNOWLEDGEBASE_PATH.exists()
        
        pdf_count = 0
        if kb_exists:
            pdf_files = list(KNOWLEDGEBASE_PATH.glob("*.pdf"))
            pdf_count = len(pdf_files)
        
        return {
            "status": "healthy" if milvus_status and kb_exists else "unhealthy",
            "milvus_connected": milvus_status,
            "knowledge_base_exists": kb_exists,
            "knowledge_base_path": str(KNOWLEDGEBASE_PATH),
            "pdf_files_count": pdf_count
        }
    except Exception as e:
        logging.error(f"Status endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Infrabot Backend API is running"}
