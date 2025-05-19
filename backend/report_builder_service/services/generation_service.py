import httpx
import logging
from typing import Optional, Dict, Any, List
import json
from datetime import datetime

from config import (
    logger, EMBEDDING_SERVICE_BASE_URL, VLLM_CHAT_COMPLETIONS_URL, 
    VLLM_MODEL_NAME, VLLM_MAX_TOKENS, VLLM_TEMPERATURE, VLLM_REQUEST_TIMEOUT,
    REPORT_SECTION_SYSTEM_PROMPT, TOKEN_LIMIT, REGENERATION_TOKEN_LIMIT,
    VLLM_API_KEY
)
from models.schemas import ReportElement, Report
from services.file_service import save_report_to_file

async def generate_element_content(element: ReportElement, vector_store_id: Optional[str], previous_content: str = "") -> str:
    """
    Generate content for a report element using the LLM.
    
    Args:
        element: The report element to generate content for
        vector_store_id: Optional ID of vector store to retrieve context from
        previous_content: Content from previous sections for context
        
    Returns:
        str: The generated content
        
    Raises:
        ConnectionError: When connection to dependent services fails
        ValueError: When input data is invalid or improper
        TimeoutError: When a service request times out
        RuntimeError: For general processing errors
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
                logger.debug(f"Querying embedding service for context with query: {user_instructions[:50]}...")
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
                    logger.info(f"Retrieved {len(retrieved_docs)} context items from vector store for element {element.id}")
                else:
                    logger.warning(f"No context retrieved from vector store {vector_store_id} for element {element.id}")
        except httpx.TimeoutException as e:
            logger.error(f"Timeout connecting to embedding service for vector store context: {e}")
            # We'll continue with generation but note the issue
            full_user_prompt += "\n\n[Note: Could not retrieve contextual information from knowledge store due to timeout.]"
            # Don't throw an exception here as we can continue without vector store context
        except httpx.ConnectError as e:
            logger.error(f"Connection error to embedding service for vector store context: {e}")
            full_user_prompt += "\n\n[Note: Could not retrieve contextual information from knowledge store due to connection error.]"
            # Don't throw an exception here as we can continue without vector store context
        except httpx.HTTPStatusError as e:
            error_detail = f"status_code={e.response.status_code}"
            try:
                error_json = e.response.json()
                if "detail" in error_json:
                    error_detail = f"{error_detail}, detail={error_json['detail']}"
            except:
                pass
            
            logger.error(f"Embedding service error for vector store context: {error_detail}")
            full_user_prompt += f"\n\n[Note: Could not retrieve contextual information from knowledge store due to service error: {error_detail}]"
            # Don't throw an exception here as we can continue without vector store context
        except Exception as e:
            logger.error(f"Unexpected error retrieving vector store context: {str(e)}", exc_info=True)
            full_user_prompt += "\n\n[Note: Could not retrieve contextual information from knowledge store due to an unexpected error.]"
            # Don't throw an exception here as we can continue without vector store context
    
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

    logger.info(f"Calling vLLM for element ID: {element.id}. Prompt length: {len(full_user_prompt)} chars")
    
    # Step 2: Call the LLM service with comprehensive error handling
    try:
        # Create a client with configurable timeout
        async with httpx.AsyncClient(timeout=VLLM_REQUEST_TIMEOUT) as client:
            start_time = datetime.now()
            logger.debug(f"Starting LLM API call at {start_time}")
            
            headers = {"Content-Type": "application/json"}
            if VLLM_API_KEY:
                headers["Authorization"] = f"Bearer {VLLM_API_KEY}"
                logger.debug("Using VLLM_API_KEY for authorization.")
            
            # Make the API call with proper exception handling
            response = await client.post(VLLM_CHAT_COMPLETIONS_URL, json=vllm_payload, headers=headers)
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            logger.debug(f"LLM API call completed in {duration:.2f} seconds")
            
            # Check for HTTP errors
            response.raise_for_status()
            
            # Parse the response
            response_data = response.json()
            
            # Validate response structure
            if 'choices' not in response_data or not response_data.get('choices'):
                raise ValueError("LLM response missing 'choices' field or it's empty")
                
            first_choice = response_data.get('choices', [{}])[0]
            if 'message' not in first_choice:
                raise ValueError("LLM response choice missing 'message' field")
                
            generated_text = first_choice.get('message', {}).get('content', '')
            
            # Validate we got actual content
            if not generated_text or not generated_text.strip():
                raise ValueError("Received empty content from LLM")
            
            logger.info(f"Successfully received response from vLLM for element ID: {element.id}, content length: {len(generated_text)} chars")
            return generated_text

    except httpx.TimeoutException as e:
        logger.error(f"Timeout during LLM call for element {element.id}: {str(e)}")
        raise TimeoutError(f"LLM service request timed out after {VLLM_REQUEST_TIMEOUT} seconds: {str(e)}")
    
    except httpx.ConnectError as e:
        logger.error(f"Connection error to LLM service at {VLLM_CHAT_COMPLETIONS_URL}: {str(e)}")
        raise ConnectionError(f"Could not connect to LLM service: {str(e)}")
    
    except httpx.HTTPStatusError as e:
        status_code = e.response.status_code
        logger.error(f"LLM service returned HTTP {status_code} error for element {element.id}")
        
        # Try to extract more detailed error information from the response
        error_detail = f"HTTP {status_code}"
        try:
            error_json = e.response.json()
            if "error" in error_json:
                error_detail = f"{error_detail}: {error_json['error']}"
        except:
            # If we can't parse JSON, use the text content
            try:
                error_detail = f"{error_detail}: {e.response.text[:200]}"
            except:
                pass
        
        # Map common status codes to more specific error messages
        if status_code == 400:
            raise ValueError(f"Bad request to LLM service: {error_detail}")
        elif status_code == 401 or status_code == 403:
            raise PermissionError(f"Authentication/authorization error with LLM service: {error_detail}")
        elif status_code == 404:
            raise ValueError(f"LLM service endpoint not found: {error_detail}")
        elif status_code >= 500:
            raise RuntimeError(f"LLM service internal error: {error_detail}")
        else:
            raise RuntimeError(f"Unexpected error from LLM service: {error_detail}")
    
    except ValueError as e:
        # Pass through ValueError exceptions we've raised
        logger.error(f"Value error during LLM generation for element {element.id}: {str(e)}")
        raise
    
    except KeyError as e:
        # Handle unexpected response format errors
        logger.error(f"Unexpected response format from LLM for element {element.id}: {str(e)}")
        raise ValueError(f"Unexpected LLM response format: {str(e)}")
    
    except json.JSONDecodeError as e:
        # Handle JSON parsing errors
        logger.error(f"Invalid JSON response from LLM for element {element.id}: {str(e)}")
        raise ValueError(f"LLM service returned invalid JSON: {str(e)}")
    
    except Exception as e:
        # Catch-all for any other unexpected errors
        logger.error(f"Unexpected error during LLM call for element {element.id}: {str(e)}", exc_info=True)
        raise RuntimeError(f"Unexpected error during content generation: {str(e)}")

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
        element_content_parts = [] # To build content for the current element
        
        actual_content = ""
        if element.type == 'explicit':
            if element.content:
                actual_content = element.content
        elif element.type == 'generative':
            if element.ai_generated_content:
                actual_content = element.ai_generated_content
            else:
                has_missing_content = True
                logger.warning(f"Missing AI-generated content for section '{element.title or 'Untitled'}' - generation required. Skipping in export.")
                markdown_parts.append("\n") # Add spacing even if skipped
                continue

        if not actual_content.strip(): # Skip if content is empty or just whitespace
            markdown_parts.append("\n") # Add spacing even if skipped
            continue

        # Apply formatting based on element.format
        if element.format and element.format.startswith('h'):
            try:
                level = int(element.format[1:])
                if 1 <= level <= 6:
                    element_content_parts.append(f"{'#' * level} {actual_content}\n")
                else: # Default to paragraph if level is invalid
                    element_content_parts.append(f"{actual_content}\n")
            except ValueError: # Default to paragraph if format is like 'hX' but X is not a number
                element_content_parts.append(f"{actual_content}\n")
        elif element.format == 'bulletList':
            lines = actual_content.split('\n')
            for line in lines:
                element_content_parts.append(f"- {line}\n")
        elif element.format == 'numberedList':
            lines = actual_content.split('\n')
            for i, line in enumerate(lines):
                element_content_parts.append(f"{i + 1}. {line}\n")
        else: # Default to paragraph
            element_content_parts.append(f"{actual_content}\n")
        
        markdown_parts.append("".join(element_content_parts))
        markdown_parts.append("\n")  # Add spacing after the element's content
    
    if has_missing_content:
        logger.warning(f"Report {report.id} has sections with missing AI-generated content")
        
    return "".join(markdown_parts)  # Join all parts together 