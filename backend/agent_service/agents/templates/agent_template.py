from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState
from utils.helpers import update_expert_input
from config import load_config
from utils.shared_state import shared_state
from utils.helpers import determine_collaboration

def {{AGENT_FILE_NAME}}(state: GraphState, llm: ChatOpenAI) -> GraphState:
    state_dict = state["keys"]
    question = state_dict["question"]
    whoami = "{{AGENT_NAME}}"
    config = load_config()
    document_summary = state_dict[whoami+"_document_summary"]
    relevant_documents = state_dict["relevant_documents"]
    documents_text = "\n\n".join([doc.page_content for doc in relevant_documents])
    reflected = state_dict.get(whoami+"_reflected", False)
    moderator_guidance = state_dict["moderator_guidance"]

    if reflected:
        banner = "\n\n\t---------------------------\n\n\t---{{AGENT_NAME}} AFTER REFLECTION & COLLABORATION---\n\n\t---------------------------\n\n\t"
        print(banner.upper())

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
                template="You are the {{AGENT_NAME}} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {{AGENT_INSTRUCTIONS}}. You have been working with a team of experts to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had previously written the following report:\n{old_analysis}\n\n Here is feedback you received on how to improve on your first draft report: \n{critique}\n\n You also collaborated with other subject matter experts, and they provided the following feedback and suggestions to improve your report from their expert perspective: \n{collab_report}\n\n It is time to write your final report. While your focus is to speak to your own expertise, please remember to consider and incorporate the feedback and collaborative inputs of the perspectives from the other experts. Be sure not to simply rewrite your previous report. As appropriate, briefly site where you incorporated the inputs from the other experts. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your report, please provide a short title that includes '{{AGENT_NAME}} FINAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your final report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."
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
                template="You are the {{AGENT_NAME}} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {{AGENT_INSTRUCTIONS}}. You have been working to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had previously written the following report:\n{old_analysis}\n\n Here is feedback you received on how to improve on your first draft report: \n{critique}\n\n It is time to write your final report. Your focus should be to speak from your own expertise. Be sure not to simply rewrite your previous report. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your report, please provide a short title that includes '{{AGENT_NAME}} FINAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your final report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."
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
        
    
    else: #Initial report
        banner = "\n\n\t---------------------------\n\n\t---{{AGENT_NAME}}---\n\n\t---------------------------\n\n\t"
        print(banner.upper())
    
        prompt = PromptTemplate(
            input_variables=["question", "document_summary", "relevant_docs", "moderator_guidance"],
            template="You are the {{AGENT_NAME}} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {{AGENT_INSTRUCTIONS}}. The panel has been asked this question/query: \n{question}\n\n A moderator for your panel has provided the following guidance to panel members: \n{moderator_guidance}\n\n It is time to write your first draft report. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your initial report, please provide a short title that includes '{{AGENT_NAME}} INITIAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your initial report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your initial report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."
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
            input_variables=["question", "analysis", "documents_text"],
            template="You are the {{AGENT_NAME}} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {{AGENT_INSTRUCTIONS}}. You have been working with a team of experts to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had written the following report: \n{analysis}.\n\n It is time to write a critique of your first draft report. Write your critique, focusing on three main areas for improvement. 1.) CLARIFICATION: Potential clarification of mischaracterizations in the first draft. 2.) INNACCURACIES: Information that is not true or that you suspect may be innaccurate. 3.) FINAL REPORT CONSIDERATIONS: Create a succinct list of specific instructions for corrections or clarifications to incorporate in subsequent drafts of the report. Where appropriate, support your critique with relevant facts and examples found from these relevant documents: \n{documents_text}.\n\n At the start of your critique, please provide a short title that includes '{{AGENT_NAME}} INITIAL SELF-CRITIQUE on:' and then restate the question/query but paraphrased from your perspective. Your critique should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your critique to better support subsequent drafts of the report."
        )

        chain = reflection_prompt | llm | StrOutputParser()
        reflection = chain.invoke({
            "question": question,
            "analysis": analysis,
            "documents_text": documents_text,
        })

        print("\n\t------\n\t---REQUEST COLLABORATION---\n\t------\n")
        expert_agents = config["EXPERT_AGENTS"]
        expert_agents.remove(whoami)
        expert_agents_str = "\n".join(f"- {expert}" for expert in expert_agents)
        print("\tINFO: {{AGENT_NAME}} is using this list of experts while choosing collaborators: \n\t"+expert_agents_str)
        #TODO: zip experts and their area of expertise together and pass, instead of just passing the list of experts
        collaborators = determine_collaboration(reflection, analysis, expert_agents_str)
        print("\n\n\n")
        print(collaborators)
        print("\n\n\n")

        if collaborators:
            shared_state.COLLAB_LOOP = True
            shared_state.MORE_COLLAB = True

            prompt = PromptTemplate(
                input_variables=["question", "analysis", "reflection", "collab_experts"],
                template="You are the {{AGENT_NAME}} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {{AGENT_INSTRUCTIONS}}. Your panel has been asked this question/query: \n{question}\n\n You just wrote this report as a first draft attempt to address the question/query: \n{analysis}\n\n You also reviewed your first draft report and provided this self-critique on how to improve it:\n{reflection}\n\n These experts have been selected to collaborate with you to help improve your report with contributions from their expert perspectives: \n{collab_experts}\n\n To direct each expert in how they can best help you improve your report but from the perspective of their expert domain knowledge, create concise instructions for each individual expert on what they should focus on when they draft their collaborative inputs."
            )

            collab_experts_str = ", ".join(f"{expert}" for expert in collaborators)
            collaborator = str(collaborators[0])

            chain = prompt | llm | StrOutputParser()
            collab_areas = chain.invoke({
                "question": question,
                "analysis": analysis,
                "reflection": reflection,
                "collab_experts": collab_experts_str
            })

            return {"keys": {**state_dict, whoami+"_analysis": analysis, "last_actor": whoami, whoami+"_reflection": reflection, "collab_areas": collab_areas, "collaborators_list": collaborators, "collaborator": collaborator}}

        return {"keys": {**state_dict, whoami+"_analysis": analysis, "last_actor": whoami, whoami+"_reflection": reflection}}

