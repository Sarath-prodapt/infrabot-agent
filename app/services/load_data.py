#load_data.py

print("DEBUG: load_data.py: Script starting now...")

import os
import logging
from pathlib import Path
from pydantic import SecretStr 
from langchain_openai import AzureOpenAIEmbeddings 
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import  UnstructuredPDFLoader 
from langchain_community.vectorstores import Chroma
from langchain.prompts import ChatPromptTemplate


from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain

from app.services.openai_llm import init_azure_chat_openai, create_chat_prompt_template # Import from openai_llm.py

env_index_path_str = os.getenv("INDEX_PATH")
if env_index_path_str:
    INDEX_PATH = Path(env_index_path_str)
else:
    # My Fallback if INDEX_PATH environment variable is not set
    if os.path.exists('/.dockerenv'):  # Check if running inside a Docker container
        INDEX_PATH = Path("/app/knowledgebase/")  # Default absolute path for Docker
    else:
        INDEX_PATH = Path("./knowledgebase/")     # Default relative path for local execution
PERSIST_PATH = Path(os.getenv("PERSIST_PATH", "./persistdb/"))  # Default to relative path
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
# New: Environment variables specific to embeddings
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
AZURE_OPENAI_EMBEDDING_MODEL_NAME = os.getenv("AZURE_OPENAI_EMBEDDING_MODEL_NAME", "text-embedding-3-large") # Defaulting to text-embedding-3-large
OPENAI_MODEL_NAME = os.getenv("OPENAI_MODEL_NAME" , "o3-mini")  # Default to gpt-35-turbo if not set


def validate_paths():
    print(f"DEBUG: load_data.py: Validating INDEX_PATH={INDEX_PATH}, PERSIST_PATH={PERSIST_PATH}")
    if not INDEX_PATH.exists() or not INDEX_PATH.is_dir():
        raise FileNotFoundError(f"Index path '{INDEX_PATH}' does not exist or is not a directory.")
    if not PERSIST_PATH.exists():
        logging.info(f"Persist path '{PERSIST_PATH}' does not exist. Creating directory...")
        PERSIST_PATH.mkdir(parents=True, exist_ok=True)

def init_embeddings():
    """Initialize Azure OpenAI embeddings to use text-embedding-3-large."""
    print("DEBUG: load_data.py: Entered init_embeddings()")
    api_key_str = os.getenv("AZURE_OPENAI_API_KEY") # Standardized to AZURE_OPENAI_API_KEY
    logging.info(f"Attempting to initialize Azure OpenAI Embeddings. AZURE_OPENAI_API_KEY is set: {bool(api_key_str)}")

    if not all([api_key_str, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME, AZURE_OPENAI_EMBEDDING_MODEL_NAME]):
        raise EnvironmentError(
            "Missing one or more required environment variables for Azure OpenAI Embeddings: "
            "'AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_VERSION', "
            "'AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME', 'AZURE_OPENAI_EMBEDDING_MODEL_NAME'."
        )

    # This assertion helps Pylance understand that api_key_str is not None here.
    assert api_key_str is not None, "OPENAI_API_KEY must be a non-empty string due to the check above."
    assert AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME is not None, "AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME must be set."
    assert AZURE_OPENAI_EMBEDDING_MODEL_NAME is not None, "AZURE_OPENAI_EMBEDDING_MODEL_NAME must be set."

    try:
        embeddings = AzureOpenAIEmbeddings(
            azure_deployment=AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME, # Use the deployment name for embeddings
            model=AZURE_OPENAI_EMBEDDING_MODEL_NAME, # Use the base model name for embeddings
            api_key=SecretStr(api_key_str),
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_version=AZURE_OPENAI_API_VERSION,
        )
        logging.info(
            f"Azure OpenAI Embeddings initialized successfully with deployment '{AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME}' (model '{AZURE_OPENAI_EMBEDDING_MODEL_NAME}')."
        )
    except Exception as e:
        logging.error(f"Failed to initialize Azure OpenAI Embeddings: {e}")
        raise
    return embeddings

def get_split_documents(index_path: Path):
    split_docs = []
    print(f"DEBUG: load_data.py: Entered get_split_documents() for path: {index_path}")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

    for file_name in os.listdir(index_path):
        file_path = index_path / file_name
        if not file_path.is_file():
            logging.warning(f"Skipping {file_path} because it is not a file.")
            continue
        try:
            print(f"DEBUG: load_data.py: Loading file: {file_name}")
            logging.info(f"Loading file: {file_name}")
            file_name.lower().endswith(".pdf")
            loader = UnstructuredPDFLoader(str(file_path))
            
            documents = loader.load()
            if not documents:
                print(f"WARNING: load_data.py: No documents loaded from {file_name}")
                logging.warning(f"No documents loaded from {file_name}")
                continue
            split_docs.extend(text_splitter.split_documents(documents))
        except Exception as e:
            print(f"ERROR: load_data.py: Failed to load file {file_name}: {e}")
            logging.error(f"Failed to load file {file_name}: {e}")
            continue

    print(f"DEBUG: load_data.py: Total split documents: {len(split_docs)}")
    logging.info(f"Total split documents: {len(split_docs)}")
    return split_docs

def build_vector_db():
    """Initialize embeddings, load and split documents, create vector DB, and retriever."""
    print("DEBUG: load_data.py: Entered build_vector_db()")
    validate_paths()
    embeddings = init_embeddings()
    split_docs = get_split_documents(INDEX_PATH)
    if not split_docs:
        print("FATAL ERROR in load_data.py: No documents were successfully loaded and split. Cannot build vector DB.")
        logging.error("No documents were successfully loaded and split. Cannot build vector DB.")
        raise ValueError("No documents available to build the vector database. Check loading errors.")
    db = Chroma.from_documents(
        documents=split_docs,
        embedding=embeddings,
        persist_directory=str(PERSIST_PATH)
    )
    retriever = db.as_retriever(search_type="similarity", search_kwargs={"k": 5})

    return embeddings, retriever

def create_rag_chain(retriever):
    """Create the RAG chain using Azure OpenAI."""
    llm = init_azure_chat_openai()
    prompt = create_chat_prompt_template()

  
    combine_docs_chain = create_stuff_documents_chain(llm, prompt)
    
   
    retrieval_qa_chain = create_retrieval_chain(retriever, combine_docs_chain)
    
    return retrieval_qa_chain # Return the single, combined chain
