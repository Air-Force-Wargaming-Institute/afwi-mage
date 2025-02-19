from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState
from utils.llm_manager import LLMManager
from multiagent.agents.helpers import create_banner
from logging import getLogger

logger = getLogger(__name__)


def conversation_history_manager(state: GraphState) -> GraphState:
    """
    Is the true first step in the conversation. This agent looks at the users question and the conversation history, and then decides if the user is asking about something that has been previously discussed.
    """
    print(create_banner(f"CONVERSATION HISTORY MANAGER").upper())
    
    question = state.get('question')
    llm = LLMManager().get_llm()

    try:
        # Get conversation history
        history = state.get('conversation_history', [])
        # Format conversation history or indicate if empty
        if not history:
            conversation_history = "No conversation history available."
            logger.debug("No conversation history available")
        else:
            # Format conversation history
            formatted_history = []
            for chat in history:
                # Get the question from the chat item
                chat_question = chat.get('question', '')
                # Get the response from the chat item
                chat_response = chat.get('response', '')
                
                # Format this chat entry
                chat_entry = f"Question: {chat_question}\nResponse: {chat_response}\n{'-'*40}"
                formatted_history.append(chat_entry)

            conversation_history = "\n\n".join(formatted_history)

        prompt = PromptTemplate(
            input_variables=["question", "conversation_history"],
            template="You are the User-Proxy Moderator in a multi-agent system. Your role is to analyze the user's query and determine if it is related so something they mentioned previously, or something that one of your agents reported previously. It may be the case that there is no reference in their query, in which case you should simply return the user's query verbatim; do not write anything besides the user's query. Absolutely do not explain your reasoning, or anything else if you have decided to return the user's query verbatim. \nHere is the contents of the conversation history:\n\n{conversation_history}\n\nHere is the user's new query: {question}\nGiven this information, determine if the user's query references anything in the conversation history. If it does not, return the user's query verbatim. If it does, identify the most relevant parts of the conversation history that are related to the user's query, and then re-write the user's query to include those parts. Do not embellish or add extraneous or irrelevant information. Simply return the user's query with the relevant parts included. Make sure that anything you return is well written text that can be stored as a Python string. Again, your response should be a single string that is a query and nothing else." 
        )

        chain = prompt | llm | StrOutputParser()
        new_question = chain.invoke({
            "question": question,
            "conversation_history": conversation_history
        })

        logger.info(f"New question: {new_question}")

        return {
            **state,
            'question': new_question if new_question else question
        }

    except Exception as e:
        logger.error(f"Error in conversation_history_manager: {str(e)}")
        return state

