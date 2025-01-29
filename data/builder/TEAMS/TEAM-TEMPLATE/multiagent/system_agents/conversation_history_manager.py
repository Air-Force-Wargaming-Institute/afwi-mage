from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState
from multiagent.llm_manager import LLMManager
#from webProject.utils.setup_logging import setup_logging
from utils.helpers import identify_experts
from config import load_config
from utils.shared_state import shared_state

def conversation_history_manager(state: GraphState) -> GraphState:
    """
    Is the true first step in the conversation. This agent looks at the users question and the conversation history, and then decides if the user is asking about something that has been previously discussed. If so, it will return the user's question with the relevant parts included. If not, it will return the user's question verbatim.
    """

    print("\n\n\t---------------------------\n\n\t---CONVERSATION HISTORY MANAGER---\n\n\t---------------------------\n\n\t")

    state_dict = state["keys"]
    whoami = "conversation_history_manager"
    question = state_dict["question"]

    llm = LLMManager().non_streaming

    # Determine if the user's question is related to anything they have asked previously. If it is, the LLM will return portion that is closest to it
    prompt = PromptTemplate(
        input_variables=["question", "conversation_history"],
        template="You are the User-Proxy Moderator in a multi-agent system. Your role is to analyze the user's query and determine if it is related so something they mentioned previously, or something that one of your agents reported previously. It may be the case that there is no reference in their query, in which case you should simply return the user's query verbatim; do not write anything besides the user's query.\nHere is the contents of the conversation history:\n\n{conversation_history}\n\nHere is the user's query: {question}\nGiven this information, determine if the user's query references anything in the conversation history. If it does not, return the user's query verbatim. If it does, identify the most relevant parts of the conversation history that are related to the user's query, and then re-write the user's query to include those parts. Do not embellish or add extraneous or irrelevant information. Simply return the user's query with the relevant parts included. Make sure that anything you return is well written text that can be stored as a Python string." 
    )

    chain = prompt | llm | StrOutputParser()
    new_question = chain.invoke({"question": question,
                                 "conversation_history": shared_state.CONVERSATION
                                 })

    print("\n\t+++++++++++++++"+new_question)

    return {"keys": {**state_dict, "question": new_question, "last_actor": whoami}}

