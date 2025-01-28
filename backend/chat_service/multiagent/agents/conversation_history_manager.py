from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState
from multiagent.llm_manager import LLMManager
#from webProject.utils.setup_logging import setup_logging
from utils.shared_state import shared_state

def conversation_history_manager(state: GraphState) -> GraphState:
    """
    Is the true first step in the conversation. This agent looks at the users question and the conversation history, and then decides if the user is asking about something that has been previously discussed.
    """
    print("\n\n\t---------------------------\n\n\t---CONVERSATION HISTORY MANAGER---\n\n\t---------------------------\n\n\t")

    # Validate state and get question
    if not isinstance(state, dict) or 'keys' not in state:
        raise ValueError("Invalid state format")
    
    keys = state.get('keys', {})
    if not isinstance(keys, dict):
        raise ValueError("Invalid keys format in state")

    question = keys.get('question')
    if not question:
        raise ValueError("No question found in state")

    llm = LLMManager().non_streaming

    # Process the question with conversation history
    try:
        prompt = PromptTemplate(
            input_variables=["question", "conversation_history"],
            template="You are the User-Proxy Moderator in a multi-agent system. Your role is to analyze the user's query and determine if it is related so something they mentioned previously, or something that one of your agents reported previously. It may be the case that there is no reference in their query, in which case you should simply return the user's query verbatim; do not write anything besides the user's query.\nHere is the contents of the conversation history:\n\n{conversation_history}\n\nHere is the user's query: {question}\nGiven this information, determine if the user's query references anything in the conversation history. If it does not, return the user's query verbatim. If it does, identify the most relevant parts of the conversation history that are related to the user's query, and then re-write the user's query to include those parts. Do not embellish or add extraneous or irrelevant information. Simply return the user's query with the relevant parts included. Make sure that anything you return is well written text that can be stored as a Python string." 
        )

        chain = prompt | llm | StrOutputParser()
        new_question = chain.invoke({
            "question": question,
            "conversation_history": shared_state.CONVERSATION or ""
        })

        print(f"\n\t+++++++++++++++{new_question}")

        # Ensure we're returning a valid state format
        return {
            'keys': {
                **keys,
                'question': new_question if new_question else question
            }
        }

    except Exception as e:
        print(f"Error in conversation_history_manager: {str(e)}")
        # Return original state if there's an error
        return state

