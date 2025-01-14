from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState
from utils.helpers import update_expert_input
from config import load_config
from utils.shared_state import shared_state
from utils.helpers import determine_collaboration

def {{AGENT_NAME}}(state: GraphState, llm: ChatOpenAI) -> GraphState:
    state_dict = state["keys"]
    question = state_dict["question"]
    whoami = {{AGENT_NAME}}
    config = load_config()
    document_summary = state_dict[whoami+"_document_summary"]
    relevant_documents = state_dict["relevant_documents"]
    documents_text = "\n\n".join([doc.page_content for doc in relevant_documents])
    reflected = state_dict.get(whoami+"_reflected", False)
    moderator_guidance = state_dict["moderator_guidance"]

    if reflected:
        print("\\n\n\t---------------------------\n\n\t---{{AGENT_NAME}} AFTER REFLECTION---\n\n\t---------------------------\n\n\t")

        old_analysis = state_dict[whoami+"_analysis"]
        critique = state_dict[whoami+"_reflection"]
        collaborator = state_dict.get("collaborator")

        if collaborator:
            collab_report_list = []
            for c in config["EXPERT_AGENTS"]:
                crs = state_dict.get('collab_reports')
                collab_report_list.append(crs.get(c+"_collab_report", ""))
            collab_report = "\n\t".join(f"- {expert}: {report}" for expert, report in zip(config["EXPERT_AGENTS"], collab_report_list))

            prompt = PromptTemplate(
                input_variables=["old_analysis", "critique", "question", "document_summary", "relevant_docs", "collab_report"],
                template="You are the {{AGENT_NAME}} in a multi-agent system. You just wrote the following report:\n{old_analysis}\n\nHere is the feedback to your report:\n{critique}\n\nYou also collaborated with others, and they provided this augmentation to your report:\n{collab_report}\n\nPlease consider the expert feedback and collaboration and revise your report to answer this question:\n{question}\n\nDo not simply rewrite your previous report. Instead, incorporate the feedback and revise your report to answer the question. {{AGENT_INSTRUCTIONS}}\n\nDocument Summary: {document_summary}\n\nRelevant Documents: {relevant_docs}\n\nAnalysis:"
            )

            chain = prompt | llm | StrOutputParser()
            analysis = chain.invoke({
                "old_analysis": old_analysis,
                "critique": critique,
                "question": question,
                "document_summary": document_summary,
                "relevant_docs": documents_text,
                "collab_report": collab_report,
            })
        else:
            prompt = PromptTemplate(
                input_variables=["old_analysis", "critique", "question", "document_summary", "relevant_docs"],
                template="You are the {{AGENT_NAME}} in a multi-agent system. You just wrote the following report:\n{old_analysis}\n\nHere is the feedback to your report:\n{critique}\n\nPlease consider the expert feedback and revise your report to answer this question:\n{question}\n\nDo not simply rewrite your previous report. Instead, incorporate the feedback and revise your report to answer the question. {{AGENT_INSTRUCTIONS}}\n\nDocument Summary: {document_summary}\n\nRelevant Documents: {relevant_docs}\n\nAnalysis:"
            )   
        
            chain = prompt | llm | StrOutputParser()
            analysis = chain.invoke({
                "old_analysis": old_analysis,
                "critique": critique,
                "question": question,
                "document_summary": document_summary,
                "relevant_docs": documents_text,
            })
        
        state = update_expert_input(state, whoami)
        state_dict = state["keys"]

        selected_experts = state_dict["selected_experts"]
        selected_experts.remove(whoami)

        # Write the output to a Word document
        #write_to_docx(whoami, analysis)

        shared_state.CONVERSATION += f"\t---{whoami} Analysis {shared_state.ITERATION}: {analysis},\n\n"

        # Clear out the collab reports for subsequent agents in the question chain
        expert_collab_reports = {}
        for expert in config["EXPERT_AGENTS"]:
            ecr = expert+"_collab_report"
            expert_collab_reports[ecr] = ""

        return {"keys": {**state_dict, whoami+"_analysis": analysis, "last_actor": whoami, "selected_experts": selected_experts, "collaborator": None, "collab_reports": expert_collab_reports}}
        
        return {"keys": {**state_dict, whoami+"_analysis": analysis, "last_actor": whoami, "selected_experts": selected_experts, "collaborator": None, "domestic_stability_collab_report": "", "global_influence_collab_report": "", "prc_economic_collab_report": "", "prc_government_collab_report": "", "prc_military_collab_report": "", "regional_dynamics_collab_report": "", "technology_innovation_collab_report": ""}}
    
    else:
        print("\n\n\t---------------------------\n\n\t---{{AGENT_NAME}}---\n\n\t---------------------------\n\n\t")
    
        prompt = PromptTemplate(
            input_variables=["question", "document_summary", "relevant_docs", "moderator_guidance"],
            template="{{AGENT_DESCRIPTION}}Provide specific examples from the documents of domestic factors and their effects.\n\nModerator Guidance: {moderator_guidance}\n\nQuestion: {question}\n\nDocument Summary: {document_summary}\n\nRelevant Documents: {relevant_docs}\n\nAnalysis:"
        )
    
        chain = prompt | llm | StrOutputParser()
    
        analysis = chain.invoke({
            "question": question,
            "document_summary": document_summary,
            "relevant_docs": documents_text,
            "moderator_guidance": moderator_guidance,
        })

        print("\n\t------\n\t---INITIAL REFLECTION---\n\t------\n")
        reflection_prompt = PromptTemplate(
            input_variables=["analysis", "documents_text"],
            template="You are a professional analyst who specializes in reviewing and critiquing reports on PRC domestic stability, specifically the PRC's internal social, demographic, and political factors. You are tasked to provide a critical analysis on a report about the PRC's domestic stability and provide feedback and identify potential mischaracterizations in the analysis along with calling out information that is not true or that you suspect may be innaccurate. After explaining your findings of the initial report, create a succinct list of instructions for the expert to incorporate as corrections or clarifications in the expert's new draft of their report. The report is as follows: {analysis}.\n\nSupport your points with relevant facts and examples found in the this document summary: {documents_text}.\n\nCritique:"
        )

        chain = reflection_prompt | llm | StrOutputParser()
        reflection = chain.invoke({
            "analysis": analysis,
            "documents_text": documents_text,
        })

        print("\n\t------\n\t---REQUEST COLLABORATION---\n\t------\n")
        expert_agents = config["EXPERT_AGENTS"]
        expert_agents.remove(whoami)
        expert_agents_str = "\n".join(f"- {expert}" for expert in expert_agents)
        collaborators = determine_collaboration(reflection, analysis, expert_agents_str)
        print("\n\n\n")
        print(collaborators)
        print("\n\n\n")

        if collaborators:
            shared_state.COLLAB_LOOP = True
            shared_state.MORE_COLLAB = True

            prompt = PromptTemplate(
                input_variables=["analysis", "reflection", "collab_experts"],
                template="You are the {{AGENT_NAME}} in a multi agent system. You just wrote this report:\n{analysis}\n\nYou also identified ways to improve the report here:\n{reflection}\n\nThe following experts have been selected to collaborate with you to improve the report by adding to, or rewriting parts of the report using their expert domain knowledge: {collab_experts}. For each expert, using your original analysis and guidance on how to improve it, please identify a few specific areas that expert should focus on while collaborating with you.\n\nCollaboration areas:"
            )
            #template="You are the Domestic Stability Expert in a multi agent system. You just wrote this report:\n{analysis}\n\nYou also identified ways to improve the report here:\n{reflection}\n\nThe {collaborator} expert has been selected to collaborate with you to improve the report by adding to, or rewriting parts of the report using their expert domain knowledge. Using your original analysis and guidance on how to improve it, please identify a few specific areas the expert should focus on in their collaboration with you.\n\nCollaboration areas:"

            collab_experts_str = ", ".join(f"{expert}" for expert in collaborators)
            collaborator = str(collaborators[0])

            chain = prompt | llm | StrOutputParser()
            collab_areas = chain.invoke({
                "analysis": analysis,
                "reflection": reflection,
                "collab_experts": collab_experts_str
            })

            return {"keys": {**state_dict, whoami+"_analysis": analysis, "last_actor": whoami, whoami+"_reflection": reflection, "collab_areas": collab_areas, "collaborators_list": collaborators, "collaborator": collaborator}}

        return {"keys": {**state_dict, whoami+"_analysis": analysis, "last_actor": whoami, whoami+"_reflection": reflection}}

