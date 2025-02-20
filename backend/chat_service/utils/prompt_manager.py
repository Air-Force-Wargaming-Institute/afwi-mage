from pathlib import Path
import json
import logging
from typing import Dict, Optional, List
from config_ import load_config
from langchain_core.prompts import PromptTemplate
from threading import RLock
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class PromptData(BaseModel):
    """Model for prompt data"""
    name: str = Field(..., description="Name of the prompt")
    description: str = Field(..., description="Description of the prompt")
    content: str = Field(..., description="Content of the prompt")
    template_type: str = Field(..., description="Type of the template")
    variables: List[str] = Field(default_factory=list, description="List of variables")
    llm: Optional[str] = Field(default="", description="Selected LLM for this prompt")

class SystemPromptManager:
    """Manages system-level prompts used across the application"""
    
    _instance = None
    _lock = RLock()

    def __new__(cls):
        """Ensure singleton instance with thread-safe initialization"""
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(SystemPromptManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        """Initialize the manager (thread-safe)"""
        with self._lock:
            if self._initialized:
                return
                
            self._initialized = True
            self._file_lock = RLock()
            config = load_config()
            
            # Set up paths
            self.prompt_path = Path(config.get('PROMPT_PATH', '/app/data/system_prompts'))
            self.prompt_file = self.prompt_path / 'system_prompts.json'
            
            # Create directory structure
            try:
                self.prompt_path.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created prompt directory at {self.prompt_path}")
                
                # Create empty prompts file if it doesn't exist
                if not self.prompt_file.exists():
                    with open(self.prompt_file, 'w') as f:
                        json.dump({}, f, indent=2)
                    logger.info(f"Created empty prompts file at {self.prompt_file}")
                
            except Exception as e:
                logger.error(f"Error initializing prompt manager: {e}")
                raise RuntimeError(f"Failed to initialize prompt manager: {e}")

    def _ensure_prompt_file(self):
        """Ensure the prompts file exists (thread-safe)"""
        with self._file_lock:
            if not self.prompt_file.exists():
                try:
                    # First write to a temporary file
                    temp_file = self.prompt_file.with_suffix('.tmp')
                    with open(temp_file, 'w') as f:
                        json.dump({}, f, indent=2)
                    
                    # Then rename it to the actual file (atomic operation)
                    temp_file.replace(self.prompt_file)
                    
                except Exception as e:
                    logger.error(f"Error creating prompts file: {e}")
                    raise RuntimeError(f"Failed to create prompts file: {e}")

    def load_prompts(self) -> Dict:
        """Load all system prompts from file (thread-safe)"""
        with self._file_lock:
            try:
                if not self.prompt_file.exists():
                    self._ensure_prompt_file()
                    return {}
                
                with open(self.prompt_file, 'r') as f:
                    prompts = json.load(f)
                    
                # Ensure all prompts have the llm field
                for prompt in prompts.values():
                    if "llm" not in prompt:
                        prompt["llm"] = ""
                        
                return prompts
                    
            except json.JSONDecodeError as e:
                logger.error(f"Error decoding JSON from prompts file: {e}")
                self._ensure_prompt_file()
                return {}
            except Exception as e:
                logger.error(f"Error loading system prompts: {e}")
                return {}

    def save_prompts(self, prompts: Dict) -> bool:
        """Save prompts to file (thread-safe)"""
        with self._file_lock:
            try:
                # Ensure directory exists
                self.prompt_path.mkdir(parents=True, exist_ok=True)
                
                # First write to a temporary file
                temp_file = self.prompt_file.with_suffix('.tmp')
                with open(temp_file, 'w') as f:
                    json.dump(prompts, f, indent=2)
                
                # Then rename it to the actual file (atomic operation)
                temp_file.replace(self.prompt_file)
                return True
                
            except Exception as e:
                logger.error(f"Error saving system prompts: {e}")
                return False

    def get_prompt(self, prompt_id: str) -> Optional[Dict]:
        """Get a specific prompt by ID (thread-safe read)"""
        with self._file_lock:
            prompts = self.load_prompts()
            return prompts.get(prompt_id)

    def get_prompt_template(self, prompt_id: str) -> Optional[PromptTemplate]:
        """Get a prompt as a LangChain PromptTemplate with interpolated sub-prompts (thread-safe read)"""
        with self._file_lock:
            prompt_data = self.get_prompt(prompt_id)
            if not prompt_data:
                return None

            # Get the content and look for variables that match other prompt IDs
            content = prompt_data["content"]
            final_variables = prompt_data.get("variables", []).copy()
            
            # Load all prompts to check for matches
            all_prompts = self.load_prompts()
            
            # For each variable, check if it matches a prompt ID
            for var in list(final_variables):
                if var in all_prompts:
                    # Get the sub-prompt
                    sub_prompt = all_prompts[var]
                    var_pattern = "{" + var + "}"
                    
                    if var_pattern in content:
                        # Get the sub-prompt's template
                        sub_template = PromptTemplate(
                            input_variables=sub_prompt.get("variables", []),
                            template=sub_prompt["content"]
                        )
                        
                        # Replace the variable with the sub-prompt's template string
                        content = content.replace(var_pattern, sub_template.template)
                        
                        # Remove this variable since we've replaced it with its content
                        final_variables.remove(var)
                        
                        # Add the sub-prompt's variables to our variables list
                        sub_vars = sub_prompt.get("variables", [])
                        for sub_var in sub_vars:
                            if sub_var not in final_variables:
                                final_variables.append(sub_var)

            # Create the template with ALL variables (both original and from sub-prompts)
            template = PromptTemplate.from_template(
                template=content,
                template_format="f-string",
                validate_template=True
            )
            # Override the input_variables with our complete list
            template.input_variables = final_variables
            
            return template

    def format_prompt(self, prompt_id: str, **kwargs) -> Optional[str]:
        """Format a prompt with variables, including any sub-prompt interpolation"""
        template = self.get_prompt_template(prompt_id)
        if not template:
            return None

        # Format the template with all provided variables
        return template.format(**kwargs)

    def update_prompt(self, prompt_id: str, prompt_data: Dict) -> bool:
        """Update a specific prompt (thread-safe)"""
        with self._file_lock:
            prompts = self.load_prompts()
            if prompt_id in prompts:
                if "variables" not in prompt_data:
                    prompt_data["variables"] = prompts[prompt_id].get("variables", [])
                if "template_type" not in prompt_data:
                    prompt_data["template_type"] = prompts[prompt_id].get("template_type", "system")
                if "llm" not in prompt_data:
                    prompt_data["llm"] = prompts[prompt_id].get("llm", "")
                    
                prompts[prompt_id].update(prompt_data)
                return self.save_prompts(prompts)
            return False

    def add_prompt(self, prompt_id: str, prompt_data: Dict) -> bool:
        """Add a new prompt (thread-safe)"""
        with self._file_lock:
            try:
                prompts = self.load_prompts()
                
                # Use the name as the ID
                prompt_id = prompt_data.get("name", "").lower().replace(" ", "_")
                if not prompt_id:
                    logger.error("Cannot add prompt without a name")
                    return False
                
                if prompt_id in prompts:
                    logger.error(f"Prompt ID already exists: {prompt_id}")
                    return False
                    
                # Make a copy of the data to avoid modifying the input
                new_prompt = prompt_data.copy()
                if "llm" not in new_prompt:
                    new_prompt["llm"] = ""
                prompts[prompt_id] = new_prompt
                
                return self.save_prompts(prompts)
                    
            except Exception as e:
                logger.error(f"Error in add_prompt: {str(e)}")
                return False

    def delete_prompt(self, prompt_id: str) -> bool:
        """Delete a prompt (thread-safe)"""
        with self._file_lock:
            prompts = self.load_prompts()
            if prompt_id in prompts:
                del prompts[prompt_id]
                return self.save_prompts(prompts)
            return False

    def add_variable(self, prompt_id: str, variable_name: str) -> bool:
        """Add a new variable to a specific prompt (thread-safe)"""
        with self._file_lock:
            try:
                prompts = self.load_prompts()
                if prompt_id in prompts:
                    if "variables" not in prompts[prompt_id]:
                        prompts[prompt_id]["variables"] = []
                    if variable_name not in prompts[prompt_id]["variables"]:
                        prompts[prompt_id]["variables"].append(variable_name)
                        return self.save_prompts(prompts)
                return False
            except Exception as e:
                logger.error(f"Error adding variable: {e}")
                return False

    def remove_variable(self, prompt_id: str, variable_name: str) -> bool:
        """Remove a variable from a specific prompt (thread-safe)"""
        with self._file_lock:
            try:
                prompts = self.load_prompts()
                if prompt_id in prompts:
                    if "variables" in prompts[prompt_id]:
                        if variable_name in prompts[prompt_id]["variables"]:
                            prompts[prompt_id]["variables"].remove(variable_name)
                            return self.save_prompts(prompts)
                return False
            except Exception as e:
                logger.error(f"Error removing variable: {e}")
                return False

    def get_prompt_variables(self, prompt_id: str) -> List[str]:
        """Get variables for a specific prompt (thread-safe read)"""
        with self._file_lock:
            prompt = self.get_prompt(prompt_id)
            if prompt and "variables" in prompt:
                return prompt["variables"]
            return [] 