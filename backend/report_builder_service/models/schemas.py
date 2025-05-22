from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal, Union
import uuid
from datetime import datetime

# Forward declaration for Pydantic
class Section(BaseModel):
    pass

# Report Element Models
class ReportElement(BaseModel):
    item_type: Literal['element'] = 'element'
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: Optional[str] = None
    type: Literal['explicit', 'generative']
    format: Optional[str] = None
    content: Optional[str] = None
    instructions: Optional[str] = None
    ai_generated_content: Optional[str] = None
    generation_status: Optional[Literal['pending', 'generating', 'completed', 'error']] = None
    generation_error: Optional[str] = None
    updatedAt: Optional[datetime] = None # Added for regenerate_section logic
    parent_uuid: Optional[str] = Field(default=None, alias='parentUUID') # ID of the parent Section, or None if top-level

class Section(BaseModel):
    item_type: Literal['section'] = 'section'
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: Optional[str] = "Unnamed Section"
    elements: List[ReportElement] = Field(default_factory=list)
    # Add other section-specific fields here if needed in the future, e.g.:
    # collapsed: bool = False 

# Update model references
Section.update_forward_refs()

class ReportContent(BaseModel):
    items: List[Union[Section, ReportElement]] = Field(default_factory=list)
    # The old 'elements' field is replaced by 'items'
    # Potentially add layout, styling info here

# Report Models
class ReportBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "Custom" # Custom, Template-based
    templateId: Optional[str] = None
    vectorStoreId: Optional[str] = None

class ReportCreate(ReportBase):
    content: ReportContent = Field(default_factory=ReportContent)

class Report(ReportBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: str # ISO format string
    updatedAt: str # ISO format string
    status: str = "draft"
    content: ReportContent
    generation_errors: Optional[List[Dict[str, Any]]] = None # Stores errors for specific elements
    has_errors: Optional[bool] = False # Overall status if any element failed

# Template Models
class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

class TemplateCreate(TemplateBase):
    content: ReportContent = Field(default_factory=ReportContent)

class Template(TemplateBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: str # ISO format string
    updatedAt: str # ISO format string
    content: ReportContent

# Response Models
class ReportBuilderVectorStoreInfo(BaseModel):
    id: str
    name: str

class GeneratedReportMarkdown(BaseModel):
    report_id: str
    markdown_content: str
    # These fields are now part of the Report model, so GeneratedReportMarkdown might be deprecated or simplified
    # has_errors: bool = False
    # generation_errors: Optional[List[Dict[str, Any]]] = None

# Error Models
class ErrorDetail(BaseModel):
    code: str
    message: str
    
class ErrorResponse(BaseModel):
    error: bool = True
    detail: ErrorDetail
    timestamp: str
    title: Optional[str] = None
    suggestion: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None

# Export Options
class WordExportOptions(BaseModel):
    force_regenerate: bool = False
    include_title_page: bool = True

# Constants for error codes
class ErrorCodes:
    REPORT_NOT_FOUND = "REPORT_NOT_FOUND"
    VECTOR_STORE_ERROR = "VECTOR_STORE_ERROR"
    MAGE_SERVICE_ERROR = "MAGE_SERVICE_ERROR"
    GENERATION_FAILED = "GENERATION_FAILED"
    INVALID_REPORT_STRUCTURE = "INVALID_REPORT_STRUCTURE"
    PDF_EXPORT_FAILED = "PDF_EXPORT_FAILED"
    REPORT_EXPORT_FAILED = "REPORT_EXPORT_FAILED"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
    # New error codes for specific generation errors
    GENERATION_TIMEOUT = "GENERATION_TIMEOUT"
    GENERATION_CONNECTION_ERROR = "GENERATION_CONNECTION_ERROR"
    GENERATION_VALIDATION_ERROR = "GENERATION_VALIDATION_ERROR"
    GENERATION_AUTH_ERROR = "GENERATION_AUTH_ERROR"
    GENERATION_RUNTIME_ERROR = "GENERATION_RUNTIME_ERROR" 