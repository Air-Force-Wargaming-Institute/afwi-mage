"""
Visualization code generation module.

This module handles generating Python visualization code from natural language prompts
using LLMs with comprehensive data context from Excel files.
"""

import logging
import json
import re
from typing import Dict, Any, Optional, List

# Import LLM integration
from core.llm.client import get_llm_client

logger = logging.getLogger("workbench_service")

async def generate_visualization_code(
    prompt: str,
    spreadsheet_id: str,
    use_seaborn: bool,
    data_context: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate Python code for data visualization based on a natural language prompt.
    
    Args:
        prompt: Natural language description of the desired visualization
        spreadsheet_id: ID of the spreadsheet to visualize
        use_seaborn: Whether to use seaborn for visualization
        data_context: Comprehensive data context information
        
    Returns:
        Python code for generating the visualization
    """
    logger.info(f"Generating visualization code for prompt: {prompt} (use_seaborn={use_seaborn})")
    
    # Get LLM client
    llm = get_llm_client()
    
    spreadsheet_name = spreadsheet_id + '.xlsx'

    # Build the prompt with comprehensive data context, passing the use_seaborn flag
    system_prompt = _build_system_prompt(use_seaborn)
    user_prompt = _build_user_prompt(prompt, spreadsheet_name, use_seaborn, data_context)
    
    try:
        # Pass all necessary info, including use_seaborn, to the generation function
        code = await _generate_vis_code(system_prompt, user_prompt, use_seaborn, spreadsheet_name, data_context)
        return code
    except Exception as e:
        logger.error(f"Error generating visualization code: {str(e)}", exc_info=True)
        raise

def _build_system_prompt(use_seaborn: bool) -> str:
    """Build the system prompt for the LLM, tailored by use_seaborn flag."""
    
    if use_seaborn:
        library_preference = "You should **strongly prefer Seaborn** for plotting, as it generally produces more aesthetically pleasing results with less code. Use Matplotlib for customization only when Seaborn doesn't provide a direct way."
        style_guidance = "Use `sns.set_theme(style='whitegrid')` or a similar modern Seaborn theme. Choose an appropriate Seaborn color palette (like 'viridis', 'plasma', 'Set2') that ensures good color contrast and differentiation."
        library_import = "import seaborn as sns"
    else:
        library_preference = "You **must use only Matplotlib** for plotting. Do not import or use Seaborn."
        style_guidance = "Use `plt.style.use('seaborn-v0_8-whitegrid')` or `plt.style.use('ggplot')` for a modern look. Define a list of distinct, visually appealing colors if plotting multiple series/categories manually."
        library_import = "" # No extra import needed

    return f"""You are an expert Python data visualization programmer tasked with creating **clear, modern, informative, and visually appealing charts**. 
Your goal is to translate a user's request and provided data context into executable Python code that generates the best possible visualization.

**Core Task:** Write a complete, self-contained Python script using pandas for data loading and Matplotlib/Seaborn for plotting.

**Key Instructions & Constraints:**

1.  **Library Usage:** {library_preference}
    ```python
    import pandas as pd
    import matplotlib.pyplot as plt
    import numpy as np 
    {library_import}
    ```
2.  **Data Loading:**
    *   Load data using pandas: `pd.read_excel(...)`.
    *   The Excel file path is **ALWAYS** `/app/data/workbench/spreadsheets/FILENAME.xlsx`. Replace FILENAME with the provided spreadsheet name.
    *   Use the actual column names provided in the data context.
3.  **Visualization Quality (CRITICAL):**
    *   **Clarity:** Ensure titles are prominent (e.g., bold, larger font), axes are clearly labeled, and legends are used correctly.
    *   **Data Labels:** Add data labels directly to plots where it enhances readability (e.g., on bar charts, pie slices). Format them concisely (e.g., `f'{{value:.1f}}'` or `f'{{percentage:.0f}}%'`).
    *   **Modern Aesthetics:** {style_guidance}
    *   **Figure Size:** Use `plt.figure(figsize=(10, 6))` or `plt.figure(figsize=(12, 7))` (or similar appropriate dimensions) to ensure the plot is not cramped.
    *   **Layout:** **ALWAYS** include `plt.tight_layout()` at the end before any potential `plt.show()` or save command to prevent labels/titles from overlapping.
    *   **Color:** Ensure distinct colors for different categories/series. Avoid default color cycles if they are not visually distinct.
4.  **Code Quality:**
    *   Write clean, readable code with meaningful variable names.
    *   Include concise comments explaining **key decisions** or complex parts of the code, not just restating the obvious.
    *   Handle potential data issues gracefully (e.g., check if required columns exist before plotting).
5.  **Output:**
    *   **YOU MUST ONLY RETURN THE RAW PYTHON CODE.** 
    *   Do **NOT** include any explanations, introductory text, concluding remarks, or markdown formatting (like ```python ... ```) around the code.
    *   The code should generate the plot; do **not** include `plt.show()` unless specifically requested for a different purpose.

Adhere strictly to these instructions, especially the output format. Failure to return only the raw Python code will result in penalization.
"""

def _build_user_prompt(
    prompt: str, 
    spreadsheet_id: str, 
    use_seaborn: bool,
    data_context: Optional[Dict[str, Any]]
) -> str:
    """Build the user prompt with comprehensive data context."""
    
    # If no data context is provided, use a simplified prompt
    if not data_context:
        return f"""Please create a Python script that generates a matplotlib 
visualization based on the users request. Here is the users request: "{prompt}"

The data is in an Excel file with ID: {spreadsheet_id}
"""
    
    # Build a detailed prompt with comprehensive data context
    file_info = data_context.get('file_info', {})
    column_schema = data_context.get('column_schema', [])
    statistics = data_context.get('statistics', {})
    sample_rows = data_context.get('sample_rows', [])
    row_count = data_context.get('row_count', 0)
    
    # Format schema information
    schema_str = "Column information:\n"
    for col in column_schema:
        schema_str += f"- {col['name']} ({col['type']})"
        if col.get('missing'):
            schema_str += " (contains missing values)"
        schema_str += "\n"
    
    # Format statistics information
    stats_str = "Statistical summary:\n"
    for col_name, stats in statistics.items():
        stats_str += f"- {col_name}: "
        stats_items = [f"{k}={v}" for k, v in stats.items() if v is not None]
        stats_str += ", ".join(stats_items)
        stats_str += "\n"
    
    # Format sample data
    sample_str = "Sample data rows:\n"
    if column_schema and sample_rows:
        # Create a header row with column names
        header = [col['name'] for col in column_schema]
        sample_str += "| " + " | ".join(header) + " |\n"
        sample_str += "| " + " | ".join(["---" for _ in header]) + " |\n"
        
        # Add sample rows
        for row in sample_rows:
            sample_str += "| " + " | ".join([str(cell) for cell in row]) + " |\n"
    
    return f"""Please create a Python script that generates a matplotlib 
visualization based on the users request. Here is the users request: "{prompt}"

The data is in an Excel file with the following information:
- Filename: {spreadsheet_id}
- Sheets: {', '.join(file_info.get('sheets', ['Sheet1']))}
- Total rows: {row_count}

{schema_str}

{stats_str}

{sample_str}

Use the appropriate columns and visualization type to best acheive the intent of the users request.
The code should load the Excel file using pandas and create the visualization.
Make the visualization clear, professional, and easy to interpret.
"""

async def _generate_vis_code(
    system_prompt: str,
    user_prompt: str,
    use_seaborn: bool,
    spreadsheet_id: str,
    data_context: Optional[Dict[str, Any]]
) -> str:
    """Generate visualization code using the system and user prompts."""
    # Get LLM client
    llm = get_llm_client()
    
    try:
        # Use the LLM to generate code based on the system and user prompts
        llm_response = await llm.generate(system_prompt, user_prompt)
        print(llm_response)
        response_content = None
        if llm.llm_provider == 'ollama':
            if message_data := llm_response.get('message'):
                response_content = message_data.get('content')
        elif llm.llm_provider == 'vllm':
            if choices := llm_response.get('choices'):
                if isinstance(choices, list) and len(choices) > 0:
                    if message_data := choices[0].get('message'):
                        response_content = message_data.get('content')

        if not response_content:
            logger.error(f"Failed to extract code from LLM response. Raw response: {llm_response}")
            raise ValueError("LLM response did not contain the expected code content.")

        logger.info("Successfully received code from LLM.")


        # # Often, LLMs wrap the code in markdown backticks, let's try to remove them
        # cleaned_code = response_content.strip()
        # if cleaned_code.startswith("```python"):
        #     cleaned_code = cleaned_code[len("```python"):].strip()
        # elif cleaned_code.startswith("```"):
        #      cleaned_code = cleaned_code[len("```"):].strip()
        # if cleaned_code.endswith("```"):
        #     cleaned_code = cleaned_code[:-len("```")].strip()
        # return cleaned_code
        # Try to extract code block using regex
        match = re.search(r"```(?:python)?\s*(.*?)\s*```", response_content, re.DOTALL)

        if match:
            llm_code = match.group(1).strip()
        else:
            # If no backticks found, assume the whole response is the code
            llm_code = response_content.strip()

        logger.info("Successfully extracted/cleaned code from LLM response.")
        return llm_code
    except Exception as e:
        logger.error(f"Error during LLM code generation: {str(e)}", exc_info=True)
        # Re-raise the exception to be handled by the calling function
        raise

def _generate_example_code(
    prompt: str, 
    use_seaborn: bool,
    data_context: Optional[Dict[str, Any]]
) -> str:
    """Generate example visualization code for development purposes."""
    
    # Extract column names from data context if available
    columns = []
    if data_context and 'column_schema' in data_context:
        columns = [col['name'] for col in data_context['column_schema']]
    else:
        columns = ['Date', 'Region', 'Sales', 'Profit']
    
    # Find numeric and categorical columns
    numeric_cols = []
    categorical_cols = []
    
    if data_context and 'column_schema' in data_context:
        for col in data_context['column_schema']:
            if col['type'] == 'numeric':
                numeric_cols.append(col['name'])
            elif col['type'] in ('categorical', 'string'):
                categorical_cols.append(col['name'])
    else:
        numeric_cols = ['Sales', 'Profit']
        categorical_cols = ['Region']
    
    # Generate code based on prompt keywords
    code = ""
    if use_seaborn:
        code = f"""import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Set the style for the visualization
sns.set_theme(style="whitegrid")

# Load the data from Excel
data = pd.read_excel('data.xlsx')

# Create the visualization
plt.figure(figsize=(10, 6))
"""

        if 'bar' in prompt.lower() or 'column' in prompt.lower():
            if categorical_cols and numeric_cols:
                code += f"""# Create a bar plot
ax = sns.barplot(x='{categorical_cols[0]}', y='{numeric_cols[0]}', data=data)

# Add labels and title
plt.title('{numeric_cols[0]} by {categorical_cols[0]}')
plt.xlabel('{categorical_cols[0]}')
plt.ylabel('{numeric_cols[0]}')

# Add value labels on top of each bar
for p in ax.patches:
    ax.annotate(f'{{p.get_height():.1f}}',
                (p.get_x() + p.get_width() / 2., p.get_height()),
                ha='center', va='bottom')

# Rotate x-axis labels for better readability
plt.xticks(rotation=45)
"""
        elif 'line' in prompt.lower() or 'trend' in prompt.lower() or 'time' in prompt.lower():
            code += f"""# Create a line plot
sns.lineplot(x='{columns[0]}', y='{numeric_cols[0]}', data=data, marker='o')

# Add labels and title
plt.title('{numeric_cols[0]} Over Time')
plt.xlabel('{columns[0]}')
plt.ylabel('{numeric_cols[0]}')

# Rotate x-axis labels for better readability
plt.xticks(rotation=45)
"""
        elif 'scatter' in prompt.lower() or 'correlation' in prompt.lower():
            if len(numeric_cols) >= 2:
                code += f"""# Create a scatter plot
sns.scatterplot(x='{numeric_cols[0]}', y='{numeric_cols[1]}', data=data)

# Add labels and title
plt.title('Relationship Between {numeric_cols[0]} and {numeric_cols[1]}')
plt.xlabel('{numeric_cols[0]}')
plt.ylabel('{numeric_cols[1]}')

# Add a trend line
sns.regplot(x='{numeric_cols[0]}', y='{numeric_cols[1]}', data=data, scatter=False, ci=None)
"""
        elif 'pie' in prompt.lower():
            code += f"""# Prepare data for pie chart
pie_data = data.groupby('{categorical_cols[0]}')['{numeric_cols[0]}'].sum()

# Create a pie chart using matplotlib (seaborn doesn't have pie charts)
plt.figure(figsize=(10, 10))
plt.pie(pie_data, labels=pie_data.index, autopct='%1.1f%%', startangle=90)
plt.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle
plt.title('{numeric_cols[0]} Distribution by {categorical_cols[0]}')
"""
        elif 'histogram' in prompt.lower() or 'distribution' in prompt.lower():
            code += f"""# Create a histogram
sns.histplot(data=data, x='{numeric_cols[0]}', kde=True)

# Add labels and title
plt.title('Distribution of {numeric_cols[0]}')
plt.xlabel('{numeric_cols[0]}')
plt.ylabel('Frequency')
"""
        else:
            # Default to a bar plot
            code += f"""# Create a bar plot
sns.barplot(x='{categorical_cols[0]}', y='{numeric_cols[0]}', data=data)

# Add labels and title
plt.title('{numeric_cols[0]} by {categorical_cols[0]}')
plt.xlabel('{categorical_cols[0]}')
plt.ylabel('{numeric_cols[0]}')

# Rotate x-axis labels for better readability
plt.xticks(rotation=45)
"""
    else:
        # Matplotlib version
        code = f"""import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Load the data from Excel
data = pd.read_excel('data.xlsx')

# Create the visualization
plt.figure(figsize=(10, 6))
"""

        if 'bar' in prompt.lower() or 'column' in prompt.lower():
            if categorical_cols and numeric_cols:
                code += f"""# Get data for plotting
categories = data['{categorical_cols[0]}'].unique()
values = [data[data['{categorical_cols[0]}'] == cat]['{numeric_cols[0]}'].mean() for cat in categories]

# Create a bar plot
bars = plt.bar(categories, values)

# Add value labels on top of each bar
for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height,
            f'{{height:.1f}}', ha='center', va='bottom')

