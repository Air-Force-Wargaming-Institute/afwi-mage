import ollama
import os
from config import BASE_MODELS_DIR
import logging

logger = logging.getLogger(__name__)

# Try to initialize a default model at module load time
try:
    # Check if ollama is accessible and at least one model is available
    logger.info("Checking Ollama service availability at startup...")
    models = ollama.list()
    if models and 'models' in models and len(models['models']) > 0:
        logger.info(f"Ollama service is available with {len(models['models'])} models: {[m['name'] for m in models['models']]}")
        # Set the default model to the first available one
        DEFAULT_MODEL = models['models'][0]['name']
        logger.info(f"Using {DEFAULT_MODEL} as the default model")
    else:
        # If no models are available, we'll use a default
        DEFAULT_MODEL = "llama2"
        logger.warning(f"No models found in Ollama. Will use '{DEFAULT_MODEL}' as default and attempt to pull it if needed.")
except Exception as e:
    logger.error(f"Error connecting to Ollama at startup: {str(e)}")
    # Set a fallback default model
    DEFAULT_MODEL = "llama2"
    logger.warning(f"Will use '{DEFAULT_MODEL}' as default when Ollama becomes available")

def initialize_model(model_name):
    try:
        # Check if the model already exists in Ollama
        models = ollama.list()
        if any(model['name'] == model_name for model in models['models']):
            logger.info(f"Model {model_name} is already initialized")
            return

        # If the model doesn't exist, we'll create it
        modelfile_path = BASE_MODELS_DIR / f"{model_name}.modelfile"
        if not modelfile_path.exists():
            raise FileNotFoundError(f"Modelfile not found: {modelfile_path}")

        # Create the model in Ollama using the existing modelfile
        ollama.create(model=model_name, path=str(modelfile_path))
        logger.info(f"Model {model_name} initialized successfully")

    except Exception as e:
        logger.error(f"Error initializing model: {str(e)}")
        raise

def chat_with_model(model_name, messages, stream=False):
    try:
        logger.info(f"Starting chat with model: {model_name}")
        response = ollama.chat(model=model_name, messages=messages, stream=stream)
        
        if stream:
            return _stream_generator(response)
        else:
            # For non-streaming, construct a more detailed response
            return {
                "model": model_name,
                "message": response['message'],
                "total_duration": response['total_duration'],
                "load_duration": response['load_duration'],
                "prompt_eval_count": response['prompt_eval_count'],
                "eval_count": response['eval_count'],
                "eval_duration": response['eval_duration']
            }
    except ollama.ResponseError as e:
        logger.error(f"Ollama ResponseError in chat_with_model: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in chat_with_model: {str(e)}")
        raise

def generate_text(model_name, prompt, stream=False):
    try:
        logger.info(f"Generating text with model: {model_name}")
        response = ollama.generate(model=model_name, prompt=prompt, stream=stream)
        
        if stream:
            return _stream_generator(response)
        else:
            # For non-streaming, construct a more detailed response
            return {
                "model": model_name,
                "response": response['response'],
                "total_duration": response['total_duration'],
                "load_duration": response['load_duration'],
                "prompt_eval_count": response['prompt_eval_count'],
                "eval_count": response['eval_count'],
                "eval_duration": response['eval_duration']
            }
    except ollama.ResponseError as e:
        logger.error(f"Ollama ResponseError in generate_text: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in generate_text: {str(e)}")
        raise

def _stream_generator(response):
    for chunk in response:
        yield chunk['message']['content']