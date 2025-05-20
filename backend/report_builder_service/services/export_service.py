import logging
from pathlib import Path
import tempfile

from weasyprint import HTML
import markdown2 # For Markdown to HTML conversion

from models.schemas import Report, ErrorCodes
from services.file_service import load_report_from_file
from services.generation_service import generate_export_markdown # Reusing from generation_service
from utils.errors import ServiceError # Assuming a custom error class
from config import REPORTS_DIR, logger

async def export_report_to_pdf_service(report_id: str) -> tuple[bytes, str]:
    """
    Service function to load a report, generate its clean markdown, 
    convert to HTML, then to PDF, and return the PDF bytes and report name.

    Args:
        report_id: The ID of the report to export.

    Returns:
        A tuple containing the PDF bytes and the report name.
        
    Raises:
        ServiceError: If the report is not found or PDF conversion fails.
    """
    logger.info(f"Starting PDF export process for report ID: {report_id}")

    try:
        # 1. Load the report definition
        report_path = REPORTS_DIR / f"{report_id}.json"
        if not report_path.exists():
            logger.warning(f"Report file not found: {report_path}")
            raise ServiceError(ErrorCodes.REPORT_NOT_FOUND, f"Report with ID {report_id} not found.")
        
        report = load_report_from_file(report_path)
        if not report:
            # This case should ideally be caught by report_path.exists(), but as a safeguard:
            logger.warning(f"Report with ID {report_id} could not be loaded from {report_path}")
            raise ServiceError(ErrorCodes.REPORT_NOT_FOUND, f"Report with ID {report_id} not found or is invalid.")

        logger.info(f"Successfully loaded report: {report.name}")

        # 2. Generate clean export markdown content
        # This function already handles stripping <think_tags> and other cleaning.
        markdown_content = await generate_export_markdown(report)
        if not markdown_content.strip():
            logger.warning(f"Generated markdown content for report {report_id} is empty.")
            # Depending on desired behavior, could raise an error or return an empty PDF
            # For now, let's proceed and WeasyPrint will likely generate a blank PDF.

        # 3. Convert Markdown to HTML
        # WeasyPrint works best with HTML. Using markdown2 with common extras.
        html_content = markdown2.markdown(markdown_content, extras=["tables", "fenced-code-blocks", "strike"])
        
        # Basic HTML structure for better PDF rendering
        html_full = f"""<!DOCTYPE html>
        <html>
        <head>
            <meta charset=\"UTF-8\">
            <title>{report.name}</title>
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
        
        logger.debug(f"HTML content for PDF conversion:\n{html_full[:500]}...") # Log snippet of HTML

        # 4. Convert HTML to PDF using WeasyPrint
        logger.info(f"Converting HTML to PDF for report {report_id} using WeasyPrint.")
        pdf_bytes = HTML(string=html_full, base_url=str(REPORTS_DIR)).write_pdf()
        
        if not pdf_bytes:
            logger.error(f"WeasyPrint generated empty PDF bytes for report {report_id}.")
            raise ServiceError(ErrorCodes.PDF_EXPORT_FAILED, f"PDF generation failed for report {report_id}: No PDF data produced.")

        logger.info(f"Successfully generated PDF for report {report_id}. Size: {len(pdf_bytes)} bytes.")
        return pdf_bytes, report.name

    except ServiceError: # Re-raise known service errors
        raise
    except Exception as e:
        logger.error(f"Unexpected error during PDF export for report {report_id}: {str(e)}", exc_info=True)
        raise ServiceError(ErrorCodes.PDF_EXPORT_FAILED, f"An unexpected error occurred during PDF export: {str(e)}") 