from fastapi import APIRouter, Query, Request, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import httpx
import asyncio
import tempfile
import subprocess
from pathlib import Path

from models.schemas import GeneratedReportMarkdown, ErrorResponse, ErrorCodes, WordExportOptions, Report
from services.file_service import load_report_from_file, save_report_to_file
from services.generation_service import (
    generate_element_content, get_preceding_content, get_context_within_limit, 
    generate_export_markdown, estimate_tokens
)
from services.websocket_service import ws_manager
from utils.errors import create_error_response, get_status_code_for_error
from config import (
    REPORTS_DIR, EMBEDDING_SERVICE_BASE_URL, TOKEN_LIMIT, REGENERATION_TOKEN_LIMIT, logger
)

router = APIRouter(prefix="/api/report_builder", tags=["report_generation"])

@router.post("/reports/{report_id}/generate", response_model=Union[GeneratedReportMarkdown, ErrorResponse])
async def generate_report(report_id: str, force_regenerate: bool = False, client_id: Optional[str] = Query(None)):
    logger.info(f"Received request to generate report: {report_id}, Force regenerate: {force_regenerate}, Client ID: {client_id}")
    report = load_report_from_file(REPORTS_DIR / f"{report_id}.json")
    if not report:
        logger.error(f"Report not found: {report_id}")
        error_response = create_error_response(ErrorCodes.REPORT_NOT_FOUND, "Report not found")
        return JSONResponse(
            status_code=get_status_code_for_error(ErrorCodes.REPORT_NOT_FOUND),
            content=error_response
        )

    if not report.content or not report.content.elements:
        logger.warning(f"Report {report_id} has no elements to generate.")
        error_code = ErrorCodes.INVALID_REPORT_STRUCTURE
        error_response = create_error_response(
            error_code, 
            "Report has no content elements to generate."
        )
        return JSONResponse(
            status_code=get_status_code_for_error(error_code),
            content=error_response
        )
    
    try:
        # Check if the report has a vector store ID but the vector store doesn't exist
        if report.vectorStoreId:
            try:
                # Verify that the vector store exists by making a call to the embedding service
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{EMBEDDING_SERVICE_BASE_URL}/api/embedding/vectorstores/{report.vectorStoreId}")
                    if response.status_code == 404:
                        logger.warning(f"Report {report_id} references non-existent vector store ID: {report.vectorStoreId}")
                        error_code = ErrorCodes.VECTOR_STORE_ERROR
                        error_response = create_error_response(
                            error_code,
                            f"Vector store with ID {report.vectorStoreId} not found",
                            {"vector_store_id": report.vectorStoreId}
                        )
                        return JSONResponse(
                            status_code=get_status_code_for_error(error_code),
                            content=error_response
                        )
                    response.raise_for_status()
            except httpx.RequestError as e:
                logger.error(f"Error connecting to embedding service: {str(e)}")
                error_code = ErrorCodes.VECTOR_STORE_ERROR
                error_response = create_error_response(
                    error_code,
                    f"Could not connect to embedding service to verify vector store: {str(e)}",
                    {"vector_store_id": report.vectorStoreId}
                )
                return JSONResponse(
                    status_code=get_status_code_for_error(error_code),
                    content=error_response
                )
            except httpx.HTTPStatusError as e:
                # Only return an error if it's not a 404 (already handled above)
                if e.response.status_code != 404:
                    logger.error(f"Embedding service error: {str(e)}")
                    error_code = ErrorCodes.VECTOR_STORE_ERROR
                    error_response = create_error_response(
                        error_code,
                        f"Embedding service returned an error: {str(e)}",
                        {"vector_store_id": report.vectorStoreId, "status_code": e.response.status_code}
                    )
                    return JSONResponse(
                        status_code=get_status_code_for_error(error_code),
                        content=error_response
                    )

        logger.info(f"Generating report for ID: {report_id}")
        markdown_parts = []  # Initialize a list to hold parts of the markdown
        markdown_parts.append(f"# {report.name}\n")

        if report.description:
            markdown_parts.append(f"{report.description}\n\n")  # Add extra newline for spacing after description

        # Track any errors encountered during generation
        generation_errors = []
        
        # --- Keep track of preceding content for context ---
        preceding_contents = []  # List to keep track of previous content
        
        # Process each element in the report
        logger.info(f"Processing {len(report.content.elements)} elements")
        for i, element in enumerate(report.content.elements):
            # Send progress update via WebSocket if client_id is provided
            if client_id:
                try:
                    await ws_manager.send_json({
                        "type": "generation_progress",
                        "data": {
                            "report_id": report_id,
                            "total_elements": len(report.content.elements),
                            "current_element": i + 1,
                            "element_id": element.id,
                            "element_title": element.title or "Untitled Element",
                            "status": "processing"
                        }
                    }, client_id)
                except Exception as e:
                    logger.error(f"Failed to send WebSocket progress update: {e}")
            
            element_markdown = ""
            
            # Add element title to the markdown if it exists
            if element.title:
                element_markdown += f"## {element.title}\n"
            
            if element.type == 'explicit':
                # For explicit elements, directly use the content
                if element.content:
                    element_markdown += f"{element.content}\n"
                    
                    # Add this content to our preceding context if not empty
                    if element.content.strip():
                        section_content = f"## {element.title or 'Untitled Section'}\n{element.content}"
                        preceding_contents.append(section_content)
                        logger.debug(f"Added explicit content to preceding context. Total sections: {len(preceding_contents)}")
                    
            elif element.type == 'generative':
                # Get preceding content for context
                previous_content = get_preceding_content(preceding_contents)
                logger.info(f"Using {estimate_tokens(previous_content)} tokens of preceding content for element {i+1} ({element.id})")
                
                # Log how many sections are being used as context
                if preceding_contents:
                    logger.info(f"Using content from {len(preceding_contents)} previous section(s) as context")
                    
                # Generate content for this element
                logger.info(f"Generating content for element ID: {element.id}, Title: {element.title or 'Untitled'}")
                
                try:
                    # Send update that generation is starting for this element
                    if client_id:
                        try:
                            await ws_manager.send_json({
                                "type": "generation_status",
                                "data": {
                                    "report_id": report_id,
                                    "element_id": element.id,
                                    "status": "generating",
                                    "message": f"Generating content for {element.title or 'Untitled Element'}..."
                                }
                            }, client_id)
                        except Exception as e:
                            logger.error(f"Failed to send WebSocket status update: {e}")
                    
                    # Use our generation service function
                    generated_content = await generate_element_content(
                        element=element,
                        vector_store_id=report.vectorStoreId,
                        previous_content=previous_content
                    )
                    
                    if generated_content:
                        # Store the generated content
                        element.ai_generated_content = generated_content
                        element_markdown += f"{generated_content}\n"
                        
                        # Add this content to our preceding context
                        section_content = f"## {element.title or 'Untitled Section'}\n{generated_content}"
                        preceding_contents.append(section_content)
                        logger.debug(f"Added generated content to preceding context. Total sections: {len(preceding_contents)}")
                        
                        # Save the report after each successfully generated section to persist changes
                        save_report_to_file(report)
                        logger.debug(f"Saved report to file after generating content for element {element.id}")
                        
                        # Send update that generation completed successfully for this element
                        if client_id:
                            try:
                                await ws_manager.send_json({
                                    "type": "generation_status",
                                    "data": {
                                        "report_id": report_id,
                                        "element_id": element.id,
                                        "status": "completed",
                                        "content": generated_content
                                    }
                                }, client_id)
                            except Exception as e:
                                logger.error(f"Failed to send WebSocket completion update: {e}")
                    else:
                        error_message = "Generation returned empty content"
                        logger.warning(f"Empty content generated for element {element.id}")
                        element_markdown += f"*[Error: {error_message}]*\n"
                        generation_errors.append({
                            "element_id": element.id,
                            "element_title": element.title or "Untitled Element",
                            "error_code": ErrorCodes.GENERATION_FAILED,
                            "error_message": error_message
                        })
                        
                        # Send error update
                        if client_id:
                            try:
                                await ws_manager.send_json({
                                    "type": "generation_status",
                                    "data": {
                                        "report_id": report_id,
                                        "element_id": element.id,
                                        "status": "error",
                                        "error": error_message
                                    }
                                }, client_id)
                            except Exception as e:
                                logger.error(f"Failed to send WebSocket error update: {e}")
                        
                except TimeoutError as e:
                    # Handle timeout errors specifically
                    error_code = ErrorCodes.GENERATION_TIMEOUT
                    error_message = f"Generation timed out: {str(e)}"
                    logger.error(f"Timeout error for element {element.id}: {str(e)}")
                    element_markdown += f"*[Error: Generation timed out]*\n"
                    generation_errors.append({
                        "element_id": element.id,
                        "element_title": element.title or "Untitled Element",
                        "error_code": error_code,
                        "error_message": error_message
                    })
                    
                    # Send specific timeout error update
                    if client_id:
                        try:
                            await ws_manager.send_json({
                                "type": "generation_status",
                                "data": {
                                    "report_id": report_id,
                                    "element_id": element.id,
                                    "status": "error",
                                    "error": error_message,
                                    "error_code": error_code
                                }
                            }, client_id)
                        except Exception as e:
                            logger.error(f"Failed to send WebSocket error update: {e}")
                
                except ConnectionError as e:
                    # Handle connection errors specifically
                    error_code = ErrorCodes.GENERATION_CONNECTION_ERROR
                    error_message = f"Connection error: {str(e)}"
                    logger.error(f"Connection error for element {element.id}: {str(e)}")
                    element_markdown += f"*[Error: Connection failed to generation service]*\n"
                    generation_errors.append({
                        "element_id": element.id,
                        "element_title": element.title or "Untitled Element",
                        "error_code": error_code,
                        "error_message": error_message
                    })
                    
                    # Send specific connection error update
                    if client_id:
                        try:
                            await ws_manager.send_json({
                                "type": "generation_status",
                                "data": {
                                    "report_id": report_id,
                                    "element_id": element.id,
                                    "status": "error",
                                    "error": error_message,
                                    "error_code": error_code
                                }
                            }, client_id)
                        except Exception as e:
                            logger.error(f"Failed to send WebSocket error update: {e}")
                
                except ValueError as e:
                    # Handle value/validation errors
                    error_code = ErrorCodes.GENERATION_VALIDATION_ERROR
                    error_message = f"Invalid data or response: {str(e)}"
                    logger.error(f"Validation error for element {element.id}: {str(e)}")
                    element_markdown += f"*[Error: {error_message}]*\n"
                    generation_errors.append({
                        "element_id": element.id,
                        "element_title": element.title or "Untitled Element",
                        "error_code": error_code,
                        "error_message": error_message
                    })
                    
                    # Send validation error update
                    if client_id:
                        try:
                            await ws_manager.send_json({
                                "type": "generation_status",
                                "data": {
                                    "report_id": report_id,
                                    "element_id": element.id,
                                    "status": "error",
                                    "error": error_message,
                                    "error_code": error_code
                                }
                            }, client_id)
                        except Exception as e:
                            logger.error(f"Failed to send WebSocket error update: {e}")
                
                except PermissionError as e:
                    # Handle authentication/authorization errors
                    error_code = ErrorCodes.GENERATION_AUTH_ERROR
                    error_message = f"Authentication error: {str(e)}"
                    logger.error(f"Auth error for element {element.id}: {str(e)}")
                    element_markdown += f"*[Error: Authentication failed with generation service]*\n"
                    generation_errors.append({
                        "element_id": element.id,
                        "element_title": element.title or "Untitled Element",
                        "error_code": error_code,
                        "error_message": error_message
                    })
                    
                    # Send auth error update
                    if client_id:
                        try:
                            await ws_manager.send_json({
                                "type": "generation_status",
                                "data": {
                                    "report_id": report_id,
                                    "element_id": element.id,
                                    "status": "error",
                                    "error": error_message,
                                    "error_code": error_code
                                }
                            }, client_id)
                        except Exception as e:
                            logger.error(f"Failed to send WebSocket error update: {e}")
                
                except RuntimeError as e:
                    # Handle general runtime errors
                    error_code = ErrorCodes.GENERATION_RUNTIME_ERROR
                    error_message = f"Runtime error: {str(e)}"
                    logger.error(f"Runtime error for element {element.id}: {str(e)}")
                    element_markdown += f"*[Error: {error_message}]*\n"
                    generation_errors.append({
                        "element_id": element.id,
                        "element_title": element.title or "Untitled Element",
                        "error_code": error_code,
                        "error_message": error_message
                    })
                    
                    # Send runtime error update
                    if client_id:
                        try:
                            await ws_manager.send_json({
                                "type": "generation_status",
                                "data": {
                                    "report_id": report_id,
                                    "element_id": element.id,
                                    "status": "error",
                                    "error": error_message,
                                    "error_code": error_code
                                }
                            }, client_id)
                        except Exception as e:
                            logger.error(f"Failed to send WebSocket error update: {e}")
                
                except Exception as e:
                    # Catch all other exceptions
                    error_message = f"Error generating content: {str(e)}"
                    logger.error(error_message, exc_info=True)
                    element_markdown += f"*[Error: {error_message}]*\n"
                    generation_errors.append({
                        "element_id": element.id,
                        "element_title": element.title or "Untitled Element",
                        "error_code": ErrorCodes.GENERATION_FAILED,
                        "error_message": error_message
                    })
                    
                    # Send error update
                    if client_id:
                        try:
                            await ws_manager.send_json({
                                "type": "generation_status",
                                "data": {
                                    "report_id": report_id,
                                    "element_id": element.id,
                                    "status": "error",
                                    "error": error_message
                                }
                            }, client_id)
                        except Exception as e:
                            logger.error(f"Failed to send WebSocket error update: {e}")

            # Add spacing and append this element's markdown to the full report
            element_markdown += "\n"
            markdown_parts.append(element_markdown)

        full_markdown = "".join(markdown_parts)  # Join without double newlines if parts already end with one
        
        # Final save of the updated report (although each section was saved incrementally)
        save_report_to_file(report)
        logger.debug("Final save of the complete report")

        # If we had generation errors, log them but still return the partial report
        if generation_errors:
            error_summary = ", ".join([f"{e['element_title']}" for e in generation_errors])
            logger.warning(f"Report generation completed with {len(generation_errors)} errors in elements: {error_summary}")
            
            # Return a successful response but include error information
            response = GeneratedReportMarkdown(
                report_id=report_id, 
                markdown_content=full_markdown,
                generation_errors=generation_errors,
                has_errors=True
            )
            
            return response
        else:
            logger.info(f"Successfully generated report for ID: {report_id}")
            return GeneratedReportMarkdown(report_id=report_id, markdown_content=full_markdown)
    
    except Exception as e:
        logger.error(f"Unexpected error generating report {report_id}: {str(e)}", exc_info=True)
        
        # Determine the most appropriate error code based on the exception
        error_code = ErrorCodes.UNKNOWN_ERROR
        error_message = f"An unexpected error occurred while generating the report: {str(e)}"
        additional_info = {"report_id": report_id}
        
        if "MAGE service" in str(e):
            error_code = ErrorCodes.MAGE_SERVICE_ERROR
            error_message = f"Error with MAGE service: {str(e)}"
        elif "Vector store" in str(e) or "vectorstore" in str(e).lower():
            error_code = ErrorCodes.VECTOR_STORE_ERROR
            error_message = f"Error with vector store: {str(e)}"
            if report.vectorStoreId:
                additional_info["vector_store_id"] = report.vectorStoreId
        elif "not found" in str(e).lower():
            error_code = ErrorCodes.REPORT_NOT_FOUND
            error_message = f"Report not found: {str(e)}"
        elif isinstance(e, TimeoutError) or "timeout" in str(e).lower():
            error_code = ErrorCodes.GENERATION_TIMEOUT
            error_message = f"Generation timed out: {str(e)}"
        elif isinstance(e, ConnectionError) or "connection" in str(e).lower():
            error_code = ErrorCodes.GENERATION_CONNECTION_ERROR
            error_message = f"Connection error: {str(e)}"
        
        error_response = create_error_response(error_code, error_message, additional_info)
        return JSONResponse(
            status_code=get_status_code_for_error(error_code),
            content=error_response
        )

