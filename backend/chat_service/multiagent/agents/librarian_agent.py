from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from utils.llm_manager import LLMManager
from config_ import load_config
from multiagent.retriever_manager import RetrieverManager
from multiagent.agents.helpers import create_banner
from utils.prompt_manager import SystemPromptManager
from logging import getLogger

logger = getLogger(__name__)

def librarian(requester:str, agent_request:str, vs:str):
    print(create_banner("LIBRARIAN"))
    print(f"LIBRARIAN: Received request from {requester} for vectorstore {vs}")
    print(f"LIBRARIAN: Request content: {agent_request}")
    """
    The Librarian Agent
    Retrieves the most relevant documents from the vector store based on the agent's request and user's question.
    TODO: Explore other RAG retrieval methods and leveraging GraphRAG and/or hybrid RAG
    """
    config = load_config()
    TOP_N_DOCUMENTS = config['TOP_N_DOCUMENTS']

    # Use the RetrieverManager to get the retriever with standardized path
    retriever = RetrieverManager().get_retriever(vs)
    llm = LLMManager().get_llm()  # Uses default model from config

    # Begin by retrieving documents relevant to the agent request
    relevant_docs = retriever.invoke(agent_request.strip()) if retriever else []

    # Print retrieved documents
    if relevant_docs:
        print(f"LIBRARIAN: Retrieved {len(relevant_docs)} documents for {requester}'s request")
        for i, doc in enumerate(relevant_docs[:TOP_N_DOCUMENTS]):
            print(f"LIBRARIAN: Document {i+1} content (first 150 chars): {doc.page_content[:150]}...")
            if hasattr(doc, 'metadata') and doc.metadata:
                print(f"LIBRARIAN: Document {i+1} metadata: {doc.metadata}")
    # If no documents were retrieved, return an empty summary
    if not relevant_docs:
        logger.warning(f"No relevant documents found for {requester}'s request: {agent_request}")
        print(f"LIBRARIAN: No relevant documents found for {requester}'s request: {agent_request}")
        return f"No relevant documents found for {requester}'s request: {agent_request}", []

    prompt = SystemPromptManager().get_prompt_template("librarian_summary_prompt")
    prompt_data = SystemPromptManager().get_prompt("librarian_summary_prompt")
    llm = LLMManager().get_llm(prompt_data.get("llm"))

    # Do we actually want the librarian to summerize the documents? Would it be better to have the experts get unedited information?
    # This increases token usage, so trade off consideration
    
    chain = prompt | llm | StrOutputParser()
    
    documents_text = "\n\n".join([doc.page_content for doc in relevant_docs[:TOP_N_DOCUMENTS]])

    summary = chain.invoke({
        "relevant_docs": documents_text,
        "agent_request": agent_request,
        "requester": requester
    })

    # Print summary information
    print(f"LIBRARIAN: Generated summary for {requester} (first 150 chars): {summary[:150]}...")
    print(f"LIBRARIAN: Number of documents summarized: {len(relevant_docs[:TOP_N_DOCUMENTS])}")
    print(create_banner("LIBRARIAN COMPLETE"))

    return summary, relevant_docs