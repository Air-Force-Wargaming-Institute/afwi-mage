#!/usr/bin/env python3
"""
Script to fix relative imports in the codebase for Docker compatibility.
This script modifies Python files to add fallback absolute imports when relative imports fail.
"""

import os
import re
import sys
from pathlib import Path

# Define patterns to match and replace
RELATIVE_IMPORT_PATTERN = re.compile(r'^\s*from\s+(\.\.)+([\w.]+)\s+import\s+(.+)$', re.MULTILINE)
SINGLE_DOT_IMPORT_PATTERN = re.compile(r'^\s*from\s+(\.)([^.]+)\s+import\s+(.+)$', re.MULTILINE)

def fix_file(file_path):
    """Fix imports in a single file."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check if the file already has try-except blocks for imports
    if 'try:' in content and 'except ImportError:' in content and 'from core.' in content:
        print(f"Skipping {file_path} - already has try-except import blocks")
        return False
    
    # Replace relative imports with try-except blocks
    modified = False
    
    # Handle .. imports (parent directory)
    for match in RELATIVE_IMPORT_PATTERN.finditer(content):
        dots, module, names = match.groups()
        depth = len(dots) // 2  # Count how many parent directories to go up
        
        # Determine the absolute module path
        parts = file_path.parts
        # Get the right number of components from the path
        module_path_parts = []
        for i in range(depth):
            if len(parts) > i + 2:  # +2 to account for filename and current directory
                module_path_parts.append(parts[-(i+2)])
        
        # Reverse to get correct order
        module_path_parts.reverse()
        
        if module.startswith('.'):
            module = module[1:]
        
        if module:
            module_path_parts.append(module)
        
        absolute_module = ".".join(module_path_parts)
        
        # Construct the replacement
        original_line = match.group(0)
        replacement = f"""try:
    {original_line}
except ImportError:
    from {absolute_module} import {names}"""
        
        content = content.replace(original_line, replacement)
        modified = True
    
    # Handle . imports (same directory)
    for match in SINGLE_DOT_IMPORT_PATTERN.finditer(content):
        dot, module, names = match.groups()
        
        # Determine the absolute module path based on file location
        parts = file_path.parts
        if len(parts) >= 2:
            parent_module = parts[-2]  # Directory containing the file
            absolute_module = f"{parent_module}.{module}"
        else:
            absolute_module = module
        
        # Construct the replacement
        original_line = match.group(0)
        replacement = f"""try:
    {original_line}
except ImportError:
    from {absolute_module} import {names}"""
        
        content = content.replace(original_line, replacement)
        modified = True
    
    if modified:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Fixed imports in {file_path}")
        return True
    else:
        print(f"No changes needed for {file_path}")
        return False

def fix_imports_in_directory(directory):
    """Recursively fix imports in all Python files in a directory."""
    fixed_count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                file_path = Path(os.path.join(root, file))
                if fix_file(file_path):
                    fixed_count += 1
    return fixed_count

if __name__ == "__main__":
    # Get the embedding_service directory
    script_dir = Path(__file__).parent
    
    # Fix imports in api and core directories
    api_dir = script_dir / 'api'
    core_dir = script_dir / 'core'
    
    fixed_api = fix_imports_in_directory(api_dir)
    fixed_core = fix_imports_in_directory(core_dir)
    
    print(f"Fixed imports in {fixed_api} files in api/ directory")
    print(f"Fixed imports in {fixed_core} files in core/ directory")
    print("Done! Your code should now be Docker-compatible.") 