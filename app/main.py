
# app.py

from fastapi.middleware.cors import CORSMiddleware


from dotenv import load_dotenv
load_dotenv()

import logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse # Import StreamingResponse

import json
from pydantic import BaseModel, Field
from typing import List, Dict, Any, AsyncGenerator
from app.services.load_data import build_vector_db, create_rag_chain 
from app.models import ChatResponse # Assuming ChatCompletionResponse is meant to be ChatResponse

app = FastAPI(title="Prodapt IT Helpdesk LLM")

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

class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="The user's command or question")


try:
    embeddings, retriever = build_vector_db()
    retrieval_qa_chain = create_rag_chain(retriever) # create_rag_chain now returns the combined chain
    logging.info("FastAPI app initialized successfully with vector DB, retriever, and RAG chain.")
except Exception as e:
    logging.error(f"Failed to initialize FastAPI app: {e}")
    raise e

@app.post("/api/chat")  
#@app.post("/chat") #- change for dep
async def chat_endpoint(request: ChatRequest) -> StreamingResponse: # Changed return type
    user_query = request.prompt.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # This will be the input to the RAG chain
    standalone_question = user_query

    async def stream_generator() -> AsyncGenerator[str, None]:
        logging.info(f"Starting RAG chain astream with prompt: {standalone_question[:200]}")
        
        chunk_count = 0
        try:
            async for chunk in retrieval_qa_chain.astream({"input": standalone_question}):
                if chunk_count < 5: # Log first few chunks for debugging purposes
                    logging.debug(f"Stream chunk [{chunk_count}]: {str(chunk)[:200]}")
                chunk_count += 1
                
                content_to_yield = None
                if isinstance(chunk, dict):
                    # Common if the chain is a RunnableMap, e.g., {"answer": llm | StrOutputParser(), ...}
                    # It will yield partial dicts like {'answer': 'token'}
                    if "answer" in chunk and chunk["answer"] is not None:
                        content_to_yield = chunk["answer"]
                elif hasattr(chunk, "content"): # For AIMessageChunk, HumanMessageChunk from LLMs
                    content_to_yield = chunk.content
                elif isinstance(chunk, str): # If chain's final output parser (e.g., StrOutputParser) yields strings
                    content_to_yield = chunk
                
                if content_to_yield:
                    if not isinstance(content_to_yield, str):
                        logging.warning(f"Yielding non-string content, converting: {type(content_to_yield)}")
                        content_to_yield = str(content_to_yield)
                    
                    # Process content for proper formatting
                    # This ensures code blocks and other markdown elements are preserved
                    if content_to_yield: # Ensure not an empty string if that's undesirable
                        yield content_to_yield
            logging.info(f"Finished RAG chain astream. Total chunks: {chunk_count}")
        except Exception as e:
            logging.error(f"Error during RAG chain astream: {e}", exc_info=True)
            # If error happens mid-stream, client connection will break.
            error_message = f"ERROR: {str(e)}"
            yield error_message
            # The outer try-except handles errors before streaming starts.

    try:
        logging.info(f"Received chat request with query: {user_query[:100]}")
        logging.info(f"Standalone question for RAG: {standalone_question[:200]}")
        # Return the streaming response. The frontend expects plain text chunks.
        return StreamingResponse(stream_generator(), media_type="text/plain; charset=utf-8")
    except Exception as e:
        logging.error(f"Error setting up streaming chat request: {e}", exc_info=True)
        # This HTTPException is for errors occurring *before* StreamingResponse is returned
        raise HTTPException(status_code=500, detail="Internal server error during streaming setup.")
