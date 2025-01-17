import os
import subprocess
import logging
from pathlib import Path
from typing import Optional, Tuple
import uuid
import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.connection import NoConnectException

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class DocxConverter:
    def __init__(self, temp_dir: str = "/app/data/temp_conversions"):
        self.temp_dir = temp_dir
        os.makedirs(temp_dir, exist_ok=True)
        # Ensure temp directory has right permissions
        os.chmod(temp_dir, 0o777)
        self.local_context = None
        self.desktop = None
        
    def _connect_to_libreoffice(self):
        """
        Connect to LibreOffice running in headless mode.
        """
        try:
            logger.debug("Attempting to connect to LibreOffice...")
            if not self.local_context:
                local_context = uno.getComponentContext()
                logger.debug("Got local context")
                
                resolver = local_context.ServiceManager.createInstanceWithContext(
                    "com.sun.star.bridge.UnoUrlResolver", local_context
                )
                logger.debug("Created resolver")
                
                context = resolver.resolve(
                    "uno:socket,host=127.0.0.1,port=8100;urp;StarOffice.ComponentContext"
                )
                logger.debug("Resolved connection")
                
                self.desktop = context.ServiceManager.createInstanceWithContext(
                    "com.sun.star.frame.Desktop", context
                )
                logger.debug("Created desktop instance")
                
                self.local_context = local_context
                logger.info("Successfully connected to LibreOffice")
        except NoConnectException as e:
            logger.error("Failed to connect to LibreOffice: %s", str(e))
            raise
        except Exception as e:
            logger.error("Unexpected error connecting to LibreOffice: %s", str(e))
            raise
        
    def convert_to_pdf(self, docx_path: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Convert a DOCX file to PDF using LibreOffice.
        
        Args:
            docx_path: Path to the DOCX file
            
        Returns:
            Tuple[Optional[str], Optional[str]]: (PDF path, error message if any)
        """
        try:
            logger.debug("Starting conversion of %s", docx_path)
            
            # Ensure input file exists
            if not os.path.exists(docx_path):
                logger.error("Input file not found: %s", docx_path)
                return None, f"Input file not found: {docx_path}"
            
            # Create unique output filename
            pdf_filename = f"{uuid.uuid4()}.pdf"
            output_path = os.path.join(self.temp_dir, pdf_filename)
            logger.debug("Output path will be: %s", output_path)
            
            try:
                # Try UNO interface first
                logger.debug("Attempting conversion using UNO interface")
                self._connect_to_libreoffice()
                
                file_url = uno.systemPathToFileUrl(os.path.abspath(docx_path))
                logger.debug("File URL: %s", file_url)
                
                doc = self.desktop.loadComponentFromURL(file_url, "_blank", 0, ())
                logger.debug("Document loaded")
                
                if doc is None:
                    raise Exception("Failed to open document")
                
                # Set up PDF export properties
                export_props = (
                    PropertyValue("FilterName", 0, "writer_pdf_Export", 0),
                    PropertyValue("FilterData", 0, uno.Any("[]com.sun.star.beans.PropertyValue", ()), 0)
                )
                
                # Export to PDF
                output_url = uno.systemPathToFileUrl(os.path.abspath(output_path))
                logger.debug("Output URL: %s", output_url)
                
                doc.storeToURL(output_url, export_props)
                logger.debug("Document stored to PDF")
                
                doc.close(True)
                logger.debug("Document closed")
                
            except Exception as uno_error:
                logger.warning("UNO conversion failed, falling back to command line: %s", str(uno_error))
                # Fall back to command line conversion
                cmd = [
                    "soffice",
                    "--headless",
                    "--convert-to", "pdf",
                    "--outdir", self.temp_dir,
                    docx_path
                ]
                logger.debug("Running command: %s", " ".join(cmd))
                
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                stdout, stderr = process.communicate()
                logger.debug("Command output - stdout: %s, stderr: %s", stdout, stderr)
                
                if process.returncode != 0:
                    error_msg = f"Conversion failed: {stderr.decode()}"
                    logger.error(error_msg)
                    return None, error_msg
            
            # Verify the output file exists
            if not os.path.exists(output_path):
                logger.error("Conversion completed but output file not found at %s", output_path)
                return None, "Conversion completed but output file not found"
            
            logger.info("Successfully converted %s to PDF at %s", docx_path, output_path)
            return output_path, None
            
        except Exception as e:
            error_msg = f"Error during conversion: {str(e)}"
            logger.error(error_msg)
            return None, error_msg
    
    def cleanup_temp_file(self, file_path: str) -> None:
        """
        Clean up a temporary file.
        
        Args:
            file_path: Path to the file to be removed
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up temporary file: {file_path}")
        except Exception as e:
            logger.error(f"Error cleaning up temporary file {file_path}: {str(e)}") 