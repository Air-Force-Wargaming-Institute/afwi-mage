"""
LLM transformer module for spreadsheet column transformations.

This module handles:
- Row-by-row processing of spreadsheet data
- Prompt construction for LLM
- Response parsing and validation
"""

import json
import logging
import asyncio
from typing import List, Dict, Any, Optional, Union, Tuple
import pandas as pd

from .client import get_llm_client

logger = logging.getLogger("workbench_service")

class RowTransformer:
    """
    Transforms spreadsheet rows using LLM processing.
    
    This class handles:
    - Creating prompts for each row
    - Processing rows with LLM
    - Handling errors
    """
    
    def __init__(
        self,
        instructions: str,
        input_columns: List[str],
        output_columns: List[Dict[str, str]],
        include_headers: bool = True,
        error_handling: str = "continue"
    ):
        """
        Initialize the row transformer.
        
        Args:
            instructions: Transformation instructions for the LLM
            input_columns: List of input column names
            output_columns: List of output column definitions
            include_headers: Whether to include column headers in prompts
            error_handling: Error handling strategy ("continue", "stop", or "retry")
        """
        self.instructions = instructions
        self.input_columns = input_columns
        self.output_columns = output_columns
        self.include_headers = include_headers
        self.error_handling = error_handling
        self.llm_client = get_llm_client()
        
        # Output column names for reference
        self.output_column_names = [col['name'] for col in output_columns]
    
    async def transform_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform a single row using the LLM.
        
        Args:
            row: Row data as a dictionary
            
        Returns:
            Transformed values as a dictionary
            
        Raises:
            Exception: If transformation fails and error_handling is "stop"
        """
        try:
            # Create prompt
            user_prompt = self._create_prompt(row)
            system_prompt = self._create_system_prompt()
            
            # Log input row for debugging
            row_summary = {k: str(v)[:30] + ('...' if len(str(v)) > 30 else '') for k, v in row.items()}
            logger.info(f"Transforming row: {row_summary}")
            
            # Call LLM
            logger.info(f"Sending request to LLM with prompt length: {len(user_prompt)}")
            response = await self.llm_client.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.3,  # Lower temperature for more consistent results
                max_tokens=1024
            )
            
            # Parse response
            parsed_result = self._parse_response(response)
            logger.info(f"Received transformed values: {parsed_result}")
            
            return parsed_result
            
        except Exception as e:
            logger.error(f"Error transforming row: {str(e)}")
            
            if self.error_handling == "stop":
                raise
            
            if self.error_handling == "retry":
                # Retry once
                try:
                    logger.info("Retrying row transformation...")
                    
                    # Call LLM again
                    response = await self.llm_client.generate(
                        system_prompt=self._create_system_prompt(),
                        user_prompt=user_prompt,
                        temperature=0.1,  # Lower temperature for retry
                        max_tokens=1024
                    )
                    
                    # Parse response
                    parsed_result = self._parse_response(response)
                    logger.info(f"Retry succeeded, transformed values: {parsed_result}")
                    
                    return parsed_result
                    
                except Exception as retry_error:
                    logger.error(f"Error during retry: {str(retry_error)}")
                    
                    if self.error_handling == "stop":
                        raise
            
            # Return empty values for all output columns
            empty_result = {col: "" for col in self.output_column_names}
            logger.warning(f"Returning empty values due to error: {empty_result}")
            return empty_result
    
    def _create_system_prompt(self) -> str:
        """
        Create the system prompt for the LLM.
        
        Returns:
            System prompt text
        """
        return (
            "You are a data transformation assistant. You will be given row data from a spreadsheet "
            "along with specific instructions for transformation. Your task is to process each row "
            "according to the instructions and output the values for the specified output columns. "
            "Return only the JSON object without any additional text. Be precise and follow the "
            "instructions exactly."
        )
    
    def _create_prompt(self, row: Dict[str, Any]) -> str:
        """
        Create the prompt for transforming a single row.
        
        Args:
            row: Row data as a dictionary
            
        Returns:
            Prompt text for the LLM
        """
        # Build the input data section
        input_data = {}
        for col in self.input_columns:
            input_data[col] = row.get(col, "")
        
        # Create the prompt text
        prompt = (
            "# Task\n"
            f"{self.instructions}\n\n"
            "# Input Data\n"
            f"{json.dumps(input_data, indent=2)}\n\n"
            "# Output Columns\n"
        )
        
        # Add output column descriptions
        for col in self.output_columns:
            col_desc = f"- {col['name']}"
            if col.get('description'):
                col_desc += f": {col['description']}"
            prompt += col_desc + "\n"
            
        # Add response format instructions
        prompt += (
            "\n# Response Format\n"
            "Return a JSON object with output column names as keys and transformed values as values.\n"
            "Example: " + json.dumps({col['name']: "value" for col in self.output_columns}) + "\n\n"
            "# Your Response (JSON only):\n"
        )
        
        return prompt
        
    def _parse_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse the LLM response into output values.
        
        Args:
            response: LLM response dictionary
            
        Returns:
            Dictionary of output column names and values
            
        Raises:
            Exception: If parsing fails
        """
        try:
            # Extract the content from the response
            content = response.get('message', {}).get('content', '')
            if not content:
                raise Exception("Empty response from LLM")
                
            # Try to extract JSON from the content (in case there's other text)
            json_start = content.find('{')
            json_end = content.rfind('}')
            
            if json_start == -1 or json_end == -1:
                # No JSON found, try to parse free text into expected format
                result = {}
                for col in self.output_column_names:
                    # Look for patterns like "column_name: value" or "column_name = value"
                    value = ""
                    for line in content.split('\n'):
                        if line.startswith(col) and (':' in line or '=' in line):
                            value = line.split(':', 1)[1].strip() if ':' in line else line.split('=', 1)[1].strip()
                            # Remove quotes if present
                            if value.startswith('"') and value.endswith('"'):
                                value = value[1:-1]
                            break
                    result[col] = value
                return result
            
            # Extract the JSON part
            json_str = content[json_start:json_end+1]
            parsed = json.loads(json_str)
            
            # Ensure all output columns are present
            result = {}
            for col in self.output_column_names:
                result[col] = parsed.get(col, "")
            
            return result
            
        except json.JSONDecodeError:
            logger.error(f"Failed to parse LLM response as JSON: {content}")
            # Fall back to a basic extraction
            result = {}
            for col in self.output_column_names:
                result[col] = ""
            return result
            
        except Exception as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
            raise Exception(f"Failed to parse LLM response: {str(e)}")

