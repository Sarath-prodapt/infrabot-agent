"""
Enhanced connection management for Milvus and Azure OpenAI.
"""
import asyncio
from contextlib import asynccontextmanager
from typing import Optional
import logging
from pymilvus import connections, utility
from langchain_milvus.vectorstores import Milvus
from app.services.ingest_service import init_embeddings, MILVUS_HOST, MILVUS_PORT, MILVUS_COLLECTION_NAME

logger = logging.getLogger(__name__)

class MilvusConnectionManager:
    """Singleton connection manager for Milvus."""
    
    _instance: Optional['MilvusConnectionManager'] = None
    _connection_alias = "default"
    _is_connected = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def connect(self):
        """Establish connection to Milvus with retry logic."""
        if self._is_connected:
            return
            
        max_retries = 3
        for attempt in range(max_retries):
            try:
                connections.connect(
                    alias=self._connection_alias,
                    host=MILVUS_HOST,
                    port=MILVUS_PORT,
                    timeout=30
                )
                self._is_connected = True
                logger.info(f"Connected to Milvus at {MILVUS_HOST}:{MILVUS_PORT}")
                return
            except Exception as e:
                logger.warning(f"Milvus connection attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise
    
    async def disconnect(self):
        """Safely disconnect from Milvus."""
        if self._is_connected:
            try:
                connections.disconnect(self._connection_alias)
                self._is_connected = False
                logger.info("Disconnected from Milvus")
            except Exception as e:
                logger.error(f"Error disconnecting from Milvus: {e}")
    
    def is_connected(self) -> bool:
        """Check if connection is active."""
        return self._is_connected and connections.has_connection(self._connection_alias)
    
    async def health_check(self) -> bool:
        """Perform health check on Milvus connection."""
        try:
            if not self.is_connected():
                await self.connect()
            
            # Check if collection exists
            return utility.has_collection(MILVUS_COLLECTION_NAME)
        except Exception as e:
            logger.error(f"Milvus health check failed: {e}")
            return False

# Global connection manager instance
milvus_manager = MilvusConnectionManager()

@asynccontextmanager
async def get_milvus_connection():
    """Context manager for Milvus connections."""
    await milvus_manager.connect()
    try:
        yield milvus_manager
    finally:
        # Keep connection alive for reuse
        pass
