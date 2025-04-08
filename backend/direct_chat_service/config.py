import os
import yaml
from typing import List
from pydantic import BaseModel, Field


class OllamaConfig(BaseModel):
    base_url: str
    ollama_model: str
    embedding_url: str = None  # URL for embedding service
    embedding_model: str = "nomic-embed"  # Model to use for embeddings
    temperature: float = Field(ge=0.0, le=1.0)
    context_window: int = Field(gt=0)
    top_p: float = Field(ge=0.0, le=1.0)
    top_k: int = Field(ge=1, le=100)
    repeat_penalty: float = Field(ge=1.0, le=2.0)
    stop: List[str]
    num_gpu: int = Field(ge=0)
    num_thread: int = Field(ge=1)
    f16: bool = True
    timeout: int = 300  # Timeout for requests in seconds

    model_config = {
        'protected_namespaces': ()
    }

class VLLMConfig(BaseModel):
    chat_completion_url: str
    chat_model: str
    max_tokens: int = 4096
    temperature: float = 0.4
    timeout: int = 300
    top_p: float = 0.9
    top_k: int = 10
    context_window: int = 8000
    stop: List[str] = ["<|endoftext|>"]

class ServiceConfig(BaseModel):
    name: str
    host: str
    port: int
    debug: bool

class ApiConfig(BaseModel):
    core_service_url: str
    prefix: str

class CorsConfig(BaseModel):
    allowed_origins: List[str]
    allowed_methods: List[str]
    allowed_headers: List[str]

class ChatLoggingConfig(BaseModel):
    enabled: bool = True
    base_path: str = "sessions"
    history_window: int = Field(ge=1, default=100)
    max_token_window: int = Field(ge=1, default=8000)

class Config(BaseModel):
    service: ServiceConfig
    vllm: VLLMConfig
    api: ApiConfig
    cors: CorsConfig
    chat_logging: ChatLoggingConfig
    ollama: OllamaConfig

def load_config() -> Config:
    config_path = os.getenv('CONFIG_PATH', 'config.yaml')
    
    if not os.path.exists(config_path):
        config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
    
    with open(config_path, 'r') as f:
        config_dict = yaml.safe_load(f)
    
    return Config(**config_dict)

# Create a global config instance
config = load_config()