class BatchProcessor:
    """
    Processes spreadsheets in batches using row-by-row LLM transformations.
    """
    
    def __init__(
        self,
        transformer: RowTransformer,
        max_concurrent: int = 5
    ):
        """
        Initialize the batch processor.
        
        Args:
            transformer: RowTransformer instance
            max_concurrent: Maximum number of concurrent LLM requests
        """
        self.transformer = transformer
        self.max_concurrent = max_concurrent
    
    async def process_dataframe(
        self,
        df: pd.DataFrame,
        on_progress: Optional[callable] = None
    ) -> pd.DataFrame:
        """
        Process a pandas DataFrame using the row transformer.
        
        Args:
            df: DataFrame to process
            on_progress: Optional callback function for progress updates
            
        Returns:
            DataFrame with original columns and new output columns
        """
        # Create a copy of the dataframe
        result_df = df.copy()
        
        # Add output columns
        for col in self.transformer.output_column_names:
            result_df[col] = ""
        
        # Get total number of rows
        total_rows = len(df)
        processed_rows = 0
        
        # Process rows in chunks to avoid memory issues
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        async def process_row(idx: int, row: Dict[str, Any]):
            async with semaphore:
                # Transform the row
                transformed = await self.transformer.transform_row(row)
                
                # Update the result dataframe
                nonlocal processed_rows
                for col, value in transformed.items():
                    result_df.at[idx, col] = value
                
                # Update progress
                processed_rows += 1
                if on_progress:
                    progress_percent = (processed_rows / total_rows) * 100
                    on_progress(progress_percent)
        
        # Create tasks for each row
        tasks = []
        for idx, row in df.iterrows():
            row_dict = row.to_dict()
            task = asyncio.create_task(process_row(idx, row_dict))
            tasks.append(task)
        
        # Wait for all tasks to complete
        await asyncio.gather(*tasks)
        
        return result_df 