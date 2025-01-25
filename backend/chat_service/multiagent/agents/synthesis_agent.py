from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from utils.shared_state import shared_state
from multiagent.graphState import GraphState
from multiagent.llm_manager import LLMManager

def synthesis_agent(state: GraphState) -> GraphState:
    """
    The Synthesis Agent
    Consolidates insights from all other agents into a comprehensive report.
    """
    llm = LLMManager().llm 

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
        template="You are a report writer that synthesizes the findings, insights, and analysis of a panel of experts from a multi-discipline team. Your role is to consolidate the findings and insights from each of the team members into a single cohesive and comprehensive report.\n\nHandling invalid questions/queries: If the user's question has nothing to do with any of the expert available or the purpose of the team, simply state this in your report and do not try to generate any further content, analysis, or answer beyond stating that the user's questions is unrelated to the purpose of the team. Instead, generate some notional questions related to the team that the user can explore, should they choose to do so.\n\nHandling valid questions/queries: If the user's question is valid, your synthesis should evaluate all of the expert reports you are provided to: 1. Directly address the user's original question/query first, mainly using the 'Bottom Line Up Front' sections of each expert report. 2. Integrate key points from each expert agent's analysis into an overall narrative that addresses the question/query. 3. Identify overarching trends, uncertainties, and considerations that are shared acrossed expert reports. 4. Highlight any conflicting viewpoints or analyses from the experts. 5. Provide a balanced, comprehensive overview of the expert reports without adding any bias from your perspective. \nBe clear and detailed in your synthesis, supporting key points with specific examples and data found in the expert reports. If you identify any gaps in the overall analysis, note them explicitly in your report. Write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). \n\n Here is the original question/query: {question}\n\n Here are the final reports from the experts:\n\n{analyses}\n\n Now write your synthesis report. At the start of your synthesized report, please provide a short title that includes 'SYNTHESIZED REPORT on: ' and then restate the question/query {question}\n\n. "
    )
    
    chain = prompt | llm | StrOutputParser()
    
    analyses_text = "\n\n".join([f"{key} Analysis:\n{value}" for key, value in analyses.items()])
    synthesized_report = chain.invoke({
        "question": question,
        "analyses": analyses_text
    })
    
    return {"keys": {**state_dict, "synthesized_report": synthesized_report, "last_actor": whoami}}