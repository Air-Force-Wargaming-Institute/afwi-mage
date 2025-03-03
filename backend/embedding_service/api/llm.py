"""
API endpoints for LLM integration with vector stores.

This module provides API endpoints for:
- Analyzing vector store content with LLMs
- Querying vector stores with LLM-enhanced responses
"""

import logging
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

# Import from core module with proper error handling
try:
    from ..core.vectorstore import VectorStoreManager
except ImportError:
    from core.vectorstore import VectorStoreManager

# Import from local modules with proper error handling
try:
    from .vectorstore import get_vectorstore_manager
except ImportError:
    from api.vectorstore import get_vectorstore_manager

# Set up logging
logger = logging.getLogger("embedding_service")

# Create router
router = APIRouter(prefix="/llm", tags=["LLM Integration"])


class VectorStoreAnalysisRequest(BaseModel):
    """Request to analyze a vector store's content using an LLM."""
    sample_size: int = 1000
    summary_length: str = "long"  # "short", "medium", "long"
    sampling_strategy: str = "random"  # "random", "grouped_by_source", "temporal", "clustering"


class VectorStoreAnalysisResponse(BaseModel):
    """Response containing analysis of a vector store."""
    raw_response: str  # The complete raw response from the LLM
    content_analysis: Optional[str] = None  # Optional parsed content analysis
    example_queries: Optional[List[str]] = None  # Optional parsed example queries
    document_count: int
    chunk_count: int
    sample_size: int
    sampling_strategy: str


class VectorStoreLLMQueryRequest(BaseModel):
    """Request to query a vector store and get LLM-generated responses."""
    query: str
    top_k: int = 5
    score_threshold: float = 0.5
    use_llm: bool = True
    include_sources: bool = True


class VectorStoreLLMQueryResponse(BaseModel):
    """Response from an LLM-enhanced vector store query."""
    answer: str
    sources: Optional[List[Dict[str, Any]]] = None
    raw_chunks: Optional[List[Dict[str, Any]]] = None


@router.post("/vectorstores/{vectorstore_id}/analyze", response_model=VectorStoreAnalysisResponse)
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


@router.post("/vectorstores/{vectorstore_id}/query", response_model=VectorStoreLLMQueryResponse)
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
            prompt = generate_query_prompt(query_request.query, chunks_text, metadata_list)
            
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


def generate_query_prompt(query: str, chunks: List[str], metadata_list: List[Dict[str, Any]]) -> str:
    """Generate a prompt for answering a query based on retrieved chunks."""
    prompt = f"""
    You are answering a query based on retrieved information.
    
    QUERY: {query}
    
    Here are the relevant text chunks:
    
    """
    
    for i, (chunk, metadata) in enumerate(zip(chunks, metadata_list)):
        # Build source info string with security classification and filename
        source_info = []
        
        if metadata.get("filename") or metadata.get("original_filename"):
            filename = metadata.get("filename", metadata.get("original_filename", ""))
            source_info.append(f"Source: {filename}")
            
        if metadata.get("security_classification"):
            source_info.append(f"Classification: {metadata.get('security_classification')}")
            
        if metadata.get("page"):
            source_info.append(f"Page: {metadata.get('page')}")
            
        source_str = " | ".join(source_info) if source_info else ""
        
        prompt += f"CHUNK {i+1}:{' ' + source_str if source_str else ''}\n{chunk}\n\n"
    
    prompt += """
    Based ONLY on the information provided in these chunks, please answer the query.
    If the information is not in the provided chunks, state that you don't have enough information.
    Do not make up information. Cite specific chunks when appropriate in your answer.
    """
    
    return prompt


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
    
    This is a placeholder that would be replaced with actual LLM integration.
    In a production system, this would call an external API or a local model.
    """
    # TODO: Replace with actual LLM call
    logger.info("LLM query request (placeholder implementation)")
    
    # For now, return a placeholder response
    return "Based on the provided information, the system handles metadata by extracting key fields such as security classification and original filename from associated metadata files. If a metadata file doesn't exist, the system falls back to default values and attempts to extract information from file content. This approach ensures that critical metadata is preserved throughout the document processing pipeline."


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