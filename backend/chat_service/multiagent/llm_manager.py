from langchain_core.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_core.callbacks.manager import CallbackManager
from langchain_openai import ChatOpenAI
from team_config import load_config
from typing import AsyncGenerator, Union, Any, Coroutine

class LLMManager:
    """
    Singleton class to manage LLM instances for all agents
    """
    _instance = None
    _streaming_llm = None
    _non_streaming_llm = None
    _initialized = False

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

        self._streaming_llm = ChatOpenAI(
            temperature=config['TEMPERATURE'],
            base_url=config['BASE_URL'],
            api_key=config['API_KEY'],
            max_tokens=config['MAX_TOKENS'],
            streaming=True,
            callbacks=callbacks,
            model=config['LOCAL_LLM']
        )

        self._non_streaming_llm = ChatOpenAI(
            temperature=config['TEMPERATURE'],
            base_url=config['BASE_URL'],
            api_key=config['API_KEY'],
            max_tokens=config['MAX_TOKENS'],
            model=config['LOCAL_LLM']
        )

    @property
    def streaming(self):
        return self._streaming_llm

    @property
    def non_streaming(self):
        return self._non_streaming_llm

    @property
    def llm(self):
        """Returns the appropriate LLM instance based on the configuration"""
        config = load_config()
        return self._streaming_llm if config.get('STREAMING_LLM', 1) else self._non_streaming_llm

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

    async def __call__(self, prompt):
        """Handle both streaming and non-streaming responses."""
        if isinstance(prompt, AsyncGenerator):
            return await self.process_streaming_response(prompt)
        return prompt 