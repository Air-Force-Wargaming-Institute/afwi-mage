from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from multiagent.graphState import GraphState, ExpertState, CollabState
from config import load_config
from multiagent.agents.helpers import determine_collaboration, create_banner
from multiagent.llm_manager import LLMManager
from multiagent.agents.librarian_agent import librarian
import time

# Expert agent instructions
PRC_GOVERNMENT_AGENT_INSTRUCTIONS = """You are the PRC Government Expert in a multi-agent system. Focus on the structure, decision-making processes, and key figures within the PRC government.\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents."""

DOMESTIC_STABILITY_AGENT_INSTRUCTIONS = """You are the Domestic Stability expert in a multi-agent system.\n\nEvaluate internal social, demographic, and political factors in the PRC. \n\nYour task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Explain how domestic issues influence PRC\'s approach to the query topic. \n2. Discuss relevant public opinion trends, ethnic tensions, or domestic challenges.\n3. Analyze how internal stability concerns affect PRC\'s decision-making. \n4. Identify any recent domestic developments that impact the issue. Provide specific examples from the documents of domestic factors and their effects."""

GLOBAL_INFLUENCE_AGENT_INSTRUCTIONS = """You are the Global Influence Expert in a multi-agent system. Track the PRC\'s efforts to expand its global influence. Your task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Assess the impact of PRC\'s global initiatives on the issue in the query. \n2. Discuss relevant diplomatic efforts, investments, or soft power initiatives. \n3. Analyze how PRC\'s actions affect international institutions and norms. \n4. Identify any global trends or reactions that influence PRC\'s approach. Use concrete examples from the documents of PRC\'s global activities and their outcomes."""

PRC_ECONOMIC_EXPERT_INSTRUCTIONS = """You are the PRC Economic Expert in a multi-agent system. Focus on the PRC\'s economic policies, trade relationships, and industrial strategies. \n\nYour analysis should \n1. Predict economic actions and their geopolitical implications relevant to the query. \n2. Explain how economic factors influence PRC\'s approach to the issue at hand.\n3. Provide data on relevant economic indicators, trade patterns, or industrial policies.\n4. Discuss any recent economic initiatives or shifts that relate to the user\'s question. Use specific economic data and examples from the documents to support your points. Your task is to use the moderator guidance and provided documents to answer the question."""

PRC_MILITARY_EXPERT_INSTRUCTIONS = """You are the PRC Military Expert in a multi-agent system. Concentrate on the capabilities, doctrine, and strategic objectives of the People\'s Liberation Army (PLA).\n\nYour task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Assess potential military actions or responses related to the query. \n2. Provide details on relevant military capabilities, technologies, or strategies. \n3. Explain how military considerations influence PRC\'s approach to the issue at hand. \n4. Discuss any recent military developments or exercises relevant to the query. Provide concrete examples and data from the documents to support your analysis."""

REGIONAL_DYNAMICS_EXPERT_INSTRUCTIONS = """You are the Regional Dynamics Expert in a multi-agent system. Examine the PRC\'s relationships with neighboring countries and regional powers.\n\nYour task is to use the moderator guidance and provided documents to answer the question.\n\nYour analysis should\n1. Explain how regional dynamics affect PRC\'s approach to the issue in the query.\n2. Discuss relevant historical context, territorial disputes, or shifting alliances. \n3. Analyze the positions and potential reactions of key regional players. \n4. Identify any recent regional developments or agreements that impact the issue. Provide specific examples of regional interactions from the documents and their implications."""

TECHNOLOGY_INNOVATION_EXPERT_INSTRUCTIONS = """You are the Technology and Innovation Expert in a multi-agent system. Monitor the PRC\'s advancements in key technologies.\n\nYour task is to use the moderator guidance and provided documents to answer the question.\n\nYour analysis should\n1. Explain how technological factors relate to the issue in the query.\n2. Provide details on relevant advancements in AI, quantum computing, biotechnology, etc.\n3. Assess potential military and economic applications of these technologies.\n4. Discuss any recent technological developments or initiatives that relate to the user\'s question. Provide specific examples and data from the documents to support your analysis."""

def get_librarian_request(whoami: str, question: str, agent_instructions: str, context: str = "") -> str:
    """Generate a librarian request with optional context."""
    base_request = f"""I am the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. 
    This is my role in the panel: {agent_instructions}
    
    Your task is to use the moderator guidance and provided documents to answer the question: {question}."""
    
    if context:
        base_request += f"\n\nAdditional context:\n{context}"
    
    return base_request + "\n\nPlease retrieve documents that are most related to the question and provide a summary without embellishment or personal interpretation. Also provide sources or references when possible."

