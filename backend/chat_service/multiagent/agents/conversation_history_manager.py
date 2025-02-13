from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState
from multiagent.llm_manager import LLMManager
from multiagent.agents.helpers import create_banner
from logging import getLogger

logger = getLogger(__name__)


def conversation_history_manager(state: GraphState) -> GraphState:
    """
    Is the true first step in the conversation. This agent looks at the users question and the conversation history, and then decides if the user is asking about something that has been previously discussed.
    """
    print(create_banner(f"CONVERSATION HISTORY MANAGER").upper())
    # Validate state and get question

    question = state.get('question')

    llm = LLMManager().get_llm()  # Uses default model from config

    # Process the question with conversation history
    try:
        prompt = PromptTemplate(
            input_variables=["question", "conversation_history"],
            template="You are the User-Proxy Moderator in a multi-agent system. Your role is to analyze the user's query and determine if it is related so something they mentioned previously, or something that one of your agents reported previously. It may be the case that there is no reference in their query, in which case you should simply return the user's query verbatim; do not write anything besides the user's query. Absolutely do not explain your reasoning, or anything else if you have decided to return the user's query verbatim. \nHere is the contents of the conversation history:\n\n{conversation_history}\n\nHere is the user's new query: {question}\nGiven this information, determine if the user's query references anything in the conversation history. If it does not, return the user's query verbatim. If it does, identify the most relevant parts of the conversation history that are related to the user's query, and then re-write the user's query to include those parts. Do not embellish or add extraneous or irrelevant information. Simply return the user's query with the relevant parts included. Make sure that anything you return is well written text that can be stored as a Python string. Again, your response should be a single string that is a query and nothing else." 
        )

        chain = prompt | llm | StrOutputParser()
        new_question = chain.invoke({
            "question": question,
            "conversation_history": "\n\n".join([f"Question: {chat.question}\n" + "\n".join([f"{expert} Analysis: {analysis}" for expert, analysis in chat.expert_analyses.items()]) + "\n" + "-"*40 for chat in state.get('conversation_history', [])])
        })

        logger.info(new_question)

        #print(state)# Ensure we're returning a valid state format
        return {
            **state,
            'question': new_question if new_question else question
        }

    except Exception as e:
        print(f"Error in conversation_history_manager: {str(e)}")
        # Return original state if there's an error
        return state

