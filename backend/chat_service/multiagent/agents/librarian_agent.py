from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

<<<<<<< HEAD:data/builder/TEAMS/PRC_Expert_Panel/multiagent/system_agents/librarian_agent.py
from multiagent.graphState import GraphState
from team_config import load_config
from multiagent.llm_manager import LLMManager
from team_config import load_config
from utils.shared_state import shared_state
=======
from multiagent.llm_manager import LLMManager
from config import load_config
from multiagent.retriever_manager import RetrieverManager
from multiagent.agents.helpers import create_banner
>>>>>>> origin/Agent-Parallelization:backend/chat_service/multiagent/agents/librarian_agent.py

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
    
    llm = LLMManager().non_streaming

    # Begin by retrieving documents relevant to the agent request
    relevant_docs = retriever.invoke(agent_request.strip())

    # Do we actually want the librarian to summerize the documents? Would it be better to have the experts get unedited information?
    # This increases token usage, so trade off consideration
    prompt = PromptTemplate(
        input_variables=["relevant_docs", "agent_request", "requester"],
        template="You are the Librarian that retrieves information from documents to support the analysis and report writing of a panel of experts. Your role is to:\n1. Search for the most relevant documents related to each request you receive.\n2. Summarize the key points from these documents clearly and concisely.\n3. Provide factual information without embellishment or personal interpretation.\n4. If information is not available or is unclear, state this explicitly.\n5. When available, always include sources or references. Do not make up sources or references if none are clear and available.\n\n Here is the request you received from the {requester} expert: {agent_request}\n\nRelevant Documents: {relevant_docs}\n\nSearch Query:"
    )
    
    chain = prompt | llm | StrOutputParser()
    
    documents_text = "\n\n".join([doc.page_content for doc in relevant_docs[:TOP_N_DOCUMENTS]])

    summary = chain.invoke({
        "relevant_docs": documents_text,
        "agent_request": agent_request,
        "requester": requester
    })

    return summary, relevant_docs