# maintains the shared state of the different components of the chat service
# This state is DIFFERENT from the graph state

from typing import Dict, Any
from .conversation_manager import ConversationManager
import os

class SharedState:
    def __init__(self):
        self.EXPERT_LIST_GENERATED = False
        self.QUESTION = ""
        self.ITERATION = 0
        self.VECTOR_STORE = None
        self.RETRIEVER = None
        self.OUTPUT_DIR = ""
        self.COLLAB_LOOP = False
        self.MORE_COLLAB = False
        self.PASS_THROUGH = False
        self.CONVERSATION = ""
        
        # Initialize conversation manager with logs directory
        logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "conversation_logs")
        self.conversation_manager = ConversationManager(logs_dir)

shared_state = SharedState()