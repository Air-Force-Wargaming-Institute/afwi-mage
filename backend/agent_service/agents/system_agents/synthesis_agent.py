from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from graphState import GraphState

def synthesis_agent(state: GraphState, llm: ChatOpenAI) -> GraphState:
    """
    The Synthesis Agent
    Consolidates insights from all other agents into a comprehensive report.
    """
    print("\n\n\t---------------------------\n\n\t---SYNTHESIS AGENT---\n\n\t---------------------------\n\n\t")
    state_dict = state["keys"]
    question = state_dict["question"]
    whoami = "synthesis"
    analyses = {
        "Government": state_dict.get("prc_government_analysis", ""),
        "Military": state_dict.get("prc_military_analysis", ""),
        "Economic": state_dict.get("prc_economic_analysis", ""),
        "Regional Dynamics": state_dict.get("regional_dynamics_analysis", ""),
        "Global Influence": state_dict.get("global_influence_analysis", ""),
        "Technology": state_dict.get("technology_innovation_analysis", ""),
        "Domestic Stability": state_dict.get("domestic_stability_analysis", "")
    }
    
    prompt = PromptTemplate(
        input_variables=["question", "analyses"],
        template="You are the Synthesis Agent in a multi-agent system analyzing PRC behavior. Your role is to consolidate insights from all other agents into a cohesive report. If the user's question has nothing to do with any of the expert agents available or the purpose of this multi agent framework, simply do state this and do not try to generate any content, embellish, or answer beyond stating that the user's questions is unrelated to the purpose of the multi agents. Instead, generate some notional questions related to the PRC that the multi agents can explore and attempt to answer. If the user's question is valid, your synthesis should: 1. Directly address the user's original query. 2. Integrate key points from each expert agent's analysis. 3. Identify overarching trends, uncertainties, and potential future scenarios. 4. Highlight any conflicting viewpoints or analyses from the expert agents. 5. Provide a balanced, comprehensive overview of the PRC's approach to the issue. Be clear and detailed in your synthesis, supporting all key points with specific examples and data from the expert analyses. If you identify any gaps in the overall analysis, note them explicitly in your report. If the original question is determined to not be relevant to the purpose of this multi-agent group, simply tell the user.\n\nOriginal Question: {question}\n\nAnalyses:\n{analyses}\n\nSynthesized Report:"
    )
    
    chain = prompt | llm | StrOutputParser()
    
    analyses_text = "\n\n".join([f"{key} Analysis:\n{value}" for key, value in analyses.items()])
    synthesized_report = chain.invoke({
        "question": question,
        "analyses": analyses_text
    })
    
    return {"keys": {**state_dict, "synthesized_report": synthesized_report, "last_actor": whoami}}