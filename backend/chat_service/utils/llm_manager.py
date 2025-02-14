from langchain_core.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_core.callbacks.manager import CallbackManager
from langchain_openai import ChatOpenAI
from config_ import load_config
from typing import AsyncGenerator, Union, Any, Coroutine
import logging 

from utils.model_list import OllamaModelManager

logger = logging.getLogger(__name__)

class LLMManager:
    """
    Singleton class to manage LLM instances for all agents
    """
    _instance = None
    _streaming_llm = None
    _non_streaming_llm = None
    _initialized = False
    _base_kwargs = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LLMManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self._initialize()
            self._initialized = True

    def _initialize(self):
        """Initialize the LLM instances with configuration from config file"""
        config = load_config()
        callbacks = CallbackManager([StreamingStdOutCallbackHandler()])

        # Store base kwargs for reuse
        self._base_kwargs = {
            'temperature': config['TEMPERATURE'],
            'base_url': config['BASE_URL'],
            'api_key': config['API_KEY'],
            'max_tokens': config['MAX_TOKENS'],
            'model': config['LOCAL_LLM']
        }

        self._streaming_llm = ChatOpenAI(
            **self._base_kwargs,
            streaming=True,
            callbacks=callbacks
        )

        self._non_streaming_llm = ChatOpenAI(**self._base_kwargs)

    def get_llm(self, model: str = None) -> ChatOpenAI:
        """
        Returns an LLM instance with the specified model, or default if none provided/invalid.
        
        Args:
            model (str, optional): The model to use. Defaults to config value.
        """
        config = load_config()
        base_llm = self._streaming_llm if config.get('STREAMING_LLM', 1) else self._non_streaming_llm
        
        if model:
            logger.info(f"Requesting LLM with model: {model}")
            logger.debug(f"Current base LLM configuration: {self._base_kwargs}")
            
            # Check if requested model exists in Ollama using OLLAMA_API_URL
            ollama = OllamaModelManager(base_url=config.get('OLLAMA_API_URL'))
            
            logger.debug(f"Checking Ollama at: {ollama.base_url}")
            
            if not ollama.model_exists(model):
                logger.warning(f"Model {model} not found in Ollama. Using default model: {self._base_kwargs['model']}")
                return base_llm
            
            # Create new instance with specified model using stored base kwargs
            logger.info(f"Creating new LLM instance with model: {model}")
            kwargs = self._base_kwargs.copy()
            kwargs['model'] = model
            
            if isinstance(base_llm, self._streaming_llm.__class__):
                kwargs['streaming'] = True
                kwargs['callbacks'] = base_llm.callbacks if hasattr(base_llm, 'callbacks') else None
                logger.debug("Using streaming configuration")

            logger.debug(f"Final LLM configuration: {kwargs}")
            return ChatOpenAI(**kwargs)
        
        logger.debug("No specific model requested, using base LLM")
        return base_llm

    @property
    def llm(self):
        """Returns the appropriate LLM instance based on the configuration"""
        return self.get_llm()

    async def process_streaming_response(self, response: Union[AsyncGenerator, str, Coroutine[Any, Any, Any]]) -> str:
        if isinstance(response, str):
            return response
            
        if isinstance(response, Coroutine):
            response = await response

        full_response = ""
        try:
            async for chunk in response:
                if chunk:
                    chunk_str = str(chunk)
                    full_response += chunk_str
                    # Optional: Implement real-time streaming here if needed
                    # await self.emit_chunk(chunk)
        except Exception as e:
            print(f"Error processing streaming response: {e}")
            raise
        return full_response

    async def __call__(self, prompt, model: str = None):
        """
        Handle both streaming and non-streaming responses.
        
        Args:
            prompt: The prompt to process
            model (str, optional): The model to use. Defaults to config value.
        """
        if isinstance(prompt, AsyncGenerator):
            return await self.process_streaming_response(prompt)
        return self.get_llm(model)(prompt) 
