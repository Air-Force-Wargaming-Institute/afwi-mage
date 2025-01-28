from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState, ExpertState
from backend.chat_service.multiagent.agents.helpers import update_expert_input
from config import load_config
from utils.shared_state import shared_state
from backend.chat_service.multiagent.agents.helpers import determine_collaboration
from multiagent.llm_manager import LLMManager
from agents import librarian

PRC_GOVERNMENT_AGENT_INSTRUCTIONS = """You are the PRC Government Expert in a multi-agent system. Focus on the structure, decision-making processes, and key figures within the PRC government.\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents."""
DOMESTIC_STABILITY_AGENT_INSTRUCTIONS = """You are the Domestic Stability expert in a multi-agent system.\n\nEvaluate internal social, demographic, and political factors in the PRC. \n\nYour task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Explain how domestic issues influence PRC\'s approach to the query topic. \n2. Discuss relevant public opinion trends, ethnic tensions, or domestic challenges.\n3. Analyze how internal stability concerns affect PRC\'s decision-making. \n4. Identify any recent domestic developments that impact the issue. Provide specific examples from the documents of domestic factors and their effects."""
GLOBAL_INFLUENCE_AGENT_INSTRUCTIONS = """You are the Global Influence Expert in a multi-agent system. Track the PRC\'s efforts to expand its global influence. Your task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Assess the impact of PRC\'s global initiatives on the issue in the query. \n2. Discuss relevant diplomatic efforts, investments, or soft power initiatives. \n3. Analyze how PRC\'s actions affect international institutions and norms. \n4. Identify any global trends or reactions that influence PRC\'s approach. Use concrete examples from the documents of PRC\'s global activities and their outcomes."""
PRC_ECONOMIC_EXPERT_INSTRUCTIONS = """You are the PRC Economic Expert in a multi-agent system. Focus on the PRC\'s economic policies, trade relationships, and industrial strategies. \n\nYour analysis should \n1. Predict economic actions and their geopolitical implications relevant to the query. \n2. Explain how economic factors influence PRC\'s approach to the issue at hand.\n3. Provide data on relevant economic indicators, trade patterns, or industrial policies.\n4. Discuss any recent economic initiatives or shifts that relate to the user\'s question. Use specific economic data and examples from the documents to support your points. Your task is to use the moderator guidance and provided documents to answer the question."""
PRC_MILITARY_EXPERT_INSTRUCTIONS = """You are the PRC Military Expert in a multi-agent system. Concentrate on the capabilities, doctrine, and strategic objectives of the People\'s Liberation Army (PLA).\n\nYour task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Assess potential military actions or responses related to the query. \n2. Provide details on relevant military capabilities, technologies, or strategies. \n3. Explain how military considerations influence PRC\'s approach to the issue at hand. \n4. Discuss any recent military developments or exercises relevant to the query. Provide concrete examples and data from the documents to support your analysis."""
REGIONAL_DYNAMICS_EXPERT_INSTRUCTIONS = """You are the Regional Dynamics Expert in a multi-agent system. Examine the PRC\'s relationships with neighboring countries and regional powers.\n\nYour task is to use the moderator guidance and provided documents to answer the question.\n\nYour analysis should\n1. Explain how regional dynamics affect PRC\'s approach to the issue in the query.\n2. Discuss relevant historical context, territorial disputes, or shifting alliances. \n3. Analyze the positions and potential reactions of key regional players. \n4. Identify any recent regional developments or agreements that impact the issue. Provide specific examples of regional interactions from the documents and their implications."""
TECHNOLOGY_INNOVATION_EXPERT_INSTRUCTIONS = """You are the Technology and Innovation Expert in a multi-agent system. Monitor the PRC\'s advancements in key technologies.\n\nYour task is to use the moderator guidance and provided documents to answer the question.\n\nYour analysis should\n1. Explain how technological factors relate to the issue in the query.\n2. Provide details on relevant advancements in AI, quantum computing, biotechnology, etc.\n3. Assess potential military and economic applications of these technologies.\n4. Discuss any recent technological developments or initiatives that relate to the user\'s question. Provide specific examples and data from the documents to support your analysis."""

