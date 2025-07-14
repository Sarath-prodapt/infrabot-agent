#!/usr/bin/env python3
"""
Management script for infrabot-backend operations.
This script provides utilities for data ingestion and database management.
"""
import argparse
import sys
import logging
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.services.ingest_service import ingest_documents, validate_milvus_connection

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Infrabot Backend Management Tool")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Ingest command
    ingest_parser = subparsers.add_parser("ingest", help="Ingest documents into Milvus")
    ingest_parser.add_argument(
        "--force", 
        action="store_true", 
        help="Force re-ingestion even if collection exists"
    )
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate Milvus connection and data")
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Check system status")
    
    args = parser.parse_args()
    
    if args.command == "ingest":
        logger.info("Starting document ingestion...")
        try:
            success = ingest_documents()
            if success:
                logger.info("Document ingestion completed successfully!")
                sys.exit(0)
            else:
                logger.error("Document ingestion failed!")
                sys.exit(1)
        except Exception as e:
            logger.error(f"Document ingestion failed with error: {e}")
            sys.exit(1)
    
    elif args.command == "validate":
        logger.info("Validating Milvus connection...")
        try:
            is_valid = validate_milvus_connection()
            if is_valid:
                logger.info("Milvus connection and data validation successful!")
                sys.exit(0)
            else:
                logger.warning("Milvus validation failed. You may need to run ingestion.")
                sys.exit(1)
        except Exception as e:
            logger.error(f"Validation failed with error: {e}")
            sys.exit(1)
    
    elif args.command == "status":
        logger.info("Checking system status...")
        try:
            # Check Milvus connection
            milvus_status = validate_milvus_connection()
            logger.info(f"Milvus Status: {'✓ Connected' if milvus_status else '✗ Disconnected'}")
            
            # Check knowledge base path
            from app.services.ingest_service import KNOWLEDGEBASE_PATH
            kb_exists = KNOWLEDGEBASE_PATH.exists()
            logger.info(f"Knowledge Base: {'✓ Found' if kb_exists else '✗ Not Found'} at {KNOWLEDGEBASE_PATH}")
            
            if kb_exists:
                pdf_files = list(KNOWLEDGEBASE_PATH.glob("*.pdf"))
                logger.info(f"PDF Files: {len(pdf_files)} files found")
            
            overall_status = milvus_status and kb_exists
            logger.info(f"Overall Status: {'✓ Ready' if overall_status else '✗ Needs Attention'}")
            
            sys.exit(0 if overall_status else 1)
            
        except Exception as e:
            logger.error(f"Status check failed with error: {e}")
            sys.exit(1)
    
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
