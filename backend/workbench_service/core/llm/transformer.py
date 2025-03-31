"""
LLM transformer module for spreadsheet column transformations.

This module handles:
- Row-by-row processing of spreadsheet data
- Prompt construction for LLM based on per-column instructions
- Response parsing and validation for different output types
- Batched processing for efficient transformation
"""

import json
import logging
import asyncio
from typing import List, Dict, Any, Optional, Union, Tuple
import pandas as pd
import re

from .client import get_llm_client

logger = logging.getLogger("workbench_service")

class RowTransformer:
    """
    Transforms spreadsheet rows using LLM processing.
    
    This class handles:
    - Creating prompts for each row with per-column instructions
    - Processing rows with LLM
    - Parsing and validating responses based on output types
    - Handling errors during processing
    """
    
    def __init__(
        self,
        input_columns: List[str],
        output_columns: List[Dict[str, Any]],
        include_headers: bool = True,
        error_handling: str = "continue"
    ):
        """
        Initialize the row transformer with per-column configuration.
        
        Args:
            input_columns: List of input column names
            output_columns: List of output column definitions with individual instructions
                Each definition should have:
                - name: Column name
                - description: Instructions for this specific column
                - output_type: 'text', 'boolean', 'list', or 'number'
                - type_options: Dict with type-specific options
            include_headers: Whether to include column headers in prompts
            error_handling: Error handling strategy ("continue", "stop", or "retry")
        """
        self.input_columns = input_columns
        self.output_columns = output_columns
        self.include_headers = include_headers
        self.error_handling = error_handling
        self.llm_client = get_llm_client()
        
        # Output column names for reference
        self.output_column_names = [col['name'] for col in output_columns]
        
        # Validate output column configurations
        self._validate_output_columns()
    
    def _validate_output_columns(self) -> None:
        """
        Validate output column configurations.
        
        Raises:
            ValueError: If any output column configuration is invalid
        """
        valid_types = ['text', 'boolean', 'list', 'number']
        
        for col in self.output_columns:
            # Check required fields
            if 'name' not in col:
                raise ValueError("Output column missing 'name' field")
            if 'description' not in col:
                raise ValueError(f"Output column '{col['name']}' missing 'description' field")
            
            # Check output type
            output_type = col.get('output_type', 'text')
            if output_type not in valid_types:
                raise ValueError(f"Invalid output type '{output_type}' for column '{col['name']}'. "
                                f"Must be one of: {', '.join(valid_types)}")
            
            # Check type-specific options
            type_options = col.get('type_options', {})
            
            if output_type == 'boolean' and not all(k in type_options for k in ['trueValue', 'falseValue']):
                logger.warning(f"Boolean column '{col['name']}' missing 'trueValue' or 'falseValue'. "
                              f"Defaulting to 'Yes'/'No'.")
                # Set defaults
                type_options['trueValue'] = type_options.get('trueValue', 'Yes')
                type_options['falseValue'] = type_options.get('falseValue', 'No')
                col['type_options'] = type_options
            
            elif output_type == 'list' and 'options' not in type_options:
                raise ValueError(f"List column '{col['name']}' missing 'options' in type_options")
            
            elif output_type == 'number' and 'format' not in type_options:
                logger.warning(f"Number column '{col['name']}' missing 'format'. "
                              f"Defaulting to 'decimal'.")
                # Set default
                type_options['format'] = type_options.get('format', 'decimal')
                col['type_options'] = type_options
    
    async def transform_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform a single row using the LLM with per-column instructions.
        
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
            row_summary = {k: str(v)[:30] + ('...' if len(str(v)) > 30 else '') for k, v in row.items() if k in self.input_columns}
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
            
            # Validate and format each value based on its output type
            formatted_result = self._validate_and_format_values(parsed_result)
            
            return formatted_result
            
        except Exception as e:
            logger.error(f"Error transforming row: {str(e)}")
            
            if self.error_handling == "stop":
                raise
            
            if self.error_handling == "retry":
                # Retry once
                try:
                    logger.info("Retrying row transformation...")
                    
                    # Call LLM again with more explicit instruction
                    retry_system_prompt = (
                        f"{self._create_system_prompt()}\n"
                        f"IMPORTANT: The previous attempt failed with error: {str(e)}. "
                        f"Please be very precise about following the output formatting requirements."
                    )
                    
                    response = await self.llm_client.generate(
                        system_prompt=retry_system_prompt,
                        user_prompt=user_prompt,
                        temperature=0.1,  # Lower temperature for retry
                        max_tokens=1024
                    )
                    
                    # Parse response
                    parsed_result = self._parse_response(response)
                    
                    # Validate and format
                    formatted_result = self._validate_and_format_values(parsed_result)
                    
                    logger.info(f"Retry succeeded, transformed values: {formatted_result}")
                    
                    return formatted_result
                    
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
            "along with specific instructions for each output column. Your task is to process each row "
            "according to the instructions and output the values for the specified output columns. "
            "Each output column has a required output type that you must follow strictly. "
            "Return only the JSON object without any additional text. Be precise and follow the "
            "instructions exactly."
        )
    
    def _create_prompt(self, row: Dict[str, Any]) -> str:
        """
        Create the prompt for transforming a single row with per-column instructions.
        
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
            "Transform the row data according to the instructions provided for each output column.\n\n"
            "# Input Data\n"
            f"{json.dumps(input_data, indent=2)}\n\n"
            "# Output Columns\n"
        )
        
        # Add output column descriptions with type information
        for col in self.output_columns:
            col_name = col['name']
            col_desc = col.get('description', '')
            output_type = col.get('output_type', 'text')
            type_options = col.get('type_options', {})
            
            prompt += f"## {col_name}\n"
            prompt += f"- Instructions: {col_desc}\n"
            
            # Add type-specific guidance
            if output_type == 'boolean':
                true_val = type_options.get('trueValue', 'Yes')
                false_val = type_options.get('falseValue', 'No')
                prompt += f"- Type: Boolean (must be exactly '{true_val}' or '{false_val}')\n"
            
            elif output_type == 'list':
                options = type_options.get('options', '')
                option_list = options.split(',') if isinstance(options, str) else options
                prompt += f"- Type: List (must be exactly one of these options: {', '.join(option_list)})\n"
            
            elif output_type == 'number':
                format_type = type_options.get('format', 'decimal')
                prompt += f"- Type: Number (format: {format_type})\n"
                
                if format_type == 'percentage':
                    prompt += "  - Include % symbol (e.g., 45%)\n"
                elif format_type == 'currency':
                    prompt += "  - Include $ symbol (e.g., $123.45)\n"
                elif format_type == 'integer':
                    prompt += "  - Must be a whole number (e.g., 123)\n"
                else:  # decimal
                    prompt += "  - Use decimal point as needed (e.g., 123.45)\n"
            
            else:  # text
                prompt += "- Type: Free Text\n"
        
        # Add response format instructions
        prompt += (
            "\n# Response Format\n"
            "Return a JSON object with output column names as keys and transformed values as values.\n"
            "Each value MUST conform to the type requirements specified above.\n"
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
    
    def _validate_and_format_values(self, values: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and format values based on their output types.
        
        Args:
            values: Dictionary of column names and values
            
        Returns:
            Dictionary of validated and formatted values
        """
        result = {}
        
        for col in self.output_columns:
            col_name = col['name']
            output_type = col.get('output_type', 'text')
            type_options = col.get('type_options', {})
            raw_value = values.get(col_name, "")
            
            # Handle each output type
            if output_type == 'boolean':
                result[col_name] = self._validate_boolean(raw_value, type_options)
            elif output_type == 'list':
                result[col_name] = self._validate_list(raw_value, type_options)
            elif output_type == 'number':
                result[col_name] = self._validate_number(raw_value, type_options)
            else:  # text
                result[col_name] = str(raw_value)
        
        return result
    
    def _validate_boolean(self, value: Any, type_options: Dict[str, Any]) -> str:
        """
        Validate and format a boolean value.
        
        Args:
            value: Value to validate
            type_options: Boolean-specific options
            
        Returns:
            Formatted boolean value
        """
        true_val = type_options.get('trueValue', 'Yes')
        false_val = type_options.get('falseValue', 'No')
        
        # Normalize value for comparison
        str_value = str(value).lower().strip()
        
        # Check for exact match with specified values
        if str_value == str(true_val).lower():
            return true_val
        if str_value == str(false_val).lower():
            return false_val
            
        # Check for common boolean values
        if str_value in ['true', 'yes', '1', 't', 'y']:
            return true_val
        if str_value in ['false', 'no', '0', 'f', 'n']:
            return false_val
        
        # Default to false value if unrecognized
        logger.warning(f"Unrecognized boolean value '{value}', defaulting to '{false_val}'")
        return false_val
    
    def _validate_list(self, value: Any, type_options: Dict[str, Any]) -> str:
        """
        Validate and format a list value.
        
        Args:
            value: Value to validate
            type_options: List-specific options
            
        Returns:
            Formatted list value
        """
        options_str = type_options.get('options', '')
        if isinstance(options_str, list):
            options = options_str
        else:
            options = [opt.strip() for opt in options_str.split(',')]
        
        # Normalize value for comparison
        str_value = str(value).strip()
        
        # Check for exact match
        for option in options:
            if str_value.lower() == option.lower():
                return option
        
        # Check for partial match
        for option in options:
            if option.lower() in str_value.lower():
                logger.warning(f"Partial match for list value '{str_value}', using '{option}'")
                return option
        
        # Default to first option if no match
        if options:
            logger.warning(f"Value '{str_value}' not in allowed options {options}, defaulting to '{options[0]}'")
            return options[0]
        
        # Return original value if no options
        return str_value
    
    def _validate_number(self, value: Any, type_options: Dict[str, Any]) -> str:
        """
        Validate and format a number value.
        
        Args:
            value: Value to validate
            type_options: Number-specific options
            
        Returns:
            Formatted number value
        """
        format_type = type_options.get('format', 'decimal')
        
        # Extract numeric part
        if isinstance(value, (int, float)):
            num_value = value
        else:
            # Try to extract number from string
            str_value = str(value).strip()
            # Remove currency symbols, spaces, and other non-numeric characters
            numeric_str = re.sub(r'[^\d.,-]', '', str_value)
            numeric_str = numeric_str.replace(',', '.')  # Handle European format
            
            try:
                num_value = float(numeric_str)
            except ValueError:
                logger.warning(f"Could not convert '{value}' to number, defaulting to 0")
                num_value = 0
        
        # Format according to type
        if format_type == 'integer':
            # Round to nearest integer
            int_value = round(num_value)
            return str(int_value)
            
        elif format_type == 'percentage':
            # Format as percentage
            if '%' in str(value):
                # Value already has % symbol
                return str(value)
            else:
                # Add % symbol
                return f"{num_value:.1f}%"
                
        elif format_type == 'currency':
            # Format as currency
            if '$' in str(value):
                # Value already has $ symbol
                return str(value)
            else:
                # Add $ symbol
                return f"${num_value:.2f}"
                
        else:  # decimal
            # Format as decimal
            return f"{num_value:.2f}"

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