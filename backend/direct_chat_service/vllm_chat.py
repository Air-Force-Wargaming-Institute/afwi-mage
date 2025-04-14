"""
A Chat model implementation using the vLLM OpenAI-compatible API.

This module provides a LangChain chat model that connects to a vLLM server
exposing an OpenAI-compatible API endpoint for chat completions.
"""

from typing import Any, Dict, List, Optional, Union
import logging
import json
import aiohttp  # Add import for async HTTP requests

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    ChatMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.callbacks.manager import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun

import requests

# Use the same logger as the main application
logger = logging.getLogger(__name__) # Use service logger if configured, else root

class VLLMOpenAIChat(BaseChatModel):
    """Chat model that uses vLLM's OpenAI-compatible chat completions API."""

    openai_api_base: str = "http://localhost:8000/v1"
    """Base URL for vLLM OpenAI-compatible API."""
    
    openai_api_key: str = "EMPTY"
    """API key for OpenAI API. Not validated by vLLM but required by the API format."""
    
    model_name: str
    """Model name to use with vLLM."""
    
    temperature: float = 0.7
    """Temperature parameter for generation."""
    
    top_p: float = 1.0
    """Top-p parameter for generation."""
    
    max_tokens: Optional[int] = None
    """Maximum number of tokens to generate."""
    
    stop: Optional[Union[str, List[str]]] = None
    """Stop sequences that cause the model to stop generating."""
    
    streaming: bool = False
    """Whether to stream the results."""

    # Add session property to reuse aiohttp session
    _session: Optional[aiohttp.ClientSession] = None
    
    @property
    def _llm_type(self) -> str:
        """Return type of LLM."""
        return "vllm-openai-chat"
    
    @property
    def _identifying_params(self) -> Dict[str, Any]:
        """Get the identifying parameters."""
        return {
            "model_name": self.model_name,
            "openai_api_base": self.openai_api_base,
            "temperature": self.temperature,
            "top_p": self.top_p,
            "max_tokens": self.max_tokens,
            "stop": self.stop,
        }
    
    def _convert_messages_to_openai_format(
        self, messages: List[BaseMessage]
    ) -> List[Dict[str, Any]]:
        """Convert LangChain messages to OpenAI format."""
        openai_messages = []
        for message in messages:
            role = None
            content = None
            if isinstance(message, HumanMessage):
                role = "user"
                content = message.content
            elif isinstance(message, AIMessage):
                role = "assistant"
                content = message.content
            elif isinstance(message, SystemMessage):
                role = "system"
                content = message.content
            elif isinstance(message, ChatMessage):
                # Map common roles if needed
                raw_role = message.role
                if raw_role == "human":
                    role = "user"
                elif raw_role == "ai":
                    role = "assistant"
                else:
                    role = raw_role # Use provided role
                content = message.content
            else:
                logger.warning(f"Unsupported message type encountered: {type(message)}")
                continue # Skip unsupported types
            
            if role and content is not None:
                 openai_messages.append({"role": role, "content": content})
            else:
                 logger.warning(f"Could not convert message: {message}")

        return openai_messages

    def _prepare_request_payload(
        self, messages: List[BaseMessage], stop: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Prepare the request payload for the API call."""
        # Combine stop sequences
        stop_sequences = list(self.stop) if isinstance(self.stop, list) else [self.stop] if self.stop else []
        if stop:
            stop_sequences.extend(stop)
        stop_sequences = list(set(stop_sequences)) # Remove duplicates

        openai_messages = self._convert_messages_to_openai_format(messages)
        
        payload = {
            "model": self.model_name,
            "messages": openai_messages,
            "temperature": self.temperature,
            "top_p": self.top_p,
        }
        
        if self.max_tokens is not None:
            payload["max_tokens"] = self.max_tokens
        
        if stop_sequences:
            payload["stop"] = stop_sequences

        return payload
    
    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Generate chat completion synchronously."""
        if self.streaming:
            # Streaming is typically handled by a different method (_stream or _astream)
            raise NotImplementedError("Synchronous streaming not implemented for this model.")
        
        payload = self._prepare_request_payload(messages, stop)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}"
        }
        
        api_url = f"{self.openai_api_base.rstrip('/')}/chat/completions"
        logger.info(f"VLLMOpenAIChat (sync): Sending request to {api_url}")
        # logger.debug(f"VLLMOpenAIChat (sync): Payload: {json.dumps(payload, indent=2)}")
        
        try:
            response = requests.post(api_url, headers=headers, json=payload)
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
            response_data = response.json()
            
            logger.info(f"VLLMOpenAIChat (sync): Response received. Usage: {response_data.get('usage')}")
            
            if not response_data.get("choices") or not response_data["choices"][0].get("message"):
                 logger.error(f"VLLMOpenAIChat (sync): Invalid response format: {response_data}")
                 raise ValueError("Invalid response format from API")

            assistant_message_content = response_data["choices"][0]["message"]["content"]
            message = AIMessage(content=assistant_message_content)
            generation = ChatGeneration(message=message)
            
            return ChatResult(generations=[generation])

        except requests.exceptions.RequestException as e:
            logger.error(f"VLLMOpenAIChat (sync): HTTP Request failed: {e}")
            raise
        except Exception as e:
             logger.error(f"VLLMOpenAIChat (sync): Error processing response: {e}", exc_info=True)
             raise
    
    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Asynchronously generate chat completion using aiohttp."""
        if self.streaming:
             raise NotImplementedError("Asynchronous streaming not implemented for this model.")

        payload = self._prepare_request_payload(messages, stop)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}"
        }

        api_url = f"{self.openai_api_base.rstrip('/')}/chat/completions"
        logger.info(f"VLLMOpenAIChat (async): Sending request to {api_url}")
        # logger.debug(f"VLLMOpenAIChat (async): Payload: {json.dumps(payload, indent=2)}")

        # Ensure session exists and is open
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
            logger.info("VLLMOpenAIChat (async): Created new aiohttp ClientSession.")

        try:
            async with self._session.post(api_url, headers=headers, json=payload) as response:
                response.raise_for_status() # Raise ClientResponseError for bad responses
                response_data = await response.json()
                
                logger.info(f"VLLMOpenAIChat (async): Response received. Status: {response.status}. Usage: {response_data.get('usage')}")
                
                if not response_data.get("choices") or not response_data["choices"][0].get("message"):
                    logger.error(f"VLLMOpenAIChat (async): Invalid response format: {response_data}")
                    raise ValueError("Invalid response format from API")

                assistant_message_content = response_data["choices"][0]["message"]["content"]
                message = AIMessage(content=assistant_message_content)
                generation = ChatGeneration(message=message)
                
                return ChatResult(generations=[generation])

        except aiohttp.ClientError as e:
            logger.error(f"VLLMOpenAIChat (async): HTTP Request failed: {e}")
            # Potentially close session on certain errors? Decide policy.
            # await self.aclose() 
            raise
        except Exception as e:
            logger.error(f"VLLMOpenAIChat (async): Error processing response: {e}", exc_info=True)
            raise

    async def aclose(self):
        """Close the aiohttp session if it exists and is open."""
        if self._session and not self._session.closed:
            await self._session.close()
            logger.info("VLLMOpenAIChat (async): Closed aiohttp ClientSession.")
            self._session = None

# Example usage:
"""
from langchain_core.chat_message_histories import ChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory

# Initialize the chat model
chat_model = VLLMOpenAIChat(
    openai_api_base="http://localhost:8000/v1",
    openai_api_key="EMPTY",
    model_name="DeepSeek-R1-Distill-Llama-8B",
    temperature=0.7,
    max_tokens=1024
)

# Create chat prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful AI assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

# Create the chain
chain = prompt | chat_model

# Set up history management
histories = {}

def get_or_create_history(session_id: str) -> ChatMessageHistory:
    if session_id not in histories:
        histories[session_id] = ChatMessageHistory()
    return histories[session_id]

# Create runnable with message history
chat_with_history = RunnableWithMessageHistory(
    chain,
    lambda session_id: get_or_create_history(session_id),
    input_messages_key="input",
    history_messages_key="history"
)

# Use the chat model with history
response = chat_with_history.invoke(
    {"input": "Hello, how are you?"},
    {"configurable": {"session_id": "unique-session-id"}}
)

print(response)
""" 