def prc_government_expert(state: GraphState) -> GraphState:
    state_dict = state["keys"]
    question = state_dict["question"]
    whoami = "prc_government"
    config = load_config()
    llm = LLMManager().llm
    document_summary = state_dict[whoami+"_document_summary"]
    relevant_documents = state_dict["relevant_documents"]
    documents_text = "\n\n".join([doc.page_content for doc in relevant_documents])
    reflected = state_dict.get(whoami+"_reflected", False)
    moderator_guidance = state_dict["moderator_guidance"]

    if reflected:
        banner = "\n\n\t---------------------------\n\n\t---prc government AFTER REFLECTION & COLLABORATION---\n\n\t---------------------------\n\n\t"
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
                template="You are the prc government expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: You are the PRC Government Expert in a multi-agent system. Focus on the structure, decision-making processes, and key figures within the PRC government.\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. You have been working with a team of experts to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had previously written the following report:\n{old_analysis}\n\n Here is feedback you received on how to improve on your first draft report: \n{critique}\n\n You also collaborated with other subject matter experts, and they provided the following feedback and suggestions to improve your report from their expert perspective: \n{collab_report}\n\n It is time to write your final report. While your focus is to speak to your own expertise, please remember to consider and incorporate the feedback and collaborative inputs of the perspectives from the other experts. Be sure not to simply rewrite your previous report. As appropriate, briefly site where you incorporated the inputs from the other experts. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your report, please provide a short title that includes 'prc government FINAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your final report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."
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
                template="You are the prc government expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: You are the PRC Government Expert in a multi-agent system. Focus on the structure, decision-making processes, and key figures within the PRC government.\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. You have been working to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had previously written the following report:\n{old_analysis}\n\n Here is feedback you received on how to improve on your first draft report: \n{critique}\n\n It is time to write your final report. Your focus should be to speak from your own expertise. Be sure not to simply rewrite your previous report. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your report, please provide a short title that includes 'prc government FINAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your final report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."
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
        banner = "\n\n\t---------------------------\n\n\t---prc government---\n\n\t---------------------------\n\n\t"
        print(banner.upper())
    
        prompt = PromptTemplate(
            input_variables=["question", "document_summary", "relevant_docs", "moderator_guidance"],
            template="You are the prc government expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: You are the PRC Government Expert in a multi-agent system. Focus on the structure, decision-making processes, and key figures within the PRC government.\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. The panel has been asked this question/query: \n{question}\n\n A moderator for your panel has provided the following guidance to panel members: \n{moderator_guidance}\n\n It is time to write your first draft report. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your initial report, please provide a short title that includes 'prc government INITIAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your initial report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your initial report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."
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
            template="You are the prc government expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: You are the PRC Government Expert in a multi-agent system. Focus on the structure, decision-making processes, and key figures within the PRC government.\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. You have been working with a team of experts to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had written the following report: \n{analysis}.\n\n It is time to write a critique of your first draft report. Write your critique, focusing on three main areas for improvement. 1.) CLARIFICATION: Potential clarification of mischaracterizations in the first draft. 2.) INNACCURACIES: Information that is not true or that you suspect may be innaccurate. 3.) FINAL REPORT CONSIDERATIONS: Create a succinct list of specific instructions for corrections or clarifications to incorporate in subsequent drafts of the report. Where appropriate, support your critique with relevant facts and examples found from these relevant documents: \n{documents_text}.\n\n At the start of your critique, please provide a short title that includes 'prc government INITIAL SELF-CRITIQUE on:' and then restate the question/query but paraphrased from your perspective. Your critique should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your critique to better support subsequent drafts of the report."
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
        print("\tINFO: prc government is using this list of experts while choosing collaborators: \n\t"+expert_agents_str)
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
                template="You are the prc government expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: You are the PRC Government Expert in a multi-agent system. Focus on the structure, decision-making processes, and key figures within the PRC government.\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. Your panel has been asked this question/query: \n{question}\n\n You just wrote this report as a first draft attempt to address the question/query: \n{analysis}\n\n You also reviewed your first draft report and provided this self-critique on how to improve it:\n{reflection}\n\n These experts have been selected to collaborate with you to help improve your report with contributions from their expert perspectives: \n{collab_experts}\n\n To direct each expert in how they can best help you improve your report but from the perspective of their expert domain knowledge, create concise instructions for each individual expert on what they should focus on when they draft their collaborative inputs."
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

def prc_government_collaborator(state: GraphState) -> GraphState:
    banner = "\n\n\t---------------------------\n\n\t---prc government COLLABORATOR---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    whoami = "prc_government"
    state_dict = state["keys"]
    question = state_dict["question"]
    last_actor = state_dict["last_actor"]
    # last_actor_reflection = state_dict[last_actor+"_reflection"]
    last_actor_analysis = state_dict[last_actor+"_analysis"]
    collaborator = state_dict["collaborator"]
    #last_actor_collab_request = state_dict[collaborator+"_collab_areas"]
    collab_areas = state_dict["collab_areas"]
    llm = LLMManager().llm

    prompt = PromptTemplate(
        input_variables=["last_actor_analysis", "collab_areas"],
        template="You are the prc government expert in a in a collaborative panel of multi-discipline subject matter experts. Here is your job description: You are the PRC Government Expert in a multi-agent system. Focus on the structure, decision-making processes, and key figures within the PRC government.\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. Your task is to review the report and add to, or rewrite, the areas of the report you were asked to assist with, in order to strengthen the report. You also have access to a set of documents to help you with your task.\n\nReport: {last_actor_analysis}\n\nAreas of the report to improve: {collab_areas}\n\nAnalysis:"
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

def prc_government_requester(state: GraphState) -> GraphState:
    banner = "\n\n\t---------------------------\n\n\t---prc government REQUESTER---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    whoami = "prc_government"
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
            request = f"Here is the feedback from the prc government expert in regards to the analysis generated from the document summery: {agent_reflection}.\n\nPlease consider the expert feedback and retrieve documents that are most related to the question: {question}.\nProvide a summary without embellishment or personal interpertation. Also provide sources or references when possible."

            print(request)

            return {"keys": {**state_dict, "last_actor": whoami, whoami+"_request": request, whoami+"_reflected": True}}
    else:
        request = f"I am the prc government expert in a collaborative panel of multi-discipline subject matter experts. This is my role in the panel: You are the PRC Government Expert in a multi-agent system. Focus on the structure, decision-making processes, and key figures within the PRC government.\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. Please retrieve documents that are most related to this question: {question}. Please retrieve documents that are most related to the question and provide a summary without embellishment or personal interpertation. Also provide sources or references when possible."

        print(request)
    
        return {"keys": {**state_dict, "last_actor": whoami, whoami+"_request": request}}

def prc_government_subgraph_entry(state: ExpertState):
    #This was the requester-->expert logic
    agent_instructions = state['expert']+"_AGENT_INSTRUCTIONS"
    banner = f"\n\n\t---------------------------\n\n\t---{state['expert']} SUBGRAPH ENTRY---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    whoami = state['expert']
    question = state["question"]
    request = f"I am the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. This is my role in the panel: {agent_instructions}\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. Please retrieve documents that are most related to this question: {question}. Please retrieve documents that are most related to the question and provide a summary without embellishment or personal interpertation. Also provide sources or references when possible."
    print(request)
    document_summary, relevant_documents = librarian(whoami, request)
    '''============================================================================='''
    config = load_config()
    llm = LLMManager().llm
    documents_text = "\n\n".join([doc.page_content for doc in relevant_documents])
    moderator_guidance = state[whoami+"_moderator_guidance"]

    banner = f"\n\n\t---------------------------\n\n\t---{whoami}---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    
    prompt = PromptTemplate(
            input_variables=["question", "document_summary", "relevant_docs", "moderator_guidance","whoami","PRC_GOVERNMENT_AGENT_INSTRUCTIONS"],
            template="You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions}\n\n The panel has been asked this question/query: \n{question}\n\n A moderator for your panel has provided the following guidance to panel members: \n{moderator_guidance}\n\n It is time to write your first draft report. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your initial report, please provide a short title that includes '{whoami} INITIAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your initial report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your initial report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."
    )

    chain = prompt | llm | StrOutputParser()

    analysis = chain.invoke({
        "question": question,
        "document_summary": document_summary,
        "relevant_docs": documents_text,
        "moderator_guidance": moderator_guidance,
        "whoami": whoami,
        "agent_instructions": agent_instructions
    })

    print("\n\t------\n\t---INITIAL REFLECTION---\n\t------\n")
    reflection_prompt = PromptTemplate(
        input_variables=["question", "analysis", "documents_text","whoami","agent_instructions"],
        template="You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions}\n\n You have been working with a team of experts to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had written the following report: \n{analysis}.\n\n It is time to write a critique of your first draft report. Write your critique, focusing on three main areas for improvement. 1.) CLARIFICATION: Potential clarification of mischaracterizations in the first draft. 2.) INNACCURACIES: Information that is not true or that you suspect may be innaccurate. 3.) FINAL REPORT CONSIDERATIONS: Create a succinct list of specific instructions for corrections or clarifications to incorporate in subsequent drafts of the report. Where appropriate, support your critique with relevant facts and examples found from these relevant documents: \n{documents_text}.\n\n At the start of your critique, please provide a short title that includes 'prc government INITIAL SELF-CRITIQUE on:' and then restate the question/query but paraphrased from your perspective. Your critique should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your critique to better support subsequent drafts of the report."
    )

    chain = reflection_prompt | llm | StrOutputParser()
    reflection = chain.invoke({
        "question": question,
        "analysis": analysis,
        "documents_text": documents_text,
        "whoami": whoami,
        "agent_instructions": agent_instructions
    })

    print("\n\t------\n\t---REQUEST COLLABORATION---\n\t------\n")
    expert_agents = config["EXPERT_AGENTS"]
    expert_agents.remove(whoami)
    expert_agents_str = "\n".join(f"- {expert}" for expert in expert_agents)
    print("\tINFO: {whoami} is using this list of experts while choosing collaborators: \n\t"+expert_agents_str)
    #TODO: zip experts and their area of expertise together and pass, instead of just passing the list of experts
    collaborators = determine_collaboration(reflection, analysis, expert_agents_str)
    print("\n\n\n")
    print(collaborators)
    print("\n\n\n")

    if collaborators:
        prompt = PromptTemplate(
            input_variables=["question", "analysis", "reflection", "collab_experts","whoami","agent_instructions"],
            template="You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions}\n\n Your panel has been asked this question/query: \n{question}\n\n You just wrote this report as a first draft attempt to address the question/query: \n{analysis}\n\n You also reviewed your first draft report and provided this self-critique on how to improve it:\n{reflection}\n\n These experts have been selected to collaborate with you to help improve your report with contributions from their expert perspectives: \n{collab_experts}\n\n To direct each expert in how they can best help you improve your report but from the perspective of their expert domain knowledge, create concise instructions for each individual expert on what they should focus on when they draft their collaborative inputs."
        )

        collab_experts_str = ", ".join(f"{expert}" for expert in collaborators)

        chain = prompt | llm | StrOutputParser()
        collab_areas = chain.invoke({
            "question": question,
            "analysis": analysis,
            "reflection": reflection,
            "collab_experts": collab_experts_str,
            "whoami": whoami,
            "agent_instructions": agent_instructions
        })

        return { whoami+"_analysis": analysis, whoami+"_reflection": reflection, whoami+"_collab_areas": collab_areas, whoami+"_collaborators_list": collaborators}
    return {whoami+"_analysis": analysis, whoami+"_reflection": reflection}