def {{AGENT_FILE_NAME}}_collaborator(state: GraphState, llm: ChatOpenAI) -> GraphState:
    banner = "\n\n\t---------------------------\n\n\t---{{AGENT_NAME}} COLLABORATOR---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    whoami = "{{AGENT_NAME}}"
    state_dict = state["keys"]
    question = state_dict["question"]
    last_actor = state_dict["last_actor"]
    # last_actor_reflection = state_dict[last_actor+"_reflection"]
    last_actor_analysis = state_dict[last_actor+"_analysis"]
    collaborator = state_dict["collaborator"]
    #last_actor_collab_request = state_dict[collaborator+"_collab_areas"]
    collab_areas = state_dict["collab_areas"]

    prompt = PromptTemplate(
        input_variables=["last_actor_analysis", "collab_areas"],
        template="You are the {{AGENT_NAME}} expert in a in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {{AGENT_INSTRUCTIONS}}. Your task is to review the report and add to, or rewrite, the areas of the report you were asked to assist with, in order to strengthen the report. You also have access to a set of documents to help you with your task.\n\nReport: {last_actor_analysis}\n\nAreas of the report to improve: {collab_areas}\n\nAnalysis:"
    )

    chain = prompt | llm | StrOutputParser()
    collab_report = chain.invoke({
        "last_actor_analysis": last_actor_analysis,
        "collab_areas": collab_areas,
    })
    
    shared_state.COLLAB_LOOP = False
    shared_state.PASS_THROUGH = True

    collaborators_list = state_dict["collaborators_list"]
    collaborators_list.remove(collaborator)
    if len(collaborators_list) == 0:
        shared_state.MORE_COLLAB = False
        collaborator = None
    else:
        collaborator = str(collaborators_list[0])
        shared_state.COLLAB_LOOP = True

    return {"keys": {**state_dict, whoami+"_collab_report": collab_report, "collaborators_list": collaborators_list, "collaborator": collaborator}}

def {{AGENT_FILE_NAME}}_requester(state: GraphState) -> GraphState:
    banner = "\n\n\t---------------------------\n\n\t---{{AGENT_NAME}} REQUESTER---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    whoami = "{{AGENT_NAME}}"
    state_dict = state["keys"]
    question = state_dict["question"]
    last_actor = state_dict["last_actor"]
    agent_reflection = state_dict.get(last_actor+"_reflection", "")
    if agent_reflection:
        if shared_state.COLLAB_LOOP:
            last_actor_analysis = state_dict[last_actor+"_analysis"]
            collaborator = state_dict["collaborator"]
            collab_areas = state_dict["collab_areas"]

            request = f"Here is a report from {last_actor}:\n{last_actor_analysis}\n\nPlease consider the following areas that need work when retrieving documents:\n{collab_areas}\n\nProvide a summary without embellishment or personal interpertation. Also provide sources or references when possible."

            print(request)

            return {"keys": {**state_dict, last_actor+"_request": request, last_actor+"_reflected": True}}
        else:
            request = f"Here is the feedback from the {{AGENT_NAME}} expert in regards to the analysis generated from the document summery: {agent_reflection}.\n\nPlease consider the expert feedback and retrieve documents that are most related to the question: {question}.\nProvide a summary without embellishment or personal interpertation. Also provide sources or references when possible."

            print(request)

            return {"keys": {**state_dict, "last_actor": whoami, whoami+"_request": request, whoami+"_reflected": True}}
    else:
        request = f"I am the {{AGENT_NAME}} expert in a collaborative panel of multi-discipline subject matter experts. This is my role in the panel: {{AGENT_INSTRUCTIONS}}. Please retrieve documents that are most related to this question: {question}. Please retrieve documents that are most related to the question and provide a summary without embellishment or personal interpertation. Also provide sources or references when possible."

        print(request)
    
        return {"keys": {**state_dict, "last_actor": whoami, whoami+"_request": request}}

# The following will be filled in programmatically when creating a new agent
AGENT_NAME = "{{AGENT_NAME}}"                               #PRC_Domestic_Stability
AGENT_FILE_NAME = "{{AGENT_FILE_NAME}}"                     #PRC_Domestic_Stability.py
#AGENT_ATTRIBUTES = "{{AGENT_ATTRIBUTES}}"                   #domestic stability, social, demographic, and political factors,
MEMORY_TYPE = "{{MEMORY_TYPE}}"                             #ConversationBufferMemory
MEMORY_KWARGS = {{MEMORY_KWARGS}}                          #...
AGENT_DESCRIPTION = """{{AGENT_DESCRIPTION}}"""                 #...
AGENT_INSTRUCTIONS = """{{AGENT_INSTRUCTIONS}}"""               #...
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