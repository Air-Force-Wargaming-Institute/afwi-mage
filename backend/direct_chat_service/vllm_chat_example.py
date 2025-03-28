"""
Example of how to replace VLLMOpenAI with VLLMOpenAIChat in the application.

This file demonstrates how to use the VLLMOpenAIChat class as a drop-in 
replacement for VLLMOpenAI in the direct_chat_service application.
"""

# -----------------------------------------------------------------------------
# ORIGINAL CODE (using VLLMOpenAI)
# -----------------------------------------------------------------------------

# Original imports
from langchain_community.llms.vllm import VLLMOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from config import config

# Original LLM initialization
llm = VLLMOpenAI(
    openai_api_base="http://localhost:8000/v1",
    openai_api_key="EMPTY",
    model_name=config.model_service.default_model,
    temperature=config.model_service.temperature,
    top_p=config.model_service.top_p,
    max_tokens=config.model_service.context_window,
    stop=config.model_service.stop
)

# Original prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

# Original chain
chain = prompt | llm

# Original runnable with history
chat_with_history = RunnableWithMessageHistory(
    chain,
    lambda session_id: get_or_create_history(session_id),
    input_messages_key="input",
    history_messages_key="history"
)

# -----------------------------------------------------------------------------
# NEW CODE (using VLLMOpenAIChat)
# -----------------------------------------------------------------------------

# Updated imports - just add the new class
from vllm_chat import VLLMOpenAIChat

# New LLM initialization - just change the class
# All other parameters remain the same
chat_llm = VLLMOpenAIChat(
    openai_api_base="http://localhost:8000/v1",
    openai_api_key="EMPTY",
    model_name=config.model_service.default_model,
    temperature=config.model_service.temperature,
    top_p=config.model_service.top_p,
    max_tokens=config.model_service.context_window,
    stop=config.model_service.stop
)

# The prompt template remains the same
chat_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

# Chain creation remains the same, just use the new LLM
chat_chain = chat_prompt | chat_llm

# Runnable with history remains the same, just use the new chain
chat_with_history_new = RunnableWithMessageHistory(
    chat_chain,
    lambda session_id: get_or_create_history(session_id),
    input_messages_key="input",
    history_messages_key="history"
)

# -----------------------------------------------------------------------------
# How to use it in the chat endpoint
# -----------------------------------------------------------------------------

"""
# In your chat endpoint, the invocation remains exactly the same:

@router.post("/chat/message", response_model=ChatResponse)
async def chat(request: ChatRequest, user_id: str = DEFAULT_USER):
    # ...existing code...
    
    # This line works the same with either LLM:
    response = chat_with_history.invoke(
        {"input": request.message},
        {"configurable": {"session_id": request.session_id}}
    )
    
    # ...rest of the endpoint...
""" 