def create_chain(prompt: PromptTemplate, **kwargs) -> str:
    """Create and execute a language model chain."""
    llm = LLMManager().llm
    chain = prompt | llm | StrOutputParser()
    return chain.invoke(kwargs)

def process_collaborator_feedback(state: ExpertState, whoami: str) -> tuple[str, PromptTemplate]:
    """Process collaborator feedback and return appropriate prompt."""
    collaborators = state['expert_collaborators_list'][whoami]
    if not collaborators:
        return "", create_final_report_prompt(with_collab=False)
    
    collab_report = "\n\t".join([
        f"- {collaborator}: {next((entry['report'] for entry in state['expert_collaborator_analysis'] if entry['name'] == whoami and entry['expert'] == collaborator), '')}"
        for collaborator in collaborators
    ])
    
    return collab_report, create_final_report_prompt(with_collab=True)

def create_final_report_prompt(with_collab: bool) -> PromptTemplate:
    """Create the appropriate final report prompt template."""
    variables = ["old_analysis", "critique", "question", "document_summary", "relevant_docs", "whoami", "agent_instructions"]
    
    if not with_collab:
        template = """You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions} You have been working to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had previously written the following report:\n{old_analysis}\n\n Here is feedback you received on how to improve on your first draft report: \n{critique}\n\n It is time to write your final report. Your focus should be to speak from your own expertise. Be sure not to simply rewrite your previous report. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your report, please provide a short title that includes '{whoami} FINAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your final report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."""
    else:
        variables.append("collab_report")
        template = """You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions} You have been working with a team of experts to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had previously written the following report:\n{old_analysis}\n\n Here is feedback you received on how to improve on your first draft report: \n{critique}\n\n You also collaborated with other subject matter experts, and they provided the following feedback and suggestions to improve your report from their expert perspective: \n{collab_report}\n\n It is time to write your final report. While your focus is to speak to your own expertise, please remember to consider and incorporate the feedback and collaborative inputs of the perspectives from the other experts. Be sure not to simply rewrite your previous report. As appropriate, briefly site where you incorporated the inputs from the other experts. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your report, please provide a short title that includes '{whoami} FINAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your final report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."""
    
    return PromptTemplate(input_variables=variables, template=template)

def create_initial_report_prompt() -> PromptTemplate:
    """Create the initial report prompt template."""
    return PromptTemplate(
        input_variables=["question", "document_summary", "relevant_docs", "moderator_guidance", "whoami", "agent_instructions"],
        template="""You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions}\n\n The panel has been asked this question/query: \n{question}\n\n A moderator for your panel has provided the following guidance to panel members: \n{moderator_guidance}\n\n It is time to write your first draft report. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your initial report, please provide a short title that includes '{whoami} INITIAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your initial report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your initial report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query."""
    )

def create_reflection_prompt() -> PromptTemplate:
    """Create the reflection prompt template."""
    return PromptTemplate(
        input_variables=["question", "analysis", "documents_text", "whoami", "agent_instructions"],
        template="""You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions}\n\n You have been working with a team of experts to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had written the following report: \n{analysis}.\n\n It is time to write a critique of your first draft report. Write your critique, focusing on three main areas for improvement. 1.) CLARIFICATION: Potential clarification of mischaracterizations in the first draft. 2.) INNACCURACIES: Information that is not true or that you suspect may be innaccurate. 3.) FINAL REPORT CONSIDERATIONS: Create a succinct list of specific instructions for corrections or clarifications to incorporate in subsequent drafts of the report. Where appropriate, support your critique with relevant facts and examples found from these relevant documents: \n{documents_text}.\n\n At the start of your critique, please provide a short title that includes '{whoami} INITIAL SELF-CRITIQUE on:' and then restate the question/query but paraphrased from your perspective. Your critique should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your critique to better support subsequent drafts of the report."""
    )

def create_collaboration_prompt() -> PromptTemplate:
    """Create the collaboration prompt template."""
    return PromptTemplate(
        input_variables=["question", "analysis", "reflection", "collab_experts", "whoami", "agent_instructions"],
        template="""You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions}\n\n Your panel has been asked this question/query: \n{question}\n\n You just wrote this report as a first draft attempt to address the question/query: \n{analysis}\n\n You also reviewed your first draft report and provided this self-critique on how to improve it:\n{reflection}\n\n These experts have been selected to collaborate with you to help improve your report with contributions from their expert perspectives: \n{collab_experts}\n\n To direct each expert in how they can best help you improve your report but from the perspective of their expert domain knowledge, create concise instructions for each individual expert on what they should focus on when they draft their collaborative inputs."""
    )

