from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from multiagent.graphState import GraphState, ExpertState, CollabState
from config import load_config
from utils.shared_state import shared_state
from multiagent.agents.helpers import determine_collaboration
from multiagent.llm_manager import LLMManager
from multiagent.agents.librarian_agent import librarian
import time

PRC_GOVERNMENT_AGENT_INSTRUCTIONS = """You are the PRC Government Expert in a multi-agent system. Focus on the structure, decision-making processes, and key figures within the PRC government.\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents."""
DOMESTIC_STABILITY_AGENT_INSTRUCTIONS = """You are the Domestic Stability expert in a multi-agent system.\n\nEvaluate internal social, demographic, and political factors in the PRC. \n\nYour task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Explain how domestic issues influence PRC\'s approach to the query topic. \n2. Discuss relevant public opinion trends, ethnic tensions, or domestic challenges.\n3. Analyze how internal stability concerns affect PRC\'s decision-making. \n4. Identify any recent domestic developments that impact the issue. Provide specific examples from the documents of domestic factors and their effects."""
GLOBAL_INFLUENCE_AGENT_INSTRUCTIONS = """You are the Global Influence Expert in a multi-agent system. Track the PRC\'s efforts to expand its global influence. Your task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Assess the impact of PRC\'s global initiatives on the issue in the query. \n2. Discuss relevant diplomatic efforts, investments, or soft power initiatives. \n3. Analyze how PRC\'s actions affect international institutions and norms. \n4. Identify any global trends or reactions that influence PRC\'s approach. Use concrete examples from the documents of PRC\'s global activities and their outcomes."""
PRC_ECONOMIC_EXPERT_INSTRUCTIONS = """You are the PRC Economic Expert in a multi-agent system. Focus on the PRC\'s economic policies, trade relationships, and industrial strategies. \n\nYour analysis should \n1. Predict economic actions and their geopolitical implications relevant to the query. \n2. Explain how economic factors influence PRC\'s approach to the issue at hand.\n3. Provide data on relevant economic indicators, trade patterns, or industrial policies.\n4. Discuss any recent economic initiatives or shifts that relate to the user\'s question. Use specific economic data and examples from the documents to support your points. Your task is to use the moderator guidance and provided documents to answer the question."""
PRC_MILITARY_EXPERT_INSTRUCTIONS = """You are the PRC Military Expert in a multi-agent system. Concentrate on the capabilities, doctrine, and strategic objectives of the People\'s Liberation Army (PLA).\n\nYour task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Assess potential military actions or responses related to the query. \n2. Provide details on relevant military capabilities, technologies, or strategies. \n3. Explain how military considerations influence PRC\'s approach to the issue at hand. \n4. Discuss any recent military developments or exercises relevant to the query. Provide concrete examples and data from the documents to support your analysis."""
REGIONAL_DYNAMICS_EXPERT_INSTRUCTIONS = """You are the Regional Dynamics Expert in a multi-agent system. Examine the PRC\'s relationships with neighboring countries and regional powers.\n\nYour task is to use the moderator guidance and provided documents to answer the question.\n\nYour analysis should\n1. Explain how regional dynamics affect PRC\'s approach to the issue in the query.\n2. Discuss relevant historical context, territorial disputes, or shifting alliances. \n3. Analyze the positions and potential reactions of key regional players. \n4. Identify any recent regional developments or agreements that impact the issue. Provide specific examples of regional interactions from the documents and their implications."""
TECHNOLOGY_INNOVATION_EXPERT_INSTRUCTIONS = """You are the Technology and Innovation Expert in a multi-agent system. Monitor the PRC\'s advancements in key technologies.\n\nYour task is to use the moderator guidance and provided documents to answer the question.\n\nYour analysis should\n1. Explain how technological factors relate to the issue in the query.\n2. Provide details on relevant advancements in AI, quantum computing, biotechnology, etc.\n3. Assess potential military and economic applications of these technologies.\n4. Discuss any recent technological developments or initiatives that relate to the user\'s question. Provide specific examples and data from the documents to support your analysis."""

