from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState
from utils.helpers import update_expert_input
from config import load_config
from utils.shared_state import shared_state
from utils.helpers import determine_collaboration
#from utils.write_to_docx import write_to_docx

#This is a test comment

def domestic_stability_expert(state: GraphState, llm: ChatOpenAI) -> GraphState:
    """
    The PRC Domestic Stability Expert
    Provides an answer to the user's question, from the lens of the template, based on the document summary provided by the librarian.
    After answering once, the expert reflects on what they wrote and then revises their answer after requesting more documents.
    """
    state_dict = state["keys"]
    question = state_dict["question"]
    whoami = "domestic_stability"
    config = load_config()
    document_summary = state_dict[whoami+"_document_summary"]
    relevant_documents = state_dict["relevant_documents"]
    documents_text = "\n\n".join([doc.page_content for doc in relevant_documents])
    reflected = state_dict.get(whoami+"_reflected", False)
    moderator_guidance = state_dict["moderator_guidance"]
    
    if reflected:
        print("\\n\n\t---------------------------\n\n\t---DOMESTIC STABILITY EXPERT AFTER REFLECTION---\n\n\t---------------------------\n\n\t")

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
                template="You are the Domestic Stability Expert in a multi-agent system. You just wrote the following report:\n{old_analysis}\n\nHere is the feedback to your report:\n{critique}\n\nYou also collaborated with others, and they provided this augmentation to your report:\n{collab_report}\n\nPlease consider the expert feedback and collaboration and revise your report to answer this question:\n{question}\n\nDo not simply rewrite your previous report. Instead, incorporate the feedback and revise your report to answer the question. Concentrate on the PRC's internal social, demographic, and political factors.\n\nDocument Summary: {document_summary}\n\nRelevant Documents: {relevant_docs}\n\nAnalysis:"
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
                template="You are the PRC Domestic Stability Expert in a multi-agent system. You just wrote the following report:\n{old_analysis}\n\nHere is the feedback to your report:\n{critique}\n\nPlease consider the expert feedback and revise your report to answer this question:\n{question}\n\nDo not simply rewrite your previous report. Instead, incorporate the feedback and revise your report to answer the question. Concentrate on the PRC's internal social, demographic, and political factors.\n\nDocument Summary: {document_summary}\n\nRelevant Documents: {relevant_docs}\n\nAnalysis:"
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
    
    else:
        print("\n\n\t---------------------------\n\n\t---DOMESTIC STABILITY EXPERT---\n\n\t---------------------------\n\n\t")
    
        prompt = PromptTemplate(
            input_variables=["question", "document_summary", "relevant_docs", "moderator_guidance"],
            template="You are the Domestic Stability Expert in a multi-agent system. Evaluate internal social, demographic, and political factors in the PRC. Your task is to use the moderator guidance and provided documents to answer the question. Your analysis should: 1. Explain how domestic issues influence PRC's approach to the query topic. 2. Discuss relevant public opinion trends, ethnic tensions, or domestic challenges. 3. Analyze how internal stability concerns affect PRC's decision-making. 4. Identify any recent domestic developments that impact the issue. Provide specific examples from the documents of domestic factors and their effects.\n\nModerator Guidance: {moderator_guidance}\n\nQuestion: {question}\n\nDocument Summary: {document_summary}\n\nRelevant Documents: {relevant_docs}\n\nAnalysis:"
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
                template="You are the Domestic Stability Expert in a multi agent system. You just wrote this report:\n{analysis}\n\nYou also identified ways to improve the report here:\n{reflection}\n\nThe following experts have been selected to collaborate with you to improve the report by adding to, or rewriting parts of the report using their expert domain knowledge: {collab_experts}. For each expert, using your original analysis and guidance on how to improve it, please identify a few specific areas that expert should focus on while collaborating with you.\n\nCollaboration areas:"
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

def domestic_stability_collaborator (state: GraphState, llm: ChatOpenAI) -> GraphState:
    print("\n\n\t---------------------------\n\n\t---DOMESTIC STABILITY COLLABORATOR---\n\n\t---------------------------\n\n\t")
    whoami = "domestic_stability"
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
        template="You are the Domestic Stability Expert in a multi agent system. Focus on internal social, demographic, and political factors in the PRC as you write. You have been give a report from another agent along with areas where your expertise could improve said report. Your task is to review the report and add to, or rewrite, the areas of the report you were asked to assist with, in order to strengthen the report. You also have access to a set of documents to help you with your task. While writing be sure to: 1. Explain how domestic issues influence PRC's approach to the query topic. 2. Discuss relevant public opinion trends, ethnic tensions, or domestic challenges. 3. Analyze how internal stability concerns affect PRC's decision-making. 4. Identify any recent domestic developments that impact the issue.\n\nReport: {last_actor_analysis}\n\nAreas of the report to improve: {collab_areas}\n\nAnalysis:"
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

def domestic_stability_requester(state: GraphState) -> GraphState:
    """
    The PRC Domestic Stability Requester
    Logically, it is part of the domestic_stability_expert, but for the sake of functionality, it is separate.
    This agent is responsible for writing the document request that will go to the librarian so that it retrieves the most relevant documents.
    It will either request documents that are most relevant to the question, or it will request documents that are most relevant to the feedback from the PRC Domestic Stability Expert.
    TODO: Look into turning requesters into @tools
    """
    print("\n\n\t---------------------------\n\n\t---PRC DOMESTIC STABILITY REQUESTER---\n\n\t---------------------------\n\n\t")
    whoami = "domestic_stability"
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

            return {"keys": {**state_dict, last_actor+"_request": request, last_actor+"_reflected": True}}
        else:
            request = f"Here is the feedback from the Domestic Stability Expert in regards to the analysis generated from the document summery: {agent_reflection}.\n\nPlease consider the expert feedback and retrieve documents that are most related to the question: {question}.\nProvide a summary without embellishment or personal interpertation. Also provide sources or references when possible."

            return {"keys": {**state_dict, "last_actor": whoami, whoami+"_request": request, whoami+"_reflected": True}}
    else:
        request = f"I need documents with information on the internal social and political factors in the PRC that are related to this question: {question}. Please retrieve documents that are most related to the question and provide a summary without embellishment or personal interpertation. Also provide sources or references when possible."
    
        return {"keys": {**state_dict, "last_actor": whoami, whoami+"_request": request}}