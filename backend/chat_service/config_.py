import os
import yaml
import logging
import sys
from pathlib import Path
from typing import Dict

DATA_DIR = Path("/app/data")
BUILDER_DIR = DATA_DIR / "builder"

def load_config() -> Dict:
    '''
    Loads the config file and returns it as a dictionary that can be used by other functions to access "global" variables.

    E.G.
    import config

    config = config.load_config()\n
    LOCAL_LLM = config['LOCAL_LLM']\n
    ...
    '''
    # Change the working directory to the absolute path of the directory containing *this* file
    # This is necessary to ensure that the config file is found when the script is run from different directories
    # This change affects the working directory of the whole program, not just this function call
    #path = os.path.dirname(os.path.abspath(__file__))
    #os.chdir(os.path.join(path, '..'))
    try:
        with open('config.yaml', 'r') as file:
            return yaml.safe_load(file)
    except FileNotFoundError:
        logging.error("Error loading config: config.yaml not found. Ensure that config.yaml file exists in the ./config directory.")
        sys.exit(1)
    except yaml.YAMLError as e:
        logging.error(f"Error parsing config: {e}")
        sys.exit(1)