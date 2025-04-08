"""
A Chat model implementation using the vLLM OpenAI-compatible API.

This module provides a LangChain chat model that connects to a vLLM server
exposing an OpenAI-compatible API endpoint for chat completions.
"""

from typing import Any, Dict, List, Mapping, Optional, Union, Iterator, Sequence, Tuple
import logging
import json

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    ChatMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_core.callbacks.manager import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun
from langchain_core.pydantic_v1 import root_validator, Field

import requests

# Use the same logger as the main application
logger = logging.getLogger("embedding_service")

class VLLMOpenAIChat(BaseChatModel):
    """Chat model that uses vLLM's OpenAI-compatible chat completions API."""

    openai_api_base: str = "http://localhost:8007/v1"
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
            if isinstance(message, HumanMessage):
                openai_messages.append({"role": "user", "content": message.content})
            elif isinstance(message, AIMessage):
                openai_messages.append({"role": "assistant", "content": message.content})
            elif isinstance(message, SystemMessage):
                openai_messages.append({"role": "system", "content": message.content})
            elif isinstance(message, ChatMessage):
                role = message.role
                # Map 'human' to 'user' and 'ai' to 'assistant' if needed
                if role == "human":
                    role = "user"
                elif role == "ai":
                    role = "assistant"
                openai_messages.append({"role": role, "content": message.content})
            else:
                raise ValueError(f"Unsupported message type: {type(message)}")
        return openai_messages
    
    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Generate chat completion using vLLM OpenAI-compatible API."""
        if self.streaming:
            raise ValueError("For streaming, please use _astream_chat method.")
        
        # Combine stop sequences from instance and method parameters
        if self.stop and stop:
            stop_sequences = list(set(self.stop if isinstance(self.stop, list) else [self.stop] + stop))
        elif self.stop:
            stop_sequences = self.stop if isinstance(self.stop, list) else [self.stop]
        else:
            stop_sequences = stop

        # Convert LangChain messages to OpenAI format
        openai_messages = self._convert_messages_to_openai_format(messages)
        
        # Prepare request payload
        payload = {
            "model": self.model_name,
            "messages": openai_messages,
            "temperature": self.temperature,
            "top_p": self.top_p,
        }
        
        if self.max_tokens:
            payload["max_tokens"] = self.max_tokens
        
        if stop_sequences:
            payload["stop"] = stop_sequences
        
        # Make API request
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}"
        }
        
        # Log the exact payload being sent
        logger.info(f"VLLMOpenAIChat: Sending request to vLLM server at: {self.openai_api_base}")
        logger.info(f"VLLMOpenAIChat: Request headers: {headers}")
        
        # Log the full payload with formatted JSON for readability
        logger.info(f"VLLMOpenAIChat: Request payload: {json.dumps(payload, indent=2)}")
        
        # Log message structure summary for quick debugging
        logger.info(f"VLLMOpenAIChat: Message sequence: {[(m['role'], len(m['content'])) for m in openai_messages]}")
        
        # Detailed logging of each message (optional, can be verbose)
        for i, msg in enumerate(openai_messages):
            logger.debug(f"VLLMOpenAIChat: Message {i} ({msg['role']}): {msg['content'][:100]}...")
        
        response = requests.post(
            f"{self.openai_api_base.rstrip('/')}/chat/completions",
            headers=headers,
            json=payload,
        )
        
        # Log response status
        logger.info(f"VLLMOpenAIChat: Response status: {response.status_code}")
        
        response.raise_for_status()
        response_data = response.json()
        
        # Log response summary
        logger.info(f"VLLMOpenAIChat: Response received: Model: {response_data.get('model')}, Tokens: {response_data.get('usage', {})}")
        
        # Extract and return the result
        assistant_message = response_data["choices"][0]["message"]["content"]
        
        message = AIMessage(content=assistant_message)
        generation = ChatGeneration(message=message)
        
        return ChatResult(generations=[generation])
    
    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Asynchronously generate chat completion using vLLM OpenAI-compatible API."""
        # This is a simple implementation that doesn't use true async
        # In a real implementation, you'd want to use aiohttp or httpx for async requests
        return self._generate(messages, stop, run_manager, **kwargs)

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