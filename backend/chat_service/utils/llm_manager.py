import os
import requests # Added for HTTP requests
import json # Added for JSON processing
from langchain_core.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_core.callbacks.manager import CallbackManager
from langchain_openai import ChatOpenAI
from config_ import load_config
from typing import AsyncGenerator, Union, Any, Coroutine, List, Optional
import logging 

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
    _available_models = None  # Cache of available models

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LLMManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self._initialize()
            self._initialized = True

    def _initialize(self):
        """Initialize the LLM instances with configuration from environment variables and config file"""
        config = load_config()
        callbacks = CallbackManager([StreamingStdOutCallbackHandler()])

        # Get vLLM configuration from environment variables
        vllm_base_url = os.getenv('VLLM_API_BASE', config.get('BASE_URL', 'http://host.docker.internal:8007/v1'))
        vllm_api_key = os.getenv('VLLM_API_KEY', config.get('API_KEY', 'None'))
        vllm_model_name = os.getenv('VLLM_MODEL_NAME', config.get('LOCAL_LLM', '/models/DeepHermes-3-Llama-3-8B-Preview'))
        
        # Remove /v1 from base_url for model list endpoint if present
        vllm_api_base = vllm_base_url
        if vllm_base_url.endswith('/v1'):
            vllm_api_base = vllm_base_url[:-3]
        
        # Set placeholder API key if none is provided or if it's 'None'
        effective_api_key = "no_key"  # Default placeholder
        if vllm_api_key and vllm_api_key.lower() != 'none':
             effective_api_key = vllm_api_key
        
        # Initialize available models cache
        self._available_models = self._fetch_available_models(vllm_api_base)
        logger.info(f"Available vLLM models: {self._available_models}")
        
        # Store base kwargs for reuse
        self._base_kwargs = {
            'temperature': config.get('TEMPERATURE', 0.7),
            'base_url': vllm_base_url,
            'api_key': effective_api_key,  # Use the placeholder if necessary
            'max_tokens': config.get('MAX_TOKENS', 1024),
            'model': vllm_model_name
        }
        logger.info(f"Initializing LLMManager with base configuration: {self._base_kwargs}")

        self._streaming_llm = ChatOpenAI(
            **self._base_kwargs,
            streaming=True,
            callbacks=callbacks
        )

        self._non_streaming_llm = ChatOpenAI(**self._base_kwargs)

    def _fetch_available_models(self, base_url: str) -> List[str]:
        """
        Fetch available models from vLLM API
        
        Args:
            base_url: The base URL for the vLLM API (without /v1)
            
        Returns:
            List of available model names or empty list if fetch fails
        """
        try:
            # Try the OpenAI-compatible models endpoint
            models_url = f"{base_url}/v1/models"
            logger.info(f"Fetching available models from: {models_url}")
            
            response = requests.get(models_url, timeout=5)
            if response.status_code == 200:
                models_data = response.json()
                if 'data' in models_data and isinstance(models_data['data'], list):
                    model_names = [model['id'] for model in models_data['data']]
                    return model_names
                else:
                    logger.warning(f"Unexpected models response format: {models_data}")
            else:
                logger.warning(f"Failed to fetch models: HTTP {response.status_code}")
                
            # If we're here, the OpenAI endpoint didn't work, try a fallback endpoint
            # This might be specific to your vLLM deployment
            healthcheck_url = f"{base_url}/health"
            logger.info(f"Trying fallback health endpoint: {healthcheck_url}")
            
            response = requests.get(healthcheck_url, timeout=5)
            if response.status_code == 200:
                health_data = response.json()
                if 'model' in health_data:
                    # This endpoint might return the active model
                    return [health_data['model']]
                    
            # As a last resort, check if the configured model exists
            config = load_config()
            default_model = os.getenv('VLLM_MODEL_NAME', config.get('LOCAL_LLM', '/models/DeepHermes-3-Llama-3-8B-Preview'))
            if default_model:
                return [default_model]
                
        except Exception as e:
            logger.error(f"Error fetching available models: {e}", exc_info=True)
        
        # Return an empty list if all attempts fail
        return []

    def model_exists(self, model_name: str) -> bool:
        """
        Check if a model exists in the vLLM service
        
        Args:
            model_name: The name of the model to check
            
        Returns:
            True if the model exists, False otherwise
        """
        if not self._available_models:  # If cache is empty
            return True  # Assume model exists to allow trying
            
        # If any model in available_models is a prefix of model_name, consider it a match
        # This handles cases where model_name includes version tags
        for available_model in self._available_models:
            if model_name == available_model or model_name.startswith(f"{available_model}:"):
                return True
                
        # For models that might be specified as paths
        if model_name.startswith('/models/'):
            # Extract just the model name without path
            basename = os.path.basename(model_name)
            for available_model in self._available_models:
                if basename in available_model:
                    return True
        
        return False

    def get_llm(self, model: str = None) -> ChatOpenAI:
        """
        Returns a ChatOpenAI instance configured for vLLM.
        If a model name is provided, it attempts to use that model.
        Otherwise, it returns the default configured instance.
        
        Args:
            model (str, optional): The specific model name to use. Defaults to the configured default model.
        """
        config = load_config()
        # Determine if streaming is enabled from config, default to True if not specified
        use_streaming = config.get('STREAMING_LLM', True) 

        if model and model != self._base_kwargs['model']:
            logger.info(f"Requesting LLM with specific model: {model}")
            
            # Check if the model exists
            if not self.model_exists(model):
                logger.warning(f"Model '{model}' not found in available models. Falling back to default: {self._base_kwargs['model']}")
                return self._streaming_llm if use_streaming else self._non_streaming_llm
            
            # Create a new instance with the specified model, inheriting other base settings
            specific_kwargs = self._base_kwargs.copy()
            specific_kwargs['model'] = model
            
            if use_streaming:
                specific_kwargs['streaming'] = True
                # Attempt to get callbacks from the default streaming instance
                specific_kwargs['callbacks'] = getattr(self._streaming_llm, 'callbacks', None)
                logger.debug("Using streaming configuration for specific model.")
            else:
                 specific_kwargs['streaming'] = False # Ensure streaming is off if not requested
                 if 'callbacks' in specific_kwargs: # Remove callbacks if not streaming
                     del specific_kwargs['callbacks']

            logger.debug(f"Creating new LLM instance with configuration: {specific_kwargs}")
            try:
                # Return a new ChatOpenAI instance configured for the specific model
                return ChatOpenAI(**specific_kwargs)
            except Exception as e:
                logger.error(f"Failed to create LLM instance for model {model}: {e}. Falling back to default.")
                # Fallback to default if specific model instantiation fails
                return self._streaming_llm if use_streaming else self._non_streaming_llm
        else:
            # Return the appropriate default instance (streaming or non-streaming)
            logger.debug(f"Using default LLM instance (Streaming: {use_streaming})")
            return self._streaming_llm if use_streaming else self._non_streaming_llm

    @property
    def llm(self):
        """Returns the appropriate default LLM instance based on the configuration"""
        return self.get_llm() # Calls get_llm without a specific model to get the default

    async def process_streaming_response(self, response: Union[AsyncGenerator, str, Coroutine[Any, Any, Any]]) -> str:
        if isinstance(response, str):
            return response
            
        if isinstance(response, Coroutine):
            # If it's a coroutine, await it to get the async generator or final result
            response = await response

        # Check if the awaited result is already a string (non-streaming case)
        if isinstance(response, str):
            return response
        
        # Proceed assuming it's an async generator (streaming case)
        full_response = ""
        try:
            async for chunk in response:
                # Process AIMessageChunk or string chunk
                content_chunk = getattr(chunk, 'content', chunk) # Get content if AIMessageChunk
                if isinstance(content_chunk, str):
                    full_response += content_chunk
                    # Optional: Implement real-time streaming here if needed
                    # await self.emit_chunk(content_chunk)
        except Exception as e:
            logger.error(f"Error processing streaming response: {e}", exc_info=True)
            # Depending on requirements, either raise, return partial, or return error message
            return f"Error processing stream: {e}" # Example: return error string
        return full_response

    async def __call__(self, prompt, model: str = None):
        """
        Handle both streaming and non-streaming responses using invoke or ainvoke.
        
        Args:
            prompt: The prompt to process (expects LangChain message format, e.g., [HumanMessage(...)])
            model (str, optional): The model to use. Defaults to config value.
        """
        llm_instance = self.get_llm(model)
        
        try:
            # Use ainvoke for async operation
            response = await llm_instance.ainvoke(prompt) 
            
            # If the response from ainvoke is an async generator, process it
            if isinstance(response, AsyncGenerator):
                 return await self.process_streaming_response(response)
            # If it's a BaseMessage (like AIMessage), extract content
            elif hasattr(response, 'content'):
                 return response.content
            # Otherwise, assume it's already a string (shouldn't typically happen with ainvoke)
            else:
                 return str(response)
                 
        except Exception as e:
            logger.error(f"Error during LLM call: {e}", exc_info=True)
            # Return an error message or raise the exception depending on desired handling
            return f"Error invoking LLM: {e}" 
