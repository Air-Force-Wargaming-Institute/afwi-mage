from typing import List
import aiohttp
from log import logger
from config import Config

class EmbeddingService:
    def __init__(self, config: Config):
        self.config = config
        self.embedding_url = config.ollama.embedding_url
        self.embedding_model = config.ollama.embedding_model
        self.timeout = config.ollama.timeout

    async def get_embeddings(self, text: str) -> List[float]:
        """Get embeddings for a text using Ollama API."""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": self.embedding_model,
                    "prompt": text
                }
                async with session.post(
                    f"{self.embedding_url}/api/embeddings",
                    json=payload,
                    timeout=self.timeout
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"Failed to get embeddings: {error_text}")
                    
                    result = await response.json()
                    return result["embedding"]

        except Exception as e:
            logger.error(f"Error getting embeddings: {str(e)}")
            raise 