@router.get("/reports/{report_id}/export/word")
async def export_report_to_word(report_id: str, options: WordExportOptions = None):
    """
    Export a report to Microsoft Word (.docx) format
    
    Args:
        report_id: The ID of the report to export
        options: Optional export options
        
    Returns:
        FileResponse: The generated Word document as a downloadable file
        
    Raises:
        HTTPException: If report not found or export fails
    """
    from fastapi.responses import FileResponse
    
    # Use default options if none provided
    if options is None:
        options = WordExportOptions()
    
    try:
        # Step 1: Load the report definition
        report_path = REPORTS_DIR / f"{report_id}.json"
        report = load_report_from_file(report_path)
        
        if not report:
            logger.warning(f"Report with ID {report_id} not found")
            return create_error_response(
                ErrorCodes.REPORT_NOT_FOUND,
                f"Report with ID {report_id} not found"
            )
        
        markdown_content = None
        
        # Step 2: Generate the report if needed or forced
        if options.force_regenerate:
            logger.info(f"Forced regeneration of report {report_id} for Word export")
            # Call the existing generate_report function to get fresh content
            generation_result = await generate_report(report_id)
            
            # Check if we got an error response
            if hasattr(generation_result, 'error') and generation_result.error:
                return generation_result  # Return the error response
            
            markdown_content = generation_result.markdown_content
        else:
            # Try to find the existing generated report content
            # First check if we already have a cached/stored version of the generated report
            report_content_path = REPORTS_DIR / f"{report_id}_generated.md"
            
            if report_content_path.exists():
                logger.info(f"Using existing generated content for report {report_id}")
                with open(report_content_path, "r", encoding="utf-8") as f:
                    markdown_content = f.read()
            else:
                # Generate clean markdown from the report
                markdown_content = await generate_export_markdown(report)
                
                # If we have no content, return an error
                if not markdown_content:
                    logger.warning(f"No generated content found for report {report_id}. Generation needed before export.")
                    return create_error_response(
                        ErrorCodes.GENERATION_FAILED,
                        "Report content has not been generated yet. Please use the 'Generate Report' button to generate content before exporting to Word."
                    )
        
        # Step 3: Convert the markdown to DOCX using pandoc
        try:
            # Import pypandoc here to handle import errors gracefully
            import pypandoc
        except ImportError:
            logger.error("pypandoc is not installed. Please install it to use Word export functionality.")
            return create_error_response(
                ErrorCodes.UNKNOWN_ERROR,
                "Word export is currently unavailable. The server is missing required dependencies."
            )
            
        try:
            # Create a persistent temporary directory that won't be auto-deleted
            # NOTE: We don't use a context manager here to prevent premature deletion
            temp_dir = tempfile.mkdtemp()
            
            # Create temp file paths
            temp_md_path = Path(temp_dir) / f"{report_id}.md"
            temp_docx_path = Path(temp_dir) / f"{report_id}.docx"
            
            # Write markdown to temp file
            with open(temp_md_path, "w", encoding="utf-8") as f:
                f.write(markdown_content)
            
            # Use pypandoc to convert from markdown to docx
            # Setup additional options for pandoc
            pandoc_args = []
            
            # Add a title page if requested
            if options.include_title_page:
                # Extract report details for title page
                pandoc_args.extend([
                    "--metadata", f"title={report.name}",
                ])
                
                if report.description:
                    pandoc_args.extend([
                        "--metadata", f"subtitle={report.description}",
                    ])
                
                # Add current date to title page
                today = datetime.now().strftime("%B %d, %Y")
                pandoc_args.extend([
                    "--metadata", f"date={today}",
                ])
            
            # Convert the markdown to docx
            logger.info(f"Converting report {report_id} to DOCX using pypandoc")
            pypandoc.convert_file(
                str(temp_md_path),
                "docx",
                outputfile=str(temp_docx_path),
                extra_args=pandoc_args
            )
            
            # Check if the conversion was successful
            if not temp_docx_path.exists():
                raise Exception("Word document generation failed")
            
            # Step 4: Return the file as a downloadable response
            safe_filename = f"{report.name.replace(' ', '_')}.docx"
            
            logger.info(f"Successfully exported report {report_id} to Word document")
            
            # Create the response
            response = FileResponse(
                path=str(temp_docx_path),
                filename=safe_filename,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            
            # Schedule cleanup function to run in background after response is sent
            # Wait a few seconds before cleaning up to ensure the file is fully served
            async def delayed_cleanup():
                await asyncio.sleep(10)  # Wait 10 seconds before cleanup
                try:
                    import shutil
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    logger.info(f"Cleaned up temporary directory: {temp_dir}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary directory: {temp_dir}, error: {str(e)}")
                    
            # Replace the original cleanup task with our delayed version
            asyncio.create_task(delayed_cleanup())
            
            return response
                
        except subprocess.CalledProcessError as e:
            logger.error(f"Pandoc conversion error: {str(e)}", exc_info=True)
            return create_error_response(
                ErrorCodes.UNKNOWN_ERROR,
                f"Word document conversion failed: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Error in Word export conversion: {str(e)}", exc_info=True)
            return create_error_response(
                ErrorCodes.UNKNOWN_ERROR,
                f"Word document generation failed: {str(e)}"
            )
            
    except Exception as e:
        logger.error(f"Unexpected error exporting report {report_id} to Word: {str(e)}", exc_info=True)
        return create_error_response(
            ErrorCodes.UNKNOWN_ERROR,
            f"An unexpected error occurred during Word export: {str(e)}"
        )

@router.post("/reports/{report_id}/sections/{element_id}/regenerate", response_model=Union[Dict[str, Any], ErrorResponse])
async def regenerate_section(report_id: str, element_id: str, report_in: Report, client_id: Optional[str] = Query(None)):
    """
    Regenerate a specific section of a report based on the provided current state of the report.
    
    This endpoint regenerates just one section of a report.
    It uses the entire provided report object as context, which may include unsaved edits from the client,
    maintaining context from both preceding and following sections to ensure consistency
    and coherence throughout the entire report.
    
    Args:
        report_id: The ID of the report containing the section (must match report_in.id).
        element_id: The ID of the specific element/section to regenerate.
        report_in: The full Report object, including any client-side edits, to be used as context.
        client_id: Optional client ID for WebSocket updates.
        
    Returns:
        A dictionary with the element_id, new content, and status, or an ErrorResponse.
    """
    logger.info(f"Received request to regenerate section {element_id} in report {report_id} using provided report data.")

    # Validate that the report_id in the path matches the one in the body
    if report_id != report_in.id:
        logger.error(f"Report ID in path ({report_id}) does not match Report ID in body ({report_in.id}).")
        error_code = ErrorCodes.VALIDATION_ERROR
        error_response = create_error_response(error_code, "Report ID in path does not match Report ID in body.")
        return JSONResponse(
            status_code=get_status_code_for_error(error_code),
            content=error_response
        )

    # Ensure the original report file exists on the server as a sanity check,
    # even though we're primarily working off report_in.
    original_report_path = REPORTS_DIR / f"{report_id}.json"
    if not original_report_path.exists():
        logger.error(f"Original report file not found for ID: {report_id} during regeneration attempt based on client data.")
        error_code = ErrorCodes.REPORT_NOT_FOUND
        error_response = create_error_response(error_code, f"Report with ID {report_id} not found on server.")
        return JSONResponse(
            status_code=get_status_code_for_error(error_code),
            content=error_response
        )
    
    # Use the provided report_in as the source of truth for elements and context
    # No longer loading from file here: report = load_report_from_file(REPORTS_DIR / f"{report_id}.json")
    
    # Find the specific element to regenerate within report_in
    target_element = None
    element_index = -1
    if report_in.content and report_in.content.elements:
        for i, element in enumerate(report_in.content.elements):
            if element.id == element_id:
                target_element = element
                element_index = i
                break
    
    if not target_element:
        logger.error(f"Element {element_id} not found in the provided report data for report {report_id}")
        error_code = ErrorCodes.GENERATION_FAILED # Or a more specific "ELEMENT_NOT_FOUND_IN_PAYLOAD"
        error_response = create_error_response(
            error_code, 
            f"Section with ID {element_id} not found in the provided report data.",
            {"report_id": report_id, "element_id": element_id}
        )
        return JSONResponse(
            status_code=get_status_code_for_error(error_code),
            content=error_response
        )
    
    # Verify this is a generative element
    if target_element.type != 'generative':
        logger.error(f"Element {element_id} is not a generative section in the provided report data.")
        error_code = ErrorCodes.GENERATION_VALIDATION_ERROR
        error_response = create_error_response(
            error_code, 
            "Only generative sections can be regenerated.",
            {"element_id": element_id, "element_type": target_element.type}
        )
        return JSONResponse(
            status_code=get_status_code_for_error(error_code),
            content=error_response
        )
    
    # Instructions come from the target_element in report_in
    if not target_element.instructions: # Check if instructions are present
        logger.warning(f"No instructions found for element {element_id} in provided report data for regeneration.")
        error_code = ErrorCodes.GENERATION_VALIDATION_ERROR
        error_response = create_error_response(
            error_code,
            "No instructions provided in the target section for regeneration.",
            {"element_id": element_id}
        )
        return JSONResponse(
            status_code=get_status_code_for_error(error_code),
            content=error_response
        )
    
    # Check if report_in has a vector store and it exists (using report_in.vectorStoreId)
    if report_in.vectorStoreId:
        try:
            # Verify that the vector store exists
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{EMBEDDING_SERVICE_BASE_URL}/api/embedding/vectorstores/{report_in.vectorStoreId}")
                if response.status_code == 404:
                    logger.warning(f"Provided report data for {report_id} references non-existent vector store ID: {report_in.vectorStoreId}")
                    error_code = ErrorCodes.VECTOR_STORE_ERROR
                    error_response = create_error_response(
                        error_code,
                        f"Vector store with ID {report_in.vectorStoreId} not found.",
                        {"vector_store_id": report_in.vectorStoreId, "report_id": report_id}
                    )
                    return JSONResponse(
                        status_code=get_status_code_for_error(error_code),
                        content=error_response
                    )
                response.raise_for_status()
        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            logger.error(f"Error verifying vector store {report_in.vectorStoreId} from provided report data: {str(e)}")
            error_code = ErrorCodes.VECTOR_STORE_ERROR
            error_response = create_error_response(
                error_code,
                f"Error accessing vector store: {str(e)}",
                {"vector_store_id": report_in.vectorStoreId, "report_id": report_id}
            )
            return JSONResponse(
                status_code=get_status_code_for_error(error_code),
                content=error_response
            )
    
    # Send WebSocket update that generation is starting
    if client_id:
        try:
            await ws_manager.send_json({
                "type": "generation_status",
                "data": {
                    "report_id": report_id,
                    "element_id": element_id,
                    "status": "generating",
                    "message": f"Regenerating section: {target_element.title or 'Untitled'} with full report context from client"
                }
            }, client_id)
        except Exception as e:
            logger.error(f"Failed to send WebSocket status update: {e}")
    
    try:
        # Build context from all preceding sections and following sections using report_in
        preceding_contents = []
        
        # First add content from all preceding sections
        if report_in.content and report_in.content.elements: # Check if elements exist
            for i in range(element_index):
                element = report_in.content.elements[i]
                if element.type == 'explicit' and element.content:
                    section_content = f"## {element.title or 'Untitled Section'}\n{element.content}"
                    preceding_contents.append(section_content)
                elif element.type == 'generative' and element.ai_generated_content:
                    section_content = f"## {element.title or 'Untitled Section'}\n{element.ai_generated_content}"
                    preceding_contents.append(section_content)
        
        # Add content from following sections too, but mark them clearly
        following_contents = []
        if report_in.content and report_in.content.elements: # Check if elements exist
            for i in range(element_index + 1, len(report_in.content.elements)):
                element = report_in.content.elements[i]
                if element.type == 'explicit' and element.content:
                    section_content = f"## {element.title or 'Untitled Section'}\n{element.content}"
                    following_contents.append(section_content)
                elif element.type == 'generative' and element.ai_generated_content:
                    section_content = f"## {element.title or 'Untitled Section'}\n{element.ai_generated_content}"
                    following_contents.append(section_content)
        
        # Balance token allocation based on available context
        preceding_token_limit = REGENERATION_TOKEN_LIMIT // 2
        following_token_limit = REGENERATION_TOKEN_LIMIT // 2
        
        if not preceding_contents and following_contents:
            following_token_limit = int(REGENERATION_TOKEN_LIMIT * 0.8)
        elif preceding_contents and not following_contents:
            preceding_token_limit = int(REGENERATION_TOKEN_LIMIT * 0.8)
        
        preceding_context = get_context_within_limit(preceding_contents, preceding_token_limit)
        following_context = get_context_within_limit(following_contents, following_token_limit)
        
        combined_context = ""
        if preceding_context:
            combined_context += "PRECEDING SECTIONS (maintain consistency with these):\n" + preceding_context + "\n\n"
        if following_context:
            combined_context += "FOLLOWING SECTIONS (ensure your generated content leads coherently into these):\n" + following_context
        
        if report_in.description: # Use report_in for metadata
            report_meta = f"REPORT OVERVIEW: {report_in.name} - {report_in.description}\n\n"
            combined_context = report_meta + combined_context
        
        logger.info(f"Regenerating content for element {target_element.id} with comprehensive report context from client data.")
        
        generated_content = await generate_element_content(
            element=target_element, # Pass the element from report_in
            vector_store_id=report_in.vectorStoreId, # Use vector_store_id from report_in
            previous_content=combined_context
        )
        
        if not generated_content:
            logger.error(f"Generated content is empty for element {target_element.id} during client-data based regeneration")
            if client_id:
                await ws_manager.send_json({
                    "type": "generation_status",
                    "data": {
                        "report_id": report_id,
                        "element_id": element_id,
                        "status": "error",
                        "error": "Generated content was empty"
                    }
                }, client_id)
            error_code = ErrorCodes.GENERATION_FAILED
            error_response = create_error_response(
                error_code,
                "Generated content was empty",
                {"report_id": report_id, "element_id": element_id}
            )
            return JSONResponse(
                status_code=get_status_code_for_error(error_code),
                content=error_response
            )
        
        # Update the element with new content IN THE report_in OBJECT
        target_element.ai_generated_content = generated_content
        
        # Update timestamp of the report_in object
        report_in.updatedAt = datetime.utcnow().isoformat() + "Z"
        
        # Save the updated report_in (which contains the client's edits + new generated content)
        save_report_to_file(report_in) # Make sure this function handles Report object correctly
        
        if client_id:
            await ws_manager.send_json({
                "type": "generation_status",
                "data": {
                    "report_id": report_id,
                    "element_id": element_id,
                    "status": "completed",
                    "content": generated_content # Send new content back
                }
            }, client_id)
            
        logger.info(f"Successfully regenerated content for element {target_element.id} based on client data and saved report {report_in.id}")
        
        return {
            "element_id": element_id,
            "content": generated_content,
            "status": "success"
        }
    
    except TimeoutError as e:
        # Handle timeout errors specifically
        error_code = ErrorCodes.GENERATION_TIMEOUT
        error_message = f"Generation timed out: {str(e)}"
        logger.error(f"Timeout error for element {element_id}: {str(e)}")
        
        if client_id:
            try:
                await ws_manager.send_json({
                    "type": "generation_status",
                    "data": {
                        "report_id": report_id,
                        "element_id": element_id,
                        "status": "error",
                        "error": error_message,
                        "error_code": error_code
                    }
                }, client_id)
            except Exception as ws_err:
                logger.error(f"Failed to send error via WebSocket: {ws_err}")
                
        return create_error_response(error_code, error_message)
        
    except ConnectionError as e:
        # Handle connection errors specifically
        error_code = ErrorCodes.GENERATION_CONNECTION_ERROR
        error_message = f"Connection error: {str(e)}"
        logger.error(f"Connection error for element {element_id}: {str(e)}")
        
        if client_id:
            try:
                await ws_manager.send_json({
                    "type": "generation_status",
                    "data": {
                        "report_id": report_id,
                        "element_id": element_id,
                        "status": "error",
                        "error": error_message,
                        "error_code": error_code
                    }
                }, client_id)
            except Exception as ws_err:
                logger.error(f"Failed to send error via WebSocket: {ws_err}")
                
        return create_error_response(error_code, error_message)
    
    except ValueError as e:
        # Handle validation errors
        error_code = ErrorCodes.GENERATION_VALIDATION_ERROR
        error_message = f"Invalid data or response: {str(e)}"
        logger.error(f"Validation error for element {element_id}: {str(e)}")
        
        if client_id:
            try:
                await ws_manager.send_json({
                    "type": "generation_status",
                    "data": {
                        "report_id": report_id,
                        "element_id": element_id,
                        "status": "error",
                        "error": error_message,
                        "error_code": error_code
                    }
                }, client_id)
            except Exception as ws_err:
                logger.error(f"Failed to send error via WebSocket: {ws_err}")
                
        return create_error_response(error_code, error_message)
    
    except PermissionError as e:
        # Handle authentication errors
        error_code = ErrorCodes.GENERATION_AUTH_ERROR
        error_message = f"Authentication error: {str(e)}"
        logger.error(f"Auth error for element {element_id}: {str(e)}")
        
        if client_id:
            try:
                await ws_manager.send_json({
                    "type": "generation_status",
                    "data": {
                        "report_id": report_id,
                        "element_id": element_id,
                        "status": "error",
                        "error": error_message,
                        "error_code": error_code
                    }
                }, client_id)
            except Exception as ws_err:
                logger.error(f"Failed to send error via WebSocket: {ws_err}")
                
        return create_error_response(error_code, error_message)
    
    except RuntimeError as e:
        # Handle runtime errors
        error_code = ErrorCodes.GENERATION_RUNTIME_ERROR
        error_message = f"Runtime error: {str(e)}"
        logger.error(f"Runtime error for element {element_id}: {str(e)}")
        
        if client_id:
            try:
                await ws_manager.send_json({
                    "type": "generation_status",
                    "data": {
                        "report_id": report_id,
                        "element_id": element_id,
                        "status": "error",
                        "error": error_message,
                        "error_code": error_code
                    }
                }, client_id)
            except Exception as ws_err:
                logger.error(f"Failed to send error via WebSocket: {ws_err}")
                
        return create_error_response(error_code, error_message)
        
    except Exception as e:
        # General catch-all handler
        logger.error(f"Error regenerating content for element {element_id}: {str(e)}", exc_info=True)
        
        # Send error via WebSocket
        if client_id:
            try:
                await ws_manager.send_json({
                    "type": "generation_status",
                    "data": {
                        "report_id": report_id,
                        "element_id": element_id,
                        "status": "error",
                        "error": str(e)
                    }
                }, client_id)
            except Exception as ws_err:
                logger.error(f"Failed to send error via WebSocket: {ws_err}")
                
        return create_error_response(
            ErrorCodes.GENERATION_FAILED,
            f"Error regenerating section: {str(e)}"
        ) 