def expert_subgraph_report(state: ExpertState):
    banner = "\n\n\t---------------------------\n\n\t---prc government AFTER REFLECTION & COLLABORATION---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    config = load_config()
    llm = LLMManager().llm
    whoami = state['expert']
    agent_instructions = whoami+"_AGENT_INSTRUCTIONS"
    old_analysis = state['expert_analysis'][whoami]
    critique = state['expert_reflection'][whoami]
    collaborators = state['expert_collaborators_list'][whoami]
    question = state['question']
    #Librarian request
    request = f"I am the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. This is my role in the panel: {agent_instructions}\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. Please retrieve documents that are most related to this question: {question}. Please retrieve documents that are most related to the question and provide a summary without embellishment or personal interpertation. Also provide sources or references when possible."
    #print(request)
    document_summary, relevant_documents = librarian(whoami, request)
    print("passed librarian")
    if collaborators:
        collab_report = "\n\t".join(f"- {collaborator}: {next((entry['report'] for entry in state['expert_collaborator_analysis'] if entry['name'] == whoami and entry['expert'] == collaborator), '')}" for collaborator in collaborators)
        print(collab_report)
        prompt = PromptTemplate(
            input_variables=["old_analysis", "critique", "question", "document_summary", "relevant_docs", "collab_report","agent_instructions", "whoami"],
            template="You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions} You have been working with a team of experts to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had previously written the following report:\n{old_analysis}\n\n Here is feedback you received on how to improve on your first draft report: \n{critique}\n\n You also collaborated with other subject matter experts, and they provided the following feedback and suggestions to improve your report from their expert perspective: \n{collab_report}\n\n It is time to write your final report. While your focus is to speak to your own expertise, please remember to consider and incorporate the feedback and collaborative inputs of the perspectives from the other experts. Be sure not to simply rewrite your previous report. As appropriate, briefly site where you incorporated the inputs from the other experts. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your report, please provide a short title that includes 'prc government FINAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your final report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."
        )

        chain = prompt | llm | StrOutputParser()
        analysis = chain.invoke({
            "old_analysis": old_analysis,
            "critique": critique,
            "question": question,
            "document_summary": document_summary,
            "relevant_docs": relevant_documents,
            "collab_report": collab_report,
            "whoami": whoami,
            "agent_instructions": agent_instructions
        })
        print("finished with collab")
    else:
        prompt = PromptTemplate(
            input_variables=["old_analysis", "critique", "question", "document_summary", "relevant_docs", "whoami", "agent_instructions"],
            template="You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions} You have been working to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had previously written the following report:\n{old_analysis}\n\n Here is feedback you received on how to improve on your first draft report: \n{critique}\n\n It is time to write your final report. Your focus should be to speak from your own expertise. Be sure not to simply rewrite your previous report. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your report, please provide a short title that includes 'prc government FINAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your final report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."
        )   
    
        chain = prompt | llm | StrOutputParser()
        analysis = chain.invoke({
            "old_analysis": old_analysis,
            "critique": critique,
            "question": question,
            "document_summary": document_summary,
            "relevant_docs": relevant_documents,
            "whoami": whoami,
            "agent_instructions": agent_instructions
        })
        print("finished with no collab")

    shared_state.CONVERSATION += f"\t---{whoami} Analysis {shared_state.ITERATION}: {analysis},\n\n"
    print("passed final analysis")
    return {'expert_final_analysis': {whoami: analysis}}

