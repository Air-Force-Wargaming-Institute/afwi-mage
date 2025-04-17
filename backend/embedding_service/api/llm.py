"""
API endpoints for LLM integration with vector stores.

This module provides API endpoints for:
- Analyzing vector store content with LLMs
- Querying vector stores with LLM-enhanced responses
"""

import logging
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.helpers import get_vectorstore_manager
import os

# Import from core module with proper error handling
try:
    from ..core.vectorstore import VectorStoreManager
except ImportError:
    from core.vectorstore import VectorStoreManager


# Set up logging
logger = logging.getLogger("embedding_service")

# Create router
# router = APIRouter(prefix="/llm", tags=["LLM Integration"])
router = APIRouter(tags=["LLM Integration"])

class VectorStoreAnalysisRequest(BaseModel):
    """Request to analyze a vector store's content using an LLM."""
    sample_size: int = 1000
    summary_length: str = "long"  # "short", "medium", "long"
    sampling_strategy: str = "random"  # "random", "grouped_by_source", "temporal", "clustering"
    
    model_config = {
        "extra": "ignore",
        "json_schema_extra": {
            "example": {
                "sample_size": 1000,
                "summary_length": "long",
                "sampling_strategy": "random"
            }
        }
    }


class VectorStoreAnalysisResponse(BaseModel):
    """Response containing analysis of a vector store."""
    raw_response: str  # The complete raw response from the LLM
    content_analysis: Optional[str] = None  # Optional parsed content analysis
    example_queries: Optional[List[str]] = None  # Optional parsed example queries
    document_count: int
    chunk_count: int
    sample_size: int
    sampling_strategy: str
    
    model_config = {
        "extra": "ignore"
    }


class VectorStoreLLMQueryRequest(BaseModel):
    """Request to query a vector store and get LLM-generated responses."""
    query: str
    top_k: int = 5
    score_threshold: float = 0.5
    use_llm: bool = True
    include_sources: bool = True
    
    model_config = {
        "extra": "ignore",
        "json_schema_extra": {
            "example": {
                "query": "What is the main topic of the documents?",
                "top_k": 5,
                "score_threshold": 0.5,
                "use_llm": True,
                "include_sources": True
            }
        }
    }


class VectorStoreLLMQueryResponse(BaseModel):
    """Response from an LLM-enhanced vector store query."""
    answer: str
    sources: Optional[List[Dict[str, Any]]] = None
    raw_chunks: Optional[List[Dict[str, Any]]] = None
    
    model_config = {
        "extra": "ignore"
    }