# The following will be filled in programmatically when creating a new agent
AGENT_NAME = "{{AGENT_NAME}}"                               #PRC_Domestic_Stability
AGENT_FILE_NAME = "{{AGENT_FILE_NAME}}"                     #PRC_Domestic_Stability.py
#AGENT_ATTRIBUTES = "{{AGENT_ATTRIBUTES}}"                   #domestic stability, social, demographic, and political factors,
MEMORY_TYPE = "{{MEMORY_TYPE}}"                             #ConversationBufferMemory
MEMORY_KWARGS = {{MEMORY_KWARGS}}                          #...
AGENT_DESCRIPTION = "{{AGENT_DESCRIPTION}}"                 #...
AGENT_INSTRUCTIONS = "{{AGENT_INSTRUCTIONS}}"               #...
LLM_MODEL = "{{LLM_MODEL}}"                                 #llama3.2
COLOR = "{{COLOR}}"                                         #FF0000
CREATED_AT = "{{CREATED_AT}}"                               #2024-12-15
MODIFIED_AT = "{{MODIFIED_AT}}"                             #2025-01-23



# class Agent:
#     def __init__(self, name, description, llm, agent_instructions, memory_type="ConversationBufferMemory", memory_kwargs=None):
#         self.name = name
#         self.description = description
#         self.llm = llm
#         self.agent_instructions = agent_instructions
        
#         # Set up memory
#         if memory_type == "ConversationBufferMemory":
#             self.memory = ConversationBufferMemory(**(memory_kwargs or {}))
#         else:
#             raise ValueError(f"Unsupported memory type: {memory_type}")
        
#         # Set up prompt template
#         template = f"{agent_instructions}\n\nHuman: {{human_input}}\nAI: "
#         self.prompt = PromptTemplate(template=template, input_variables=["human_input"])
        
#         # Set up LLM chain
#         self.chain = LLMChain(llm=self.llm, prompt=self.prompt, memory=self.memory)
    
#     async def run(self, human_input):
#         return await self.chain.arun(human_input=human_input)