# Add labels and title
plt.title('{numeric_cols[0]} by {categorical_cols[0]}')
plt.xlabel('{categorical_cols[0]}')
plt.ylabel('{numeric_cols[0]}')

# Rotate x-axis labels for better readability
plt.xticks(rotation=45)
"""
        elif 'line' in prompt.lower() or 'trend' in prompt.lower() or 'time' in prompt.lower():
            code += f"""# Create a line plot
plt.plot(data['{columns[0]}'], data['{numeric_cols[0]}'], marker='o')

# Add labels and title
plt.title('{numeric_cols[0]} Over Time')
plt.xlabel('{columns[0]}')
plt.ylabel('{numeric_cols[0]}')

# Rotate x-axis labels for better readability
plt.xticks(rotation=45)
"""
        elif 'scatter' in prompt.lower() or 'correlation' in prompt.lower():
            if len(numeric_cols) >= 2:
                code += f"""# Create a scatter plot
plt.scatter(data['{numeric_cols[0]}'], data['{numeric_cols[1]}'])

# Add a trend line
z = np.polyfit(data['{numeric_cols[0]}'], data['{numeric_cols[1]}'], 1)
p = np.poly1d(z)
plt.plot(data['{numeric_cols[0]}'], p(data['{numeric_cols[0]}']), "r--")

