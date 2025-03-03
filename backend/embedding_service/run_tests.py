#!/usr/bin/env python3
"""
Test runner for the embedding service.

This script runs the critical functionality tests for the embedding service,
focusing on metadata handling and preservation which was the key focus of
the refactoring effort.
"""

import os
import sys
import importlib
import subprocess
import argparse

# Get the directory of this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ANSI colors for terminals that support it
YELLOW = "\033[93m"
CYAN = "\033[96m"
GREEN = "\033[92m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Check if we're running in a terminal that supports colors
USE_COLORS = sys.stdout.isatty()

def colored(text, color, attrs=None):
    """Simple function to color text if terminal supports it."""
    if not USE_COLORS:
        return text
    
    color_code = {
        "yellow": YELLOW,
        "cyan": CYAN,
        "green": GREEN,
        "red": RED
    }.get(color, "")
    
    attr_code = ""
    if attrs and "bold" in attrs:
        attr_code = BOLD
    
    return f"{color_code}{attr_code}{text}{RESET}"


def run_test_module(module_name, verbose=False):
    """Run a test module and report results."""
    print(colored(f"\n=== Running {module_name} ===", "cyan"))
    
    try:
        # Try to import and run the module directly
        test_module = importlib.import_module(f"tests.{module_name}")
        
        # Check if the module has a main block
        if hasattr(test_module, "__main__") and callable(test_module.__main__):
            test_module.__main__()
            return True
        else:
            # If not, run it with pytest
            cmd = [sys.executable, "-m", "pytest", f"tests/{module_name}.py"]
            if verbose:
                cmd.append("-v")
            
            result = subprocess.run(cmd, cwd=SCRIPT_DIR)
            return result.returncode == 0
    except ImportError:
        # If import fails, run with pytest directly
        cmd = [sys.executable, "-m", "pytest", f"tests/{module_name}.py"]
        if verbose:
            cmd.append("-v")
        
        result = subprocess.run(cmd, cwd=SCRIPT_DIR)
        return result.returncode == 0


def run_all_tests(verbose=False):
    """Run all critical functionality tests."""
    print(colored("\n=== Embedding Service Critical Functionality Tests ===", "yellow"))
    print(colored("Testing the most important functionality: metadata preservation", "yellow"))
    
    # Define the test modules to run, in order
    test_modules = [
        "test_simple_metadata",
        "test_minimal_pipeline",
        "test_metadata_core"
    ]
    
    # Track results
    results = {}
    
    # Run each test module
    for module in test_modules:
        success = run_test_module(module, verbose)
        results[module] = success
    
    # Print summary
    print(colored("\n=== Test Results Summary ===", "cyan"))
    all_passed = True
    
    for module, success in results.items():
        if success:
            print(colored(f"✅ {module}: PASSED", "green"))
        else:
            print(colored(f"❌ {module}: FAILED", "red"))
            all_passed = False
    
    # Print overall result
    if all_passed:
        print(colored("\n✅ All critical tests PASSED! The metadata handling functionality is working correctly.", "green", ["bold"]))
    else:
        print(colored("\n❌ Some tests FAILED. Please check the output above for details.", "red", ["bold"]))
    
    return all_passed


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Run embedding service tests")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--module", help="Run a specific test module")
    return parser.parse_args()


if __name__ == "__main__":
    # Parse command line arguments
    args = parse_args()
    
    # Run tests
    if args.module:
        success = run_test_module(args.module, args.verbose)
    else:
        success = run_all_tests(args.verbose)
    
    # Set exit code based on test results
    sys.exit(0 if success else 1) 