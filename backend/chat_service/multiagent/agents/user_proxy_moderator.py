from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState, ModGuidanceState
from multiagent.llm_manager import LLMManager
from langchain_core.messages import AIMessage
from typing import Set

def get_Moderator_Guidance(state: ModGuidanceState):
    print("get_Moderator_Guidance")  
    whoami = state['expert']
    llm = LLMManager().llm
    question = state['question']
    prompt = PromptTemplate(
                input_variables=["question", "expert"],
                template="You are the User-Proxy Moderator that manages the tasking and guidance of a panel of experts in a multi-discipline team. Your role is to:\n1. Analyze the user's qeustion/query thoroughly.\n2. Provide clear, specific guidance to {expert} on which aspects of the question/query they should focus on from their domain of expertise. Always state which expert you are addressing by name before you provide guidance.\n3. When receiving reports from the experts, ensure the overall analysis stays relevant to the user's question.\n4. Be concise in your guidance to each expert so that they can focus on the most relevant aspects of the question/query from their domain of expertise, but be comprehensive when scoping considerations for how each expert should focus their analysis.\n5. Do not embellish or add information beyond the scope of the user's question/query.\n6. If the user's question is unrelated to the purpose of the team of experts, simply state this and do not task the experts to generate any content or answer beyond stating that the user's questions is unrelated to the purpose of the team.\n\nHere is the user's question/query: {question}\n\n Now provide your guidance to {expert}."
            )
    chain = prompt | llm | StrOutputParser()
    guidance = chain.invoke({"question": question,
                                "expert": whoami,
                                })
    return {'expert_moderator_guidance': {whoami: guidance}}