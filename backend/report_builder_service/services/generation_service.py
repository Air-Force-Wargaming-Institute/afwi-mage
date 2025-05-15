import httpx
import logging
from typing import Optional, Dict, Any, List

from config import (
    logger, EMBEDDING_SERVICE_BASE_URL, VLLM_CHAT_COMPLETIONS_URL, 
    VLLM_MODEL_NAME, VLLM_MAX_TOKENS, VLLM_TEMPERATURE, VLLM_REQUEST_TIMEOUT,
    REPORT_SECTION_SYSTEM_PROMPT, TOKEN_LIMIT, REGENERATION_TOKEN_LIMIT
)
from models.schemas import ReportElement, Report
from services.file_service import save_report_to_file
from services.websocket_service import ws_manager

async def generate_element_content(element: ReportElement, vector_store_id: Optional[str], previous_content: str = "") -> str:
    """
    Generate content for a report element using the LLM.
    
    Args:
        element: The report element to generate content for
        vector_store_id: Optional ID of vector store to retrieve context from
        previous_content: Content from previous sections for context
        
    Returns:
        str: The generated content
    """
    logger.info(f"Generating content for element: {element.title} (ID: {element.id})")
    user_instructions = element.instructions or ""
    full_user_prompt = user_instructions

    # Initialize context_text
    context_text = ""

    # Step 1: Retrieve context from vector store if vectorStoreId is provided
    if vector_store_id:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Use a more specific query if possible, for now using element instructions
                # Ensure the embedding service endpoint is correct and expects 'query' and 'vectorstore_id'
                response = await client.post(
                    f"{EMBEDDING_SERVICE_BASE_URL}/api/embedding/query", 
                    json={"query": user_instructions, "vectorstore_id": vector_store_id, "top_k": 3}
                )
                response.raise_for_status()
                retrieved_docs = response.json().get("results", [])
                if retrieved_docs:
                    context_text = "\n\nRelevant Information from Knowledge Store:\n"
                    for doc_info in retrieved_docs:
                        # Assuming doc_info is a dict and has a 'text' field or similar
                        context_text += f"- {doc_info.get('text', '')}\n"
                    logger.info(f"Retrieved context from vector store for element {element.id}")
        except httpx.RequestError as e:
            logger.error(f"Could not connect to embedding service for vector store context: {e}")
            # Optionally, append a notice about the error to the prompt or handle as a generation failure
            full_user_prompt += "\n\n[Note: Error retrieving contextual information from knowledge store due to connection issue.]"
        except httpx.HTTPStatusError as e:
            logger.error(f"Embedding service error for vector store context: {e.response.status_code} - {e.response.text}")
            full_user_prompt += f"\n\n[Note: Error retrieving contextual information from knowledge store: {e.response.status_code}]"
        except Exception as e:
            logger.error(f"Unexpected error retrieving vector store context: {e}")
            full_user_prompt += "\n\n[Note: Unexpected error retrieving contextual information from knowledge store.]"
    
    if context_text:
        full_user_prompt += context_text

    if previous_content:
        full_user_prompt = f"Consider the following previously generated report content:\n{previous_content}\n\nBased on that, and the following instructions, generate the current section:\n{full_user_prompt}"

    messages = [
        {"role": "system", "content": REPORT_SECTION_SYSTEM_PROMPT},
        {"role": "user", "content": full_user_prompt}
    ]

    vllm_payload = {
        "model": VLLM_MODEL_NAME,
        "messages": messages,
        "max_tokens": VLLM_MAX_TOKENS,
        "temperature": VLLM_TEMPERATURE,
        # Add other OpenAI compatible parameters if needed e.g. top_p, stop sequences
    }

    logger.info(f"Calling vLLM for element ID: {element.id}. Prompt: {full_user_prompt[:200]}...") # Log part of the prompt

    try:
        async with httpx.AsyncClient(timeout=VLLM_REQUEST_TIMEOUT) as client:
            response = await client.post(VLLM_CHAT_COMPLETIONS_URL, json=vllm_payload)
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            
            response_data = response.json()
            generated_text = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            if not generated_text:
                logger.error(f"vLLM response for {element.id} was empty or not in expected format: {response_data}")
                raise Exception("Received empty response from vLLM")
            
            logger.info(f"Successfully received response from vLLM for element ID: {element.id}")
            return generated_text

    except httpx.RequestError as e:
        logger.error(f"Could not connect to vLLM service at {VLLM_CHAT_COMPLETIONS_URL}: {e}")
        raise Exception(f"Connection to vLLM service failed: {str(e)}")
    except httpx.HTTPStatusError as e:
        logger.error(f"vLLM service returned an error: {e.response.status_code} - {e.response.text}")
        raise Exception(f"vLLM service error: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        logger.error(f"Unexpected error during vLLM call for element {element.id}: {str(e)}")
        # Check if it's a KeyError from accessing response_data, indicating unexpected format
        if isinstance(e, (KeyError, IndexError)):
             raise Exception(f"Error parsing vLLM response: {str(e)}. Response format might be unexpected.")
        raise Exception(f"Unexpected error during content generation: {str(e)}")

def estimate_tokens(text: str) -> int:
    """
    Estimate the number of tokens in a text string.
    Very rough estimate: 1 token ≈ 4 characters in English
    
    Args:
        text: The text to estimate tokens for
        
    Returns:
        int: Estimated token count
    """
    return len(text) // 4

def get_preceding_content(preceding_contents: List[str], tokens_limit: int = TOKEN_LIMIT) -> str:
    """
    Retrieves and formats previous report section content to serve as context for the current section generation.
    
    This function:
    1. Collects content from previously processed sections (explicit or AI-generated)
    2. Prioritizes most recent sections first (reversed order)
    3. Enforces a token limit to prevent context overflow
    4. When needed, truncates content to fit within token limits
    
    Args:
        preceding_contents: List of content from previously processed sections
        tokens_limit: Maximum number of tokens to include in context

    Returns:
        str: Formatted context string containing previous section content within token limits
    """
    combined = ""
    total_tokens = 0
    
    # Iterate through previous content in reverse order (most recent first)
    for content in reversed(preceding_contents):
        content_tokens = estimate_tokens(content)
        
        # If adding this content would exceed the limit, stop
        if total_tokens + content_tokens > tokens_limit:
            # If we haven't added anything yet, take a portion of this section
            if total_tokens == 0:
                # Take what we can fit within the limit
                # Very rough calculation - just truncate based on estimated character count
                chars_to_take = tokens_limit * 4
                partial_content = content[:chars_to_take] + "... [truncated]"
                combined = partial_content
            break
        
        # Add this content to the total
        if combined:
            combined = content + "\n\n" + combined
        else:
            combined = content
            
        total_tokens += content_tokens
        
        # If we've reached the limit, stop
        if total_tokens >= tokens_limit:
            break
            
    return combined

def get_context_within_limit(contents: List[str], token_limit: int) -> str:
    """
    Similar to get_preceding_content, but used specifically for regeneration.
    Gets context within a specific token limit, prioritizing most recent content.
    
    Args:
        contents: List of content sections
        token_limit: Maximum token limit to respect
        
    Returns:
        str: Combined context within the token limit
    """
    combined = ""
    total_tokens = 0
    
    for content in reversed(contents):  # Most recent first
        content_tokens = estimate_tokens(content)
        
        if total_tokens + content_tokens > token_limit:
            if total_tokens == 0:  # Take partial if nothing added yet
                chars_to_take = token_limit * 4
                partial_content = content[:chars_to_take] + "... [truncated]"
                combined = partial_content
            break
        
        if combined:
            combined = content + "\n\n" + combined
        else:
            combined = content
            
        total_tokens += content_tokens
        
        if total_tokens >= token_limit:
            break
            
    return combined

async def generate_export_markdown(report: Report) -> str:
    """
    Generate clean markdown content for export purposes.
    This version only includes AI-generated content for generative sections, not instructions.
    
    Args:
        report: The report definition to use
        
    Returns:
        str: Clean markdown content for export
    """
    logger.info(f"Generating export-ready markdown for report: {report.id}")
    markdown_parts = []  # Initialize a list to hold parts of the markdown
    
    # Add report title and description
    markdown_parts.append(f"# {report.name}\n")
    
    if report.description:
        markdown_parts.append(f"{report.description}\n\n")  # Add extra newline for spacing after description

    # Process each element in the report
    logger.info(f"Processing {len(report.content.elements)} elements for export")
    has_missing_content = False
    
    for element in report.content.elements:
        if element.title:
            markdown_parts.append(f"## {element.title}\n")
        
        if element.type == 'explicit':
            # For explicit elements, directly use the content
            if element.content:
                markdown_parts.append(f"{element.content}\n")
        elif element.type == 'generative':
            # For generative elements, use the generated content if available
            if element.ai_generated_content:
                # Use the AI-generated content directly (no instructions)
                markdown_parts.append(f"{element.ai_generated_content}\n")
            else:
                # If no generated content exists, log a warning - this content should be generated first
                has_missing_content = True
                logger.warning(f"Missing AI-generated content for section '{element.title or 'Untitled'}' - generation required")
                # Skip this section in the output

        markdown_parts.append("\n")  # Add spacing
    
    if has_missing_content:
        logger.warning(f"Report {report.id} has sections with missing AI-generated content")
        
    return "".join(markdown_parts)  # Join all parts together 