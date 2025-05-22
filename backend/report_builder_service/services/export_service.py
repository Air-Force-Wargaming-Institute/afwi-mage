import logging
from pathlib import Path
import tempfile
from typing import Union, Tuple, Any # Added for type hints

from weasyprint import HTML
import markdown2 # For Markdown to HTML conversion

from models.schemas import Report, ErrorCodes, ReportContent # Added ReportContent for type hint if needed elsewhere
from services.file_service import load_report_from_file
from services.generation_service import generate_export_markdown, generate_flattened_export_markdown # Added generate_flattened_export_markdown
from utils.errors import ServiceError 
from config import REPORTS_DIR, logger

# Helper function to load report (extracted for reusability)
async def _load_report_for_export(report_id: str) -> Report:
    logger.info(f"Loading report ID: {report_id} for export.")
    report_path = REPORTS_DIR / f"{report_id}.json"
    if not report_path.exists():
        logger.warning(f"Report file not found: {report_path}")
        raise ServiceError(ErrorCodes.REPORT_NOT_FOUND, f"Report with ID {report_id} not found.")
    
    report = load_report_from_file(report_path)
    if not report:
        logger.warning(f"Report with ID {report_id} could not be loaded from {report_path}")
        raise ServiceError(ErrorCodes.REPORT_NOT_FOUND, f"Report with ID {report_id} not found or is invalid.")
    logger.info(f"Successfully loaded report: {report.name}")
    return report

# Helper function to convert markdown to HTML with basic styling
def _convert_markdown_to_styled_html(markdown_content: str, report_name: str) -> str:
    html_content = markdown2.markdown(markdown_content, extras=["tables", "fenced-code-blocks", "strike"])
    html_full = f"""<!DOCTYPE html>
    <html>
    <head>
        <meta charset=\"UTF-8\">
        <title>{report_name}</title>
        <style>
            body {{ font-family: sans-serif; margin: 2cm; }}
            h1, h2, h3, h4, h5, h6 {{ page-break-after: avoid; }}
            table {{ border-collapse: collapse; width: 100%; margin-bottom: 1em; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            th {{ background-color: #f2f2f2; }}
            pre {{ background-color: #f5f5f5; padding: 10px; border-radius: 3px; overflow: auto; }}
            code {{ font-family: monospace; }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>"""
    return html_full

async def export_report_service(report_id: str, export_format: str) -> Tuple[Union[bytes, str], str, str]: # Returns content, filename, media_type
    """
    Service function to export a report to the specified format.

    Args:
        report_id: The ID of the report to export.
        export_format: The desired format ('pdf', 'html', 'markdown', 'json', 'txt').

    Returns:
        A tuple containing the exported content (bytes for PDF, str for others),
        the suggested filename, and the media type.
        
    Raises:
        ServiceError: If the report is not found or export fails.
        ValueError: If the export format is invalid.
    """
    logger.info(f"Starting export process for report ID: {report_id} to format: {export_format}")
    report = await _load_report_for_export(report_id)
    
    content: Union[bytes, str]
    filename: str
    media_type: str

    try:
        if export_format == "pdf":
            logger.info(f"Generating flattened markdown for PDF export of report: {report.name}")
            markdown_content = await generate_flattened_export_markdown(report)
            if not markdown_content.strip():
                logger.warning(f"Generated flattened markdown for PDF for report {report_id} is empty.")
            
            html_full = _convert_markdown_to_styled_html(markdown_content, report.name)
            logger.debug(f"HTML content for PDF conversion:\n{html_full[:500]}...")

            logger.info(f"Converting HTML to PDF for report {report_id} using WeasyPrint.")
            pdf_bytes = HTML(string=html_full, base_url=str(REPORTS_DIR)).write_pdf()
            
            if not pdf_bytes:
                logger.error(f"WeasyPrint generated empty PDF bytes for report {report_id}.")
                raise ServiceError(ErrorCodes.PDF_EXPORT_FAILED, f"PDF generation failed for report {report_id}: No PDF data produced.")

            content = pdf_bytes
            filename = f"{report.name.replace(' ', '_')}_{report_id}.pdf"
            media_type = "application/pdf"
            logger.info(f"Successfully generated PDF for report {report_id}. Size: {len(content)} bytes.")

        elif export_format == "html":
            logger.info(f"Generating flattened markdown for HTML export of report: {report.name}")
            markdown_content = await generate_flattened_export_markdown(report)
            html_full = _convert_markdown_to_styled_html(markdown_content, report.name)
            content = html_full
            filename = f"{report.name.replace(' ', '_')}_{report_id}.html"
            media_type = "text/html"
            logger.info(f"Successfully generated HTML for report {report_id}.")

        elif export_format == "markdown":
            logger.info(f"Generating structured markdown for Markdown export of report: {report.name}")
            content = await generate_export_markdown(report) # Uses sections
            filename = f"{report.name.replace(' ', '_')}_{report_id}.md"
            media_type = "text/markdown"
            logger.info(f"Successfully generated Markdown for report {report_id}.")

        elif export_format == "json":
            logger.info(f"Generating JSON export for report: {report.name}")
            # Pydantic's model_dump_json is synchronous, ensure it fits async flow if necessary
            # For now, assuming it's fine as is, or wrap with to_thread if it becomes blocking.
            content = report.model_dump_json(indent=4) 
            filename = f"{report.name.replace(' ', '_')}_{report_id}.json"
            media_type = "application/json"
            logger.info(f"Successfully generated JSON for report {report_id}.")

        elif export_format == "txt":
            logger.info(f"Generating flattened markdown for TXT export of report: {report.name}")
            content = await generate_flattened_export_markdown(report) # Flattened, no section titles
            filename = f"{report.name.replace(' ', '_')}_{report_id}.txt"
            media_type = "text/plain"
            logger.info(f"Successfully generated TXT for report {report_id}.")
            
        # Add Word export logic here when ready. It will likely use flattened markdown -> HTML -> python-docx

        else:
            logger.error(f"Invalid export format requested: {export_format}")
            raise ValueError(f"Invalid export format: {export_format}. Supported formats: pdf, html, markdown, json, txt.")

        return content, filename, media_type

    except ServiceError as se:
        logger.error(f"ServiceError during {export_format} export for report {report_id}: {se.message}")
        raise
    except ValueError as ve: # Handles invalid format
        logger.error(f"ValueError during {export_format} export for report {report_id}: {str(ve)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during {export_format} export for report {report_id}: {str(e)}", exc_info=True)
        raise ServiceError(ErrorCodes.REPORT_EXPORT_FAILED, f"An unexpected error occurred during {export_format} export: {str(e)}")

# Keep the old PDF specific service for now if it's directly used by an endpoint, 
# or plan to refactor endpoint to use the new generic service.
# For now, let's have it call the new service.
async def export_report_to_pdf_service(report_id: str) -> tuple[bytes, str]:
    """
    Service function to export a report to PDF.
    (This is now a wrapper around the generic export_report_service for backward compatibility or specific PDF endpoint)
    """
    content, filename, _ = await export_report_service(report_id, "pdf")
    # The old function returned (pdf_bytes, report_name). New one returns (pdf_bytes, filename, media_type)
    # We need to extract report_name from filename or load report again if strictly needed. For now, let's use filename.
    # Or, more simply, just return content and filename as the new standard for this specific wrapper.
    # For strict compatibility with (bytes, report_name), we might need to load report again or parse name.
    # Let's return (content, filename) for now. If `report.name` is critical, the calling API endpoint would need adjustment or this function gets report name differently.
    report = await _load_report_for_export(report_id) # reloading to get the original name for the tuple
    return content, report.name # type: ignore 