def expert_subgraph_report(state: ExpertState):
    """Generate final expert report after reflection and collaboration."""
    print(create_banner(f"{state['expert']} AFTER REFLECTION & COLLABORATION").upper())
    
    whoami = state['expert']
    agent_instructions = whoami + "_AGENT_INSTRUCTIONS"
    
    # Get document summary
    request = get_librarian_request(whoami, state['question'], agent_instructions)
    document_summary, relevant_documents = librarian(whoami, request)
    
    # Process collaborator feedback
    collab_report, prompt = process_collaborator_feedback(state, whoami)
    
    # Generate final analysis
    analysis_inputs = {
        "old_analysis": state['expert_analysis'][whoami],
        "critique": state['expert_reflection'][whoami],
        "question": state['question'],
        "document_summary": document_summary,
        "relevant_docs": relevant_documents,
        "whoami": whoami,
        "agent_instructions": agent_instructions
    }
    if collab_report:
        analysis_inputs["collab_report"] = collab_report
    
    analysis = create_chain(prompt, **analysis_inputs)
    
    return {'expert_final_analysis': {whoami: analysis}}

def collab_subgraph_entry(state: CollabState):
    print(create_banner(f"{state['expert']} - {state['collaborator']} COLLABORATOR ENTRY"))
    """Process collaboration entry point for experts."""
    whoami = state['collaborator']
    my_expert = state['expert']
    
    # Get document summary with collaboration context
    context = f"Report from {my_expert}:\n{state['expert_analysis'][my_expert]}\nAreas needing work:\n{state['expert_collab_areas'][my_expert]}"
    request = get_librarian_request(whoami, "", whoami + "_AGENT_INSTRUCTIONS", context)
    document_summary, relevant_documents = librarian(whoami, request)
    
    # Generate collaboration analysis
    prompt = PromptTemplate(
        input_variables=["my_expert_analysis", "collab_areas", "agent_instructions", "whoami", "document_summary", "relevant_docs"],
        template="""You are the {whoami} expert in a in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions}\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n Your task is to review the report and add to, or rewrite, the areas of the report you were asked to assist with, in order to strengthen the report. You also have access to a set of documents to help you with your task.\n\nReport: {my_expert_analysis}\n\nAreas of the report to improve: {collab_areas}\n\nAnalysis:"""
    )
    
    collab_report = create_chain(
        prompt,
        my_expert_analysis=state['expert_analysis'][my_expert],
        collab_areas=state['expert_collab_areas'][my_expert],
        agent_instructions=whoami + "_AGENT_INSTRUCTIONS",
        whoami=whoami,
        document_summary=document_summary,
        relevant_docs=relevant_documents
    )
    
    return {'expert_collaborator_analysis': [{"report": collab_report, "name": whoami, "expert": my_expert}]}

def expert_subgraph_entry(state: ExpertState):
    """Initial entry point for expert analysis."""
    whoami = state['expert']
    print(create_banner(f"{whoami} SUBGRAPH ENTRY").upper())
    
    # Get initial document summary
    agent_instructions = whoami + "_AGENT_INSTRUCTIONS"
    request = get_librarian_request(whoami, state['question'], agent_instructions)
    document_summary, relevant_documents = librarian(whoami, request)
    
    # Generate initial analysis
    documents_text = "\n\n".join([doc.page_content for doc in relevant_documents])
    initial_prompt = create_initial_report_prompt()
    
    analysis = create_chain(
        initial_prompt,
        question=state['question'],
        document_summary=document_summary,
        relevant_docs=documents_text,
        moderator_guidance=state['expert_moderator_guidance'][whoami],
        whoami=whoami,
        agent_instructions=agent_instructions
    )
    
    # Generate reflection
    reflection = create_chain(
        create_reflection_prompt(),
        question=state['question'],
        analysis=analysis,
        documents_text=documents_text,
        whoami=whoami,
        agent_instructions=agent_instructions
    )
    
    # Determine collaborators
    expert_agents = load_config()["EXPERT_AGENTS"]
    expert_agents.remove(whoami)
    expert_agents_str = "\n".join(f"- {expert}" for expert in expert_agents)
    collaborators = determine_collaboration(reflection, analysis, expert_agents_str)
    
    result = {
        'expert_analysis': {whoami: analysis},
        'expert_reflection': {whoami: reflection}
    }
    
    if collaborators:
        collab_areas = create_chain(
            create_collaboration_prompt(),
            question=state['question'],
            analysis=analysis,
            reflection=reflection,
            collab_experts=", ".join(collaborators),
            whoami=whoami,
            agent_instructions=agent_instructions
        )
        result.update({
            'expert_collab_areas': {whoami: collab_areas},
            'expert_collaborators_list': {whoami: collaborators}
        })
    
    return result