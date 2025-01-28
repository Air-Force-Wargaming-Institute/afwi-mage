from langchain_community.vectorstores import FAISS
from langchain_core.retrievers import BaseRetriever
from config import load_config
from utils.vector_store.vectorstore import check_for_vectorstore, load_local_vectorstore, create_retriever

class RetrieverManager:
    """
    Singleton class to manage retriever instances
    """
    _instance = None
    _retriever = None
    _vector_store = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RetrieverManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self._initialize()
            self._initialized = True

    def _initialize(self):
        """Initialize the retriever with configuration from config file"""
        config = load_config()
        vs_persist_dir = config['VS_PERSIST_DIR']
        search_type = config['SEARCH_TYPE']
        k = config['K']

        if check_for_vectorstore(vs_persist_dir):
            self._vector_store = load_local_vectorstore(vs_persist_dir)
            self._retriever = create_retriever(
                type=search_type,
                vector_store=self._vector_store,
                k=k
            )
        else:
            self._vector_store = None
            self._retriever = None

    @property
    def retriever(self) -> BaseRetriever:
        return self._retriever

    @property
    def vector_store(self) -> FAISS:
        return self._vector_store
