#!/bin/bash

# Set up environment variables
export PYTHONPATH=`pwd`
export KEEP_TEST_DATA=false  # Change to "true" to keep test data for inspection

# Run the metadata test
echo "Running metadata preservation test..."
python test_metadata_handling.py

# Check the exit code
if [ $? -eq 0 ]; then
    echo -e "\033[32mTest passed successfully!\033[0m"
    exit 0
else
    echo -e "\033[31mTest failed!\033[0m"
    exit 1
fi 