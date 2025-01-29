# maintains the shared state of the different components of the chat service
# This state is DIFFERENT from the graph state

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

shared_state = SharedState()