def collab_subgraph_entry(state: CollabState):
    banner = f"\n\n\t---------------------------\n\n\t---{state['expert']} Collaborator ENTRY---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    agent_instructions = state['collaborator']+"_AGENT_INSTRUCTIONS"
    my_expert = state['expert']
    whoami = state['collaborator']
    print(my_expert + '\n\n\n-----\n\n\n' + whoami)
    # my_expert_analysis = next(
    #         analysis[my_expert] 
    #         for analysis in state['expert_analysis'] 
    #         if my_expert in analysis
    #     )
    my_expert_analysis = state['expert_analysis'][my_expert]
    collab_areas = state['expert_collab_areas'][my_expert]
    #Librarian request
    request = f"Here is a report from {my_expert}:\n{my_expert_analysis}\n\nPlease consider the following areas that need work when retrieving documents:\n{collab_areas}\n\nProvide a summary without embellishment or personal interpertation. Also provide sources or references when possible."
    #print(request)
    document_summary, relevant_documents = librarian(whoami, request)

    banner = f"\n\n\t---------------------------\n\n\t---{whoami} COLLABORATOR---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    llm = LLMManager().llm
    prompt = PromptTemplate(
        input_variables=["my_expert_analysis", "collab_areas", "agent_instructions", "whoami"],
        template="You are the {whoami} expert in a in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions}\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. Your task is to review the report and add to, or rewrite, the areas of the report you were asked to assist with, in order to strengthen the report. You also have access to a set of documents to help you with your task.\n\nReport: {my_expert_analysis}\n\nAreas of the report to improve: {collab_areas}\n\nAnalysis:"
    )

    chain = prompt | llm | StrOutputParser()
    collab_report = chain.invoke({
        "my_expert_analysis": my_expert_analysis,
        "collab_areas": collab_areas,
        "agent_instructions": agent_instructions,
        "whoami": whoami
    })
    print(collab_report)
    return {'expert_collaborator_analysis':[{"report":collab_report, "name":whoami, "expert":my_expert}]}

def expert_subgraph_entry(state: ExpertState):
    #This was the requester-->expert logic
    
    banner = f"\n\n\t---------------------------\n\n\t---{state['expert']} SUBGRAPH ENTRY---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    # Get the expert state from expert_data where name matches state['expert']
    whoami = state['expert']
    agent_instructions = whoami+"_AGENT_INSTRUCTIONS"
    question = state['question']
    banner = f"\n\n\t---------------------------\n\n\t---{whoami} LIBRARIAN REQUEST---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    #Librarian request
    request = f"I am the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. This is my role in the panel: {agent_instructions}\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.. Please retrieve documents that are most related to this question: {question}. Please retrieve documents that are most related to the question and provide a summary without embellishment or personal interpertation. Also provide sources or references when possible."
    document_summary, relevant_documents = librarian(whoami, request)
    #Expert analysis -- Initial report
    banner = f"\n\n\t---------------------------\n\n\t---{whoami} INITIAL REPORT---\n\n\t---------------------------\n\n\t"
    print(banner.upper())
    config = load_config()
    llm = LLMManager().llm
    documents_text = "\n\n".join([doc.page_content for doc in relevant_documents])
    moderator_guidance=state['expert_moderator_guidance'][whoami]   
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
    print(whoami + '\n\n\n-----\n\n\n' + str(time.time()))
    print(f"\n\t------\n\t---{whoami} INITIAL REFLECTION---\n\t------\n")
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

    print(f"\n\t------\n\t---{whoami} REQUEST COLLABORATION---\n\t------\n")
    expert_agents = config["EXPERT_AGENTS"]
    expert_agents.remove(whoami)
    expert_agents_str = "\n".join(f"- {expert}" for expert in expert_agents)
    print(f"\tINFO: {whoami} is using this list of experts while choosing collaborators: \n\t"+expert_agents_str)
    #TODO: zip experts and their area of expertise together and pass, instead of just passing the list of experts
    collaborators = determine_collaboration(reflection, analysis, expert_agents_str)
    #print("\n\n\n")
    #print(collaborators)
    #print("\n\n\n")
    #Request collaboration instructions for the individuals
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
        return{'expert_analysis': {whoami: analysis}, 'expert_reflection': {whoami: reflection}, 'expert_collab_areas': {whoami: collab_areas}, 'expert_collaborators_list': {whoami: collaborators}}
    return {'expert_analysis': {whoami: analysis}, 'expert_reflection': {whoami: reflection}}