from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from multiagent.graphState import ExpertState, CollabState
from multiagent.agents.helpers import determine_collaboration, create_banner
from utils.llm_manager import LLMManager
from multiagent.agents.librarian_agent import librarian
from utils.prompt_manager import SystemPromptManager
def get_librarian_request(whoami: str, question: str, agent_instructions: str, context: str = "") -> str:
    """Generate a librarian request with optional context."""
    base_request = f"""I am the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. 
    This is my role in the panel: {agent_instructions}
    
    Your task is to use the moderator guidance and provided documents to answer the question: {question}."""
    
    if context:
        base_request += f"\n\nAdditional context:\n{context}"
    
    return base_request + "\n\nPlease retrieve documents that are most related to the question and provide a summary without embellishment or personal interpretation. Also provide sources or references when possible."

def create_chain(prompt: PromptTemplate, model: str = None, **kwargs) -> str:
    """Create and execute a language model chain."""
    llm = LLMManager().get_llm(model)
    chain = prompt | llm | StrOutputParser()
    return chain.invoke(kwargs)

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
    agent_instructions = state['expert_instructions'][whoami]
    
    # Get document summary
    request = get_librarian_request(whoami, state['question'], agent_instructions)
    document_summary, relevant_documents = librarian(whoami, request)
    
    
    collaborators = state['expert_collaborators_list'][whoami]
    if not collaborators:
        collab_report = ""
        prompt =SystemPromptManager().get_prompt_template("Expert_Final_Report_no_collab")
    
    else:
        collab_report = "\n\t".join([
            f"- {collaborator}: {next((entry['report'] for entry in state['expert_collaborator_analysis'] if entry['name'] == whoami and entry['expert'] == collaborator), '')}"
            for collaborator in collaborators
        ])
        prompt = SystemPromptManager().get_prompt_template("Expert_Final_Report")
    
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
    
    analysis = create_chain(prompt,model=state['expert_models'][whoami], **analysis_inputs)
    
    return {'expert_final_analysis': {whoami: analysis}}

def collab_subgraph_entry(state: CollabState):
    print(create_banner(f"{state['expert']} - {state['collaborator']} COLLABORATOR ENTRY"))
    """Process collaboration entry point for experts."""
    whoami = state['collaborator']
    my_expert = state['expert']
    
    # Get document summary with collaboration context
    context = f"Report from {my_expert}:\n{state['expert_analysis'][my_expert]}\nAreas needing work:\n{state['expert_collab_areas'][my_expert]}"
    request = get_librarian_request(whoami, "", state['expert_instructions'][whoami], context)
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
        agent_instructions=state['expert_instructions'][whoami],
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
    agent_instructions = state['expert_instructions'][whoami]
    request = get_librarian_request(whoami, state['question'], agent_instructions)
    document_summary, relevant_documents = librarian(whoami, request)
    
    # Generate initial analysis
    documents_text = "\n\n".join([doc.page_content for doc in relevant_documents])
    initial_prompt = create_initial_report_prompt()
    
    analysis = create_chain(
        initial_prompt,
        model=state['expert_models'][whoami],
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
        model=state['expert_models'][whoami],
        question=state['question'],
        analysis=analysis,
        documents_text=documents_text,
        whoami=whoami,
        agent_instructions=agent_instructions
    )
    
    # Determine collaborators
    expert_agents_withoutme = state['expert_list']
    expert_agents_withoutme.remove(whoami)
    collaborators = determine_collaboration(reflection, analysis, expert_agents_withoutme)
    
    result = {
        'expert_analysis': {whoami: analysis},
        'expert_reflection': {whoami: reflection}
    }
    
    if collaborators:
        collab_areas = create_chain(
            create_collaboration_prompt(),
            model=state['expert_models'][whoami],
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
    else:
        result.update({
            'expert_collab_areas': {whoami: ""},
            'expert_collaborators_list': {whoami: []}
        })
    
    return result