"""
Ingest service for loading documents into Milvus vector database.
"""
import os
import logging
from pathlib import Path
from langchain_openai import AzureOpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import UnstructuredPDFLoader
from langchain_milvus.vectorstores import Milvus
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
AZURE_OPENAI_EMBEDDING_MODEL_NAME = os.getenv("AZURE_OPENAI_EMBEDDING_MODEL_NAME", "text-embedding-3-large")

# Milvus configuration
MILVUS_HOST = os.getenv("MILVUS_HOST", "milvus-standalone")
MILVUS_PORT = int(os.getenv("MILVUS_PORT", "19530"))
MILVUS_COLLECTION_NAME = os.getenv("MILVUS_COLLECTION_NAME", "infrabot_knowledgebase")

# Knowledge base path
KNOWLEDGEBASE_PATH = Path(os.getenv("KNOWLEDGEBASE_PATH", "./knowledgebase/"))


def init_embeddings():
    """Initialize Azure OpenAI embeddings."""
    logger.info("Initializing Azure OpenAI embeddings...")
    
    if not AZURE_OPENAI_API_KEY:
        raise EnvironmentError(
            "AZURE_OPENAI_API_KEY is not set. Please create a .env file "
            "with the required Azure credentials."
        )
    
    if not all([AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME]):
        raise EnvironmentError(
            "One or more required Azure environment variables are missing: "
            "AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME"
        )

    try:
        embeddings = AzureOpenAIEmbeddings(
            azure_deployment=AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
            model=AZURE_OPENAI_EMBEDDING_MODEL_NAME,
            api_key=AZURE_OPENAI_API_KEY,
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_version=AZURE_OPENAI_API_VERSION,
        )
        logger.info(f"Azure OpenAI embeddings initialized successfully with deployment '{AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME}'")
        return embeddings
    except Exception as e:
        logger.error(f"Failed to initialize Azure OpenAI embeddings: {e}")
        raise


def get_split_documents(index_path: Path):
    """Load and split documents from the knowledge base."""
    logger.info(f"Loading documents from {index_path}")
    
    if not index_path.exists():
        raise FileNotFoundError(f"Knowledge base path '{index_path}' not found.")
    
    split_docs = []
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    
    pdf_files = [f for f in os.listdir(index_path) if f.lower().endswith(".pdf")]
    logger.info(f"Found {len(pdf_files)} PDF files to process")
    
    for file_name in pdf_files:
        file_path = index_path / file_name
        if file_path.is_file():
            try:
                logger.info(f"Processing file: {file_name}")
                loader = UnstructuredPDFLoader(str(file_path))
                documents = loader.load()
                
                if documents:
                    splits = text_splitter.split_documents(documents)
                    split_docs.extend(splits)
                    logger.info(f"Successfully processed {file_name}: {len(splits)} chunks created")
                else:
                    logger.warning(f"No content extracted from {file_name}")
                    
            except Exception as e:
                logger.error(f"Failed to load file {file_name}: {e}")
                continue
    
    logger.info(f"Total document chunks created: {len(split_docs)}")
    return split_docs


def create_milvus_vectorstore(embeddings, documents):
    """Create or update Milvus vector store with documents."""
    logger.info(f"Creating Milvus vector store with {len(documents)} documents")
    
    connection_args = {
        "host": MILVUS_HOST,
        "port": MILVUS_PORT
    }
    
    try:
        vectorstore = Milvus.from_documents(
            documents=documents,
            embedding=embeddings,
            connection_args=connection_args,
            collection_name=MILVUS_COLLECTION_NAME,
            drop_old=True  # Drop existing collection and create new one
        )
        logger.info(f"Successfully created Milvus vector store with collection '{MILVUS_COLLECTION_NAME}'")
        return vectorstore
    except Exception as e:
        logger.error(f"Failed to create Milvus vector store: {e}")
        raise


def get_milvus_retriever(embeddings):
    """Get a retriever from existing Milvus collection."""
    logger.info("Creating Milvus retriever")
    
    connection_args = {
        "host": MILVUS_HOST,
        "port": MILVUS_PORT
    }
    
    try:
        vectorstore = Milvus(
            embedding_function=embeddings,
            connection_args=connection_args,
            collection_name=MILVUS_COLLECTION_NAME
        )
        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5}
        )
        logger.info("Successfully created Milvus retriever")
        return retriever
    except Exception as e:
        logger.error(f"Failed to create Milvus retriever: {e}")
        raise


def ingest_documents():
    """Main function to ingest documents into Milvus."""
    logger.info("Starting document ingestion process")
    
    try:
        # Initialize embeddings
        embeddings = init_embeddings()
        
        # Load and split documents
        split_docs = get_split_documents(KNOWLEDGEBASE_PATH)
        
        if not split_docs:
            logger.warning("No documents to ingest.")
            return False
        
        # Create vector store
        vectorstore = create_milvus_vectorstore(embeddings, split_docs)
        
        logger.info("Document ingestion completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Document ingestion failed: {e}")
        raise


def validate_milvus_connection():
    """Validate connection to Milvus."""
    try:
        from pymilvus import connections, utility
        
        # Connect to Milvus
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
        
        # Check if collection exists
        if utility.has_collection(MILVUS_COLLECTION_NAME):
            logger.info(f"Collection '{MILVUS_COLLECTION_NAME}' exists in Milvus")
            
            # Get collection info
            from pymilvus import Collection
            collection = Collection(MILVUS_COLLECTION_NAME)
            count = collection.num_entities
            logger.info(f"Collection contains {count} entities")
            return True
        else:
            logger.warning(f"Collection '{MILVUS_COLLECTION_NAME}' does not exist")
            return False
            
    except Exception as e:
        logger.error(f"Failed to validate Milvus connection: {e}")
        return False
    finally:
        try:
            connections.disconnect("default")
        except:
            pass


if __name__ == "__main__":
    # Run ingestion when script is executed directly
    ingest_documents()
