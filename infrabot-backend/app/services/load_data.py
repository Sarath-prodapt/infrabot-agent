#load_data.py

print("DEBUG: load_data.py: Script starting now...")

import os
import logging
from pathlib import Path
from langchain_milvus.vectorstores import Milvus
from langchain.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain

from app.services.openai_llm import init_azure_chat_openai, create_chat_prompt_template # Import from openai_llm.py
from app.services.ingest_service import init_embeddings, get_milvus_retriever, validate_milvus_connection

env_index_path_str = os.getenv("INDEX_PATH")
if env_index_path_str:
    INDEX_PATH = Path(env_index_path_str)
else:
    # My Fallback if INDEX_PATH environment variable is not set
    if os.path.exists('/.dockerenv'):  # Check if running inside a Docker container
        INDEX_PATH = Path("./knowledgebase/")  # Default absolute path for Docker
    else:
        INDEX_PATH = Path("./knowledgebase/")     # Default relative path for local execution
# Milvus configuration
MILVUS_HOST = os.getenv("MILVUS_HOST", "milvus-standalone")
MILVUS_PORT = int(os.getenv("MILVUS_PORT", "19530"))
MILVUS_COLLECTION_NAME = os.getenv("MILVUS_COLLECTION_NAME", "infrabot_knowledgebase")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
# New: Environment variables specific to embeddings
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
AZURE_OPENAI_EMBEDDING_MODEL_NAME = os.getenv("AZURE_OPENAI_EMBEDDING_MODEL_NAME", "text-embedding-3-large") # Defaulting to text-embedding-3-large
OPENAI_MODEL_NAME = os.getenv("OPENAI_MODEL_NAME" , "o3-mini")  # Default to gpt-35-turbo if not set


def validate_paths():
    print(f"DEBUG: load_data.py: Validating INDEX_PATH={INDEX_PATH}")
    if not INDEX_PATH.exists() or not INDEX_PATH.is_dir():
        raise FileNotFoundError(f"Index path '{INDEX_PATH}' does not exist or is not a directory.")
    
    # Validate Milvus connection
    if not validate_milvus_connection():
        logging.warning("Milvus connection validation failed. Ingestion may be required.")

# Note: init_embeddings and get_split_documents functions are now imported from ingest_service

def build_vector_db():
    """Initialize embeddings and get retriever from Milvus."""
    print("DEBUG: load_data.py: Entered build_vector_db()")
    validate_paths()
    embeddings = init_embeddings()
    
    # Get retriever from existing Milvus collection
    try:
        retriever = get_milvus_retriever(embeddings)
        print("DEBUG: load_data.py: Successfully created Milvus retriever")
        logging.info("Successfully created Milvus retriever")
    except Exception as e:
        print(f"ERROR: load_data.py: Failed to create Milvus retriever: {e}")
        logging.error(f"Failed to create Milvus retriever: {e}")
        raise

    return embeddings, retriever

def create_rag_chain(retriever):
    """Create the RAG chain using Azure OpenAI."""
    llm = init_azure_chat_openai()
    prompt = create_chat_prompt_template()

  
    combine_docs_chain = create_stuff_documents_chain(llm, prompt)
    
   
    retrieval_qa_chain = create_retrieval_chain(retriever, combine_docs_chain)
    
    return retrieval_qa_chain # Return the single, combined chain