import httpx
import logging
from typing import Optional, Dict, Any, List
import json
from datetime import datetime
import re

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

# Helper function to filter out thinking tags
def _filter_thinking_tags(text: str) -> str:
    """Removes <think>...</think> and <thinking>...</thinking> tags and their content."""
    if not text:
        return ""
    # Non-greedy match for anything between <thinking> and </thinking>
    text = re.sub(r"<thinking>.*?</thinking>", "", text, flags=re.DOTALL)
    # Non-greedy match for anything between <think> and </think>
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    return text

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
    For sections, only child elements are included (sections themselves are not rendered).
    
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

    # Extract all elements from items (flattening sections to just their child elements)
    all_elements = []
    
    # Handle both new items structure and legacy elements structure for backward compatibility
    if hasattr(report.content, 'items') and report.content.items:
        # New structure with sections and elements
        for item in report.content.items:
            if hasattr(item, 'item_type') or (isinstance(item, dict) and item.get('item_type')):
                item_type = item.item_type if hasattr(item, 'item_type') else item.get('item_type')
                
                if item_type == 'element':
                    # Add element directly
                    all_elements.append(item)
                elif item_type == 'section':
                    # Skip section itself, but add its child elements
                    if hasattr(item, 'elements') and item.elements:
                        all_elements.extend(item.elements)
                    elif isinstance(item, dict) and item.get('elements'):
                        all_elements.extend(item.get('elements', []))
            else:
                # Item without item_type - treat as element for backward compatibility
                all_elements.append(item)
    elif hasattr(report.content, 'elements') and report.content.elements:
        # Legacy structure - all items are elements
        all_elements = report.content.elements
    else:
        # No content found
        logger.warning(f"Report {report.id} has no content items or elements")
        all_elements = []

    # Process each element for export
    logger.info(f"Processing {len(all_elements)} elements for export (flattened from sections)")
    has_missing_content = False
    
    for element_index, element in enumerate(all_elements):
        element_content_parts = [] # For collecting parts of the current element's content

        # Handle both Pydantic models and dict representations
        if hasattr(element, 'format'):
            # Pydantic model
            element_format = element.format
            element_type = element.type
            element_content = element.content
            element_title = element.title
            element_ai_content = element.ai_generated_content
            element_id = element.id
        else:
            # Dict representation
            element_format = element.get('format')
            element_type = element.get('type')
            element_content = element.get('content')
            element_title = element.get('title')
            element_ai_content = element.get('ai_generated_content')
            element_id = element.get('id', f'element-{element_index}')

        # Skip elements with no content unless they are headings (which might just use their title)
        is_heading = element_format and element_format.startswith('h')
        
        # Determine actual content to use
        actual_content = None
        if element_type == 'explicit':
            actual_content = element_content if element_content is not None else (element_title if is_heading and element_title is not None else '')
        elif element_type == 'generative':
            actual_content = element_ai_content if element_ai_content is not None else ''
            if not actual_content: # Check if AI content is missing for a generative section
                logger.warning(f"Element {element_id} (generative) has no ai_generated_content for export.")
                has_missing_content = True
        
        if actual_content is None: # Should not happen if logic above is correct
             actual_content = ""

        # Filter thinking tags from the content
        actual_content = _filter_thinking_tags(actual_content)

        if not actual_content.strip(): # Skip if content is empty or just whitespace
            markdown_parts.append("\n") # Add spacing even if skipped
            continue

        # Apply formatting based on element.format
        if element_format and element_format.startswith('h'):
            try:
                level = int(element_format[1:])
                if 1 <= level <= 6:
                    element_content_parts.append(f"{'#' * level} {actual_content}\n")
                else: # Default to paragraph if level is invalid
                    element_content_parts.append(f"{actual_content}\n")
            except ValueError: # Default to paragraph if format is like 'hX' but X is not a number
                element_content_parts.append(f"{actual_content}\n")
        elif element_format == 'bulletList':
            lines = actual_content.split('\n')
            for line in lines:
                if line.strip():  # Only add non-empty lines
                    element_content_parts.append(f"- {line.strip()}\n")
        elif element_format == 'numberedList':
            lines = actual_content.split('\n')
            for i, line in enumerate(lines):
                if line.strip():  # Only add non-empty lines
                    element_content_parts.append(f"{i + 1}. {line.strip()}\n")
        else: # Default to paragraph
            element_content_parts.append(f"{actual_content}\n")
        
        markdown_parts.append("".join(element_content_parts))
        markdown_parts.append("\n")  # Add spacing after the element's content
    
    if has_missing_content:
        logger.warning(f"Report {report.id} has sections with missing AI-generated content")
        
    return "".join(markdown_parts)  # Join all parts together 