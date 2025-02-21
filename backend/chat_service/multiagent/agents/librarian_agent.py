from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from utils.llm_manager import LLMManager
from config_ import load_config
from multiagent.retriever_manager import RetrieverManager
from multiagent.agents.helpers import create_banner
from utils.prompt_manager import SystemPromptManager

def librarian(requester:str, agent_request:str):
    print(create_banner("LIBRARIAN"))
    """
    The Librarian Agent
    Retrieves the most relevant documents from the vector store based on the agent's request and user's question.
    TODO: Explore other RAG retrieval methods and leveraging GraphRAG and/or hybrid RAG
    """
    config = load_config()
    TOP_N_DOCUMENTS = config['TOP_N_DOCUMENTS']

    retriever = RetrieverManager().retriever
    llm = LLMManager().get_llm()  # Uses default model from config

    # Begin by retrieving documents relevant to the agent request
    relevant_docs = retriever.invoke(agent_request.strip())

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

    return summary, relevant_docs