# Add labels and title
plt.title('Relationship Between {numeric_cols[0]} and {numeric_cols[1]}')
plt.xlabel('{numeric_cols[0]}')
plt.ylabel('{numeric_cols[1]}')
"""
        elif 'pie' in prompt.lower():
            code += f"""# Prepare data for pie chart
pie_data = data.groupby('{categorical_cols[0]}')['{numeric_cols[0]}'].sum()

# Create a pie chart
plt.figure(figsize=(10, 10))
plt.pie(pie_data, labels=pie_data.index, autopct='%1.1f%%', startangle=90)
plt.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle
plt.title('{numeric_cols[0]} Distribution by {categorical_cols[0]}')
"""
        elif 'histogram' in prompt.lower() or 'distribution' in prompt.lower():
            code += f"""# Create a histogram
plt.hist(data['{numeric_cols[0]}'], bins=10, alpha=0.7, edgecolor='black')

# Add a density curve
if data['{numeric_cols[0]}'].dtype in [np.float64, np.int64]:
    from scipy import stats
    import numpy as np
    x = np.linspace(data['{numeric_cols[0]}'].min(), data['{numeric_cols[0]}'].max(), 100)
    density = stats.gaussian_kde(data['{numeric_cols[0]}'].dropna())
    plt.plot(x, density(x) * len(data) * (data['{numeric_cols[0]}'].max() - data['{numeric_cols[0]}'].min()) / 10)

# Add labels and title
plt.title('Distribution of {numeric_cols[0]}')
plt.xlabel('{numeric_cols[0]}')
plt.ylabel('Frequency')
"""
        else:
            # Default to a bar plot
            code += f"""# Get data for plotting
categories = data['{categorical_cols[0]}'].unique()
values = [data[data['{categorical_cols[0]}'] == cat]['{numeric_cols[0]}'].mean() for cat in categories]

# Create a bar plot
plt.bar(categories, values)

# Add labels and title
plt.title('{numeric_cols[0]} by {categorical_cols[0]}')
plt.xlabel('{categorical_cols[0]}')
plt.ylabel('{numeric_cols[0]}')

# Rotate x-axis labels for better readability
plt.xticks(rotation=45)
"""
    
    # Add code to adjust layout and save the figure
    code += """
# Adjust layout
plt.tight_layout()

# Save the figure (optional)
# plt.savefig('visualization.png', dpi=300, bbox_inches='tight')

# Show the plot
plt.show()
"""
    
    return code 