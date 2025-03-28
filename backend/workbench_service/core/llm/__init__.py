"""
LLM integration module for the Workbench service.

This module provides LLM integration for:
- Spreadsheet transformations
- Visualization generation
- Data analysis
"""

from .client import LLMClient, get_llm_client
from .transformer import RowTransformer, BatchProcessor

__all__ = [
    'LLMClient', 
    'get_llm_client', 
    'RowTransformer', 
    'BatchProcessor'
] 