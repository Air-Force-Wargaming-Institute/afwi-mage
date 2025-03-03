from langchain_community.vectorstores import FAISS
from langchain_core.retrievers import BaseRetriever
from config_ import load_config
from utils.vector_store.vectorstore import check_for_vectorstore, load_local_vectorstore, create_retriever, get_vectorstore_path

class RetrieverManager:
    """
    Singleton class to manage retriever instances
    """
    _instance = None
    _retrievers = {}
    _vector_stores = {}
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
        """Initialize default configuration"""
        self.config = load_config()
        self.default_search_type = self.config['SEARCH_TYPE']
        self.default_k = self.config['K']

    def get_retriever(self, vs_persist_dir: str = None, search_type: str = None, k: int = None) -> BaseRetriever:
        """Get a retriever for the specified vector store directory"""
        vs_persist_dir = vs_persist_dir or self.config['VS_PERSIST_DIR']
        search_type = search_type or self.default_search_type
        k = k or self.default_k

        # Standardize the path
        standardized_path = get_vectorstore_path(vs_persist_dir)
        
        if standardized_path not in self._retrievers:
            if check_for_vectorstore(vs_persist_dir):
                vector_store = load_local_vectorstore(vs_persist_dir)
                if vector_store:
                    retriever = create_retriever(
                        type=search_type,
                        vector_store=vector_store,
                        k=k
                    )
                    self._vector_stores[standardized_path] = vector_store
                    self._retrievers[standardized_path] = retriever
                else:
                    return None
            else:
                return None

        return self._retrievers.get(standardized_path)

    def get_vector_store(self, vs_persist_dir: str = None) -> FAISS:
        """Get the vector store for the specified directory"""
        vs_persist_dir = vs_persist_dir or self.config['VS_PERSIST_DIR']
        
        # Standardize the path
        standardized_path = get_vectorstore_path(vs_persist_dir)
        
        return self._vector_stores.get(standardized_path)
