from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState
from utils.helpers import identify_experts
from config import load_config
from utils.shared_state import shared_state

def user_proxy_moderator(state: GraphState, llm: ChatOpenAI) -> GraphState:
    """
    The User-Proxy Moderator
    This agent determines the best experts to pose the user's question to, based on the user's question and the experts available.
    Then it acts as a router to keep to program flowing from one expert to the next.
    Once all the selected experts have provided their analysis, the program will flow to the Synthesis Agent, who will provide a final answer.
    """

    if shared_state.PASS_THROUGH:
        shared_state.PASS_THROUGH = False
        return state

    print("\n\n\t---------------------------\n\n\t---USER-PROXY MODERATOR---\n\n\t---------------------------\n\n\t")
    state_dict = state["keys"]
    whoami = "moderator"
    question = state_dict["question"]

    prompt = PromptTemplate(
                input_variables=["question", "next_expert"],
                template="You are the User-Proxy Moderator that manages the tasking and guidance of a panel of experts in a multi-discipline team. Your role is to:\n1. Analyze the user's qeustion/query thoroughly.\n2. Provide clear, specific guidance to {next_expert} on which aspects of the question/query they should focus on from their domain of expertise. Always state which expert you are addressing by name before you provide guidance.\n3. When receiving reports from the experts, ensure the overall analysis stays relevant to the user's question.\n4. Be concise in your guidance to each expert so that they can focus on the most relevant aspects of the question/query from their domain of expertise, but be comprehensive when scoping considerations for how each expert should focus their analysis.\n5. Do not embellish or add information beyond the scope of the user's question/query.\n6. If the user's question is unrelated to the purpose of the team of experts, simply state this and do not task the experts to generate any content or answer beyond stating that the user's questions is unrelated to the purpose of the team.\n\nHere is the user's question/query: {question}\n\n Now provide your guidance to {next_expert}."
            )

    # If experts have not been selected for the current question, run the identify_experts function and update the state dictionary
    if not shared_state.EXPERT_LIST_GENERATED:
        state = identify_experts(state)
        state_dict = state["keys"]

    # If there are still experts needed for the current question, provide guidance to the next expert
    num_remaining_experts = len(state_dict.get("selected_experts", ""))
    if num_remaining_experts > 0:
        shared_state.PASS_THROUGH = False
        next_expert = state_dict["selected_experts"][0].upper()
        chain = prompt | llm | StrOutputParser()
        guidance = chain.invoke({"question": question,
                                "next_expert": next_expert,
                                })
        return {"keys": {**state_dict, "moderator_guidance": guidance, "last_actor": whoami}}
    else:
        shared_state.PASS_THROUGH = False
        return {"keys": {**state_dict, "last_actor": whoami}}