@router.post("/api/embedding/llm/vectorstores/{vectorstore_id}/analyze", response_model=VectorStoreAnalysisResponse)
async def analyze_vectorstore(
    vectorstore_id: str,
    request: VectorStoreAnalysisRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Analyze the content of a vector store using an LLM.
    
    This endpoint samples the vector store content and sends it to an LLM
    to generate insights about the content, potential use cases, and example queries.
    
    Args:
        vectorstore_id: ID of the vector store to analyze
        request: Analysis request parameters
        manager: Vector store manager instance
        
    Returns:
        Analysis results including content summary and example queries
    """
    try:
        # Get vector store info
        vs_info = manager.get_vectorstore_info(vectorstore_id)
        if not vs_info:
            raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
        
        # Check if the vector store has documents
        if not vs_info.get("files"):
            raise HTTPException(status_code=400, detail="Vector store is empty")
        
        # Get metadata
        metadata_path = manager.get_metadata_path(vectorstore_id)
        vs_metadata = manager.load_metadata(metadata_path)
        
        # Get sample chunks from the vector store
        chunk_sample = manager.get_content_sample(
            vectorstore_id,
            sample_size=request.sample_size,
            strategy=request.sampling_strategy
        )
        
        if not chunk_sample:
            raise HTTPException(status_code=400, detail="Could not retrieve content sample")
        
        # Determine the number of chunks to send to the LLM based on summary length
        max_chunks = {
            "short": min(5, len(chunk_sample)),
            "medium": min(15, len(chunk_sample)),
            "long": min(30, len(chunk_sample))
        }.get(request.summary_length, min(15, len(chunk_sample)))
        
        # Prepare chunks for LLM
        chunks_for_llm = chunk_sample[:max_chunks]
        
        # Generate prompt for the LLM
        prompt = generate_analysis_prompt(chunks_for_llm, vs_metadata["name"])
        
        # Get LLM response
        llm_response = get_llm_analysis(prompt)
        
        # Parse the response to extract structured information
        parsed_response = parse_llm_analysis(llm_response)
        
        # Prepare the response
        response = VectorStoreAnalysisResponse(
            raw_response=llm_response,
            content_analysis=parsed_response.get("content_analysis"),
            example_queries=parsed_response.get("example_queries"),
            document_count=len(vs_info.get("files", [])),
            chunk_count=vs_metadata.get("chunk_count", 0),
            sample_size=len(chunk_sample),
            sampling_strategy=request.sampling_strategy
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing vector store: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error analyzing vector store: {str(e)}")


@router.post("/api/embedding/llm/vectorstores/{vectorstore_id}/query", response_model=VectorStoreLLMQueryResponse)
async def llm_query_vectorstore(
    vectorstore_id: str,
    query_request: VectorStoreLLMQueryRequest,
    manager: VectorStoreManager = Depends(get_vectorstore_manager)
):
    """
    Query a vector store and get an LLM-generated response based on the retrieved chunks.
    
    Args:
        vectorstore_id: ID of the vector store to query
        query_request: Query request parameters
        manager: Vector store manager instance
        
    Returns:
        LLM-generated response and source information
    """
    try:
        # Get vector store info
        vs_info = manager.get_vectorstore_info(vectorstore_id)
        if not vs_info:
            raise HTTPException(status_code=404, detail=f"Vector store {vectorstore_id} not found")
        
        # Query the vector store using the enhanced method that preserves metadata
        results = manager.query_vector_store(
            vectorstore_id,
            query_request.query,
            top_k=query_request.top_k,
            score_threshold=query_request.score_threshold
        )
        
        if not results:
            return VectorStoreLLMQueryResponse(
                answer="No relevant information found for your query.",
                sources=[],
                raw_chunks=[]
            )
        
        # Log the metadata in the results to verify it's being preserved
        logger.info(f"Found {len(results)} relevant chunks for query")
        for i, result in enumerate(results[:3]):  # Log first 3 results
            if "metadata" in result:
                logger.info(f"Result {i} metadata: document_id={result['metadata'].get('document_id', 'unknown')}, "
                           f"security_classification={result['metadata'].get('security_classification', 'UNCLASSIFIED')}, "
                           f"filename={result['metadata'].get('filename', result['metadata'].get('original_filename', 'unknown'))}")
        
        # If LLM generation is requested
        if query_request.use_llm:
            # Prepare chunks for the LLM
            chunks_text = [result["text"] for result in results]
            metadata_list = [result.get("metadata", {}) for result in results]
            
            # Generate prompt for the LLM
            prompt = generate_query_prompt(vectorstore_id, query_request.query)
            
            # Get LLM response
            llm_response = get_llm_response(prompt)
            
            # Prepare sources if requested
            sources = None
            if query_request.include_sources:
                sources = []
                for result in results:
                    # Get a preview of the text
                    text_preview = result["text"][:200] + "..." if len(result["text"]) > 200 else result["text"]
                    
                    source = {
                        "text": text_preview,
                        "score": result.get("score", 0)
                    }
                    
                    # Add metadata if available
                    if "metadata" in result:
                        metadata = result["metadata"]
                        
                        # Include filename - try multiple fields
                        if "filename" in metadata:
                            source["filename"] = metadata["filename"]
                        elif "original_filename" in metadata:
                            source["filename"] = metadata["original_filename"]
                        
                        # Include security classification
                        if "security_classification" in metadata:
                            source["security_classification"] = metadata["security_classification"]
                        elif "content_security_classification" in metadata:
                            source["security_classification"] = metadata["content_security_classification"]
                        else:
                            source["security_classification"] = "UNCLASSIFIED"
                            
                        if "document_id" in metadata:
                            source["document_id"] = metadata["document_id"]
                        
                        # Include page information if available
                        if "page" in metadata:
                            source["page"] = metadata["page"]
                    
                    sources.append(source)
            
            # Return LLM-generated response with sources
            return VectorStoreLLMQueryResponse(
                answer=llm_response,
                sources=sources,
                raw_chunks=results if query_request.include_sources else None
            )
        else:
            # If LLM is not used, just return the chunks
            chunks_text = [result["text"] for result in results]
            
            return VectorStoreLLMQueryResponse(
                answer="\n\n".join(chunks_text),
                sources=None,
                raw_chunks=results if query_request.include_sources else None
            )
            
    except Exception as e:
        logger.error(f"Error querying vector store with LLM: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error querying vector store: {str(e)}")


def generate_analysis_prompt(chunks: List[Dict[str, Any]], vectorstore_name: str) -> str:
    """Generate a prompt for analyzing vector store content."""
    prompt = f"""
    You are analyzing content from a vector store named '{vectorstore_name}'.
    Below are sample text chunks from the vector store:
    
    """
    
    for i, chunk in enumerate(chunks):
        prompt += f"CHUNK {i+1}:\n{chunk['text']}\n\n"
    
    prompt += """
    Based on these samples, please provide:
    
    1. CONTENT ANALYSIS: A comprehensive analysis of what type of information is in this vector store.
    2. EXAMPLE QUERIES: 5-10 example queries that would be useful to run against this vector store.
    
    Format your response as:
    
    CONTENT ANALYSIS:
    [Your analysis here]
    
    EXAMPLE QUERIES:
    1. [Query 1]
    2. [Query 2]
    ...
    """
    
    return prompt


def generate_query_prompt(vs_id: str, query: str) -> str:
    """
    Generate a prompt for querying the vector store.
    
    Args:
        vs_id: ID of the vector store to query
        query: Query to run against the vector store
        
    Returns:
        Generated prompt
    """
    # Import get_vectorstore_manager here to avoid circular imports
    from api.vectorstore import get_vectorstore_manager
    
    try:
        # Get the vector store manager
        manager = get_vectorstore_manager()
        
        # Get information about the vector store
        vs_info = manager.get_vectorstore_info(vs_id)
        if not vs_info:
            logger.error(f"Vector store {vs_id} not found")
            return f"Error: Vector store {vs_id} not found"
        
        # Get top chunks from the vector store for the query
        chunks = manager.search_vectorstore(vs_id, query, top_k=5)
        
        # Format chunks for the prompt
        formatted_chunks = []
        for i, chunk in enumerate(chunks):
            content = chunk.page_content.strip()
            metadata = chunk.metadata
            source = metadata.get("source", "unknown")
            formatted_chunks.append(f"DOCUMENT {i+1} (source: {source}):\n{content}\n")
        
        # Combine chunks
        chunks_text = "\n".join(formatted_chunks)
        
        # Generate the prompt
        prompt = f"""You are a helpful assistant that answers questions based on the content of provided documents.

QUERY: {query}

DOCUMENTS:
{chunks_text}

Based on the provided documents, please answer the query. If the documents don't contain relevant information to answer the query, please state that clearly.

ANSWER:"""
        
        return prompt
        
    except Exception as e:
        logger.error(f"Error generating query prompt: {str(e)}")
        return f"Error generating query prompt: {str(e)}"


def get_llm_analysis(prompt: str) -> str:
    """
    Get LLM analysis using the provided prompt.
    
    This is a placeholder that would be replaced with actual LLM integration.
    In a production system, this would call an external API or a local model.
    """
    # TODO: Replace with actual LLM call
    logger.info("LLM analysis request (placeholder implementation)")
    
    # For now, return a placeholder response
    return """
    CONTENT ANALYSIS:
    The vector store contains technical documentation related to software development, 
    specifically focusing on APIs, data processing, and system architecture. The content 
    appears to be internal documentation that explains various components, functions, and 
    implementations of a software system. There are code examples, function descriptions, 
    and explanations of data structures.

    EXAMPLE QUERIES:
    1. How does the metadata processing work?
    2. What's the architecture of the vector store system?
    3. How are security classifications handled?
    4. What embedding models are supported?
    5. How does document chunking work?
    6. What's the API structure for vector store operations?
    7. How is job management implemented?
    8. What file formats are supported for document processing?
    """


def get_llm_response(prompt: str) -> str:
    """
    Get LLM response to a query prompt.
    
    This function uses the vLLM OpenAI-compatible API to generate responses to user queries.
    """
    try:
        # Log the LLM request
        logger.info("Sending query request to vLLM")
        
        # Import the LLM module
        try:
            from ..core.llm import generate_with_best_model
            
            # Use the LLM module to generate a response with appropriate settings
            options = {
                "temperature": 0.3,  # Lower temperature for more factual responses
                "max_tokens": 800,
                "top_p": 0.9
            }
            
            llm_response = generate_with_best_model(prompt, options)
            return llm_response
            
        except ImportError:
            # If the LLM module is not available, fall back to direct vLLM API call
            logger.warning("LLM module not found, falling back to direct vLLM API call")
            
            # Get vLLM URL from config
            try:
                from ..config import VLLM_BASE_URL
            except ImportError:
                try:
                    from config import VLLM_BASE_URL
                except ImportError:
                    VLLM_BASE_URL = os.environ.get("VLLM_BASE_URL", "http://host.docker.internal:8007/v1")
            
            # Prepare vLLM API request
            base_url = VLLM_BASE_URL.rstrip('/')
            url = f"{base_url}/chat/completions"
            
            # Use the specified model path
            model = "/models/DeepSeek-R1-Distill-Llama-8B-abliterated"
            
            # Log the model and URL being used
            logger.info(f"Using vLLM API at {url} with model {model}")
            
            payload = {
                "model": model,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,  # Lower temperature for more factual responses
                "top_p": 0.9,
                "max_tokens": 800
            }
            
            # Make the API request
            import requests
            headers = {"Content-Type": "application/json"}
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            
            # Check for successful response
            if response.status_code == 200:
                result = response.json()
                if "choices" in result and len(result["choices"]) > 0:
                    message = result["choices"][0].get("message", {})
                    llm_response = message.get("content", "")
                    
                    # Log success and response length
                    logger.info(f"Successfully received response from vLLM ({len(llm_response)} chars)")
                    
                    return llm_response
                else:
                    logger.error(f"Unexpected response format from vLLM API: {result}")
                    return "The language model returned an unexpected response format. Please try again later."
            else:
                # Log error details
                logger.error(f"Error from vLLM API: Status {response.status_code}, message: {response.text}")
                
                try:
                    error_data = response.json()
                    error_message = error_data.get("error", {}).get("message", "Unknown error")
                    logger.error(f"vLLM API error: {error_message}")
                    return f"The language model encountered an error: {error_message}. Please try again later."
                except:
                    # If all real LLM attempts failed, return a generic fallback response
                    logger.warning("vLLM attempt failed, returning placeholder response")
                    return "Based on the provided information, I'm not able to generate a specific answer at this time due to technical difficulties with the language model. Please try your query again later, or contact support if this issue persists."
    
    except Exception as e:
        # Log the error and return an error message
        logger.error(f"Error getting LLM response: {str(e)}", exc_info=True)
        return f"I encountered an error while processing your query: {str(e)}. Please try again later or contact support if this issue persists."


def parse_llm_analysis(response: str) -> Dict[str, Any]:
    """Parse the LLM analysis response to extract structured data."""
    result = {}
    
    # Extract content analysis
    if "CONTENT ANALYSIS:" in response:
        parts = response.split("CONTENT ANALYSIS:")
        if len(parts) > 1:
            analysis_text = parts[1]
            if "EXAMPLE QUERIES:" in analysis_text:
                analysis_text = analysis_text.split("EXAMPLE QUERIES:")[0]
            result["content_analysis"] = analysis_text.strip()
    
    # Extract example queries
    if "EXAMPLE QUERIES:" in response:
        parts = response.split("EXAMPLE QUERIES:")
        if len(parts) > 1:
            queries_text = parts[1].strip()
            queries = []
            
            # Try to extract numbered queries
            import re
            query_matches = re.findall(r'\d+\.\s+(.*?)(?=\d+\.|$)', queries_text, re.DOTALL)
            
            if query_matches:
                for match in query_matches:
                    queries.append(match.strip())
            else:
                # Fallback to line-by-line if numbered pattern doesn't match
                for line in queries_text.split('\n'):
                    line = line.strip()
                    if line and not line.startswith('CONTENT ANALYSIS:'):
                        queries.append(line)
            
            result["example_queries"] = queries
    
    return result 