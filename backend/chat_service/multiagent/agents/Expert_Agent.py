from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from multiagent.graphState import ExpertState, CollabState
from multiagent.agents.helpers import determine_collaboration, create_banner
from utils.llm_manager import LLMManager
from multiagent.agents.librarian_agent import librarian
import copy
import logging
import asyncio
from utils.conversation_manager import ConversationManager

logger = logging.getLogger(__name__)

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
        template = """You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions} You have been working to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had previously written the following report:\n{old_analysis}\n\n Here is feedback you received on how to improve on your first draft report: \n{critique}\n\n It is time to write your final report. Your focus should be to speak from your own expertise. Be sure not to simply rewrite your previous report. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your report, please provide a short title that includes '{whoami} FINAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your final report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query. Format your report using Markdown."""
    else:
        variables.append("collab_report")
        template = """You are the {whoami} expert in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions} You have been working with a team of experts to write a report from your expert perspective on the following question/query:\n{question}\n\n In your first draft attempt to address the question, you had previously written the following report:\n{old_analysis}\n\n Here is feedback you received on how to improve on your first draft report: \n{critique}\n\n You also collaborated with other subject matter experts, and they provided the following feedback and suggestions to improve your report from their expert perspective: \n{collab_report}\n\n It is time to write your final report. While your focus is to speak to your own expertise, please remember to consider and incorporate the feedback and collaborative inputs of the perspectives from the other experts. Be sure not to simply rewrite your previous report. As appropriate, briefly site where you incorporated the inputs from the other experts. To help you, some information was retrieved from relevant documentation. Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n At the start of your report, please provide a short title that includes '{whoami} FINAL REPORT on:' and then restate the question/query but paraphrased from your perspective. Then, write your final report using a military white paper structure that includes the following sections: 'Bottom Line Up Front:' (1-3 sentences that summarize the main points/considerations of the report), 'Background Information:' (detailed summary of the relevant information, ideas, and facts that provide the reader with context for the report's main points/considerations), 'Discussion:' (detailed discussion of the main points/considerations that are relevant to the question/query), and 'Conclusion/Recommendations:' (Final thoughts and recommendations that address the question/query). Your final report should be well organized, thorough, and comprehensive. Do not embellish or exaggerate. Where appropriate, be sure to cite sources and provide specific examples from the documents that were given to you as you draft your report to address the question/query. Format your report using Markdown."""
    
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
    logger.info(create_banner(f"{state['expert']} AFTER REFLECTION & COLLABORATION").upper())
    
    whoami = state['expert']
    vs = state['vectorstore']
    agent_instructions = state['expert_instructions'][whoami]
    
    # Get conversation manager
    conversation_manager = ConversationManager()
    session_id = state.get('session_id')
    expert_node_id = None
    conversation_id = None

    # Get or create conversation based on session_id
    if session_id:
        logger.info(f"Session ID: {session_id}")
        try:
            # Try to get the latest conversation for this session
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            conversation_id = loop.run_until_complete(
                conversation_manager.get_latest_conversation_id(session_id)
            )
            loop.close()
            
            if not conversation_id:
                logger.info(f"No existing conversation, creating a new one")
                # No existing conversation, create a new one
                conversation_id = conversation_manager.create_conversation_sync(
                    question=state['question'],
                    session_id=session_id,
                    team_id=state.get('team_id', 'unknown')
                )
                logger.info(f"Created new conversation: {conversation_id}")
            else:
                logger.info(f"Using existing conversation: {conversation_id}")
                # Load the conversation
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                conversation = loop.run_until_complete(
                    conversation_manager.get_conversation(conversation_id)
                )
                loop.close()

                if conversation:
                    # First, find the expert node
                    for node_id, node in conversation.nodes.items():
                        if node.role == 'expert' and node.name == whoami:
                            expert_node_id = node_id
                            logger.info(f"Found expert node for {whoami}: {expert_node_id}")
                            break
                logger.info(f"Using existing conversation: {conversation_id}")
        except Exception as e:
            logger.error(f"Error setting up conversation: {e}")

    # Get document summary
    request = get_librarian_request(whoami, state['question'], agent_instructions)
    
    try:
        document_summary, relevant_documents = librarian(whoami, request, vs)
    except Exception as e:
        logger.error(f"Error retrieving documents: {e}", exc_info=True)
        document_summary = f"No relevant documents found for {whoami}'s request: {request}"
        relevant_documents = []
    
    # Record librarian interaction
    if expert_node_id and conversation_id:
        try:
            conversation_manager.add_interaction_sync(
                conversation_id,
                expert_node_id,
                prompt=request,
                response=document_summary,
                prompt_name="librarian_request",
                model="librarian"
            )
        except Exception as e:
            logger.error(f"Error recording librarian interaction: {e}")

    # Process collaborator feedback
    collab_report, prompt_template = process_collaborator_feedback(state, whoami)
    
    # Generate final analysis
    analysis_inputs = {
        "old_analysis": state['expert_analysis'][whoami],
        "critique": state['expert_reflection'][whoami],
        "question": state['question'],
        "document_summary": document_summary,
        "relevant_docs": "\n\n".join([doc.page_content for doc in relevant_documents]),
        "whoami": whoami,
        "agent_instructions": agent_instructions
    }
    if collab_report:
        analysis_inputs["collab_report"] = collab_report
    
    # Format the prompt with actual values
    formatted_prompt = prompt_template.format(**analysis_inputs)
    
    #logger.info(f"Expert {whoami} model: {state['expert_models'][whoami]}")
    analysis = create_chain(
        prompt_template,
        model=state['expert_models'][whoami],
        **analysis_inputs
    )
    #logger.info(f"Expert {whoami} final analysis: {analysis}")
    
    # Record expert final analysis interaction
    if expert_node_id and conversation_id:
        try:
            conversation_manager.add_interaction_sync(
                conversation_id,
                expert_node_id,
                prompt=formatted_prompt,
                response=analysis,
                prompt_name="expert_final_analysis",
                model=state['expert_models'].get(whoami, "default_model")
            )
            
            # Set final analysis for the expert node
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                conversation_manager.set_final_analysis(
                    conversation_id,
                    expert_node_id,
                    analysis
                )
            )
            loop.close()
            
        except Exception as e:
            logger.error(f"Error recording expert final analysis: {e}")

    return {'expert_final_analysis': {whoami: analysis}}

def collab_subgraph_entry(state: CollabState):
    """Process collaboration entry point for experts."""
    print(create_banner(f"{state['expert']} - {state['collaborator']} COLLABORATOR ENTRY"))
    
    whoami = state['collaborator']  # The collaborator's name
    my_expert = state['expert']     # The expert being collaborated with
    vs = state['vectorstore']
    
    # Get conversation manager
    conversation_manager = ConversationManager()
    session_id = state.get('session_id')
    conversation_id = None
    collaborator_node_id = None
    
    # Get conversation ID from session_id
    if session_id:
        try:
            # Try to get the latest conversation for this session
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            conversation_id = loop.run_until_complete(
                conversation_manager.get_latest_conversation_id(session_id)
            )
            loop.close()
            
            if conversation_id:
                logger.info(f"Found existing conversation: {conversation_id}")
            else:
                logger.info(f"No existing conversation found for session: {session_id}")
        except Exception as e:
            logger.error(f"Error finding conversation: {e}")
    
    # If we have a conversation ID, find the expert node and create/find the collaborator node
    if conversation_id:
        try:
            # Load the conversation
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            conversation = loop.run_until_complete(
                conversation_manager.get_conversation(conversation_id)
            )
            loop.close()
            
            if conversation:
                # First, find the expert node
                expert_node_id = None
                for node_id, node in conversation.nodes.items():
                    if node.role == 'expert' and node.name == my_expert:
                        expert_node_id = node_id
                        logger.info(f"Found expert node for {my_expert}: {expert_node_id}")
                        break
                
                if expert_node_id:
                    # Now look for an existing collaborator node for this specific expert-collaborator pair
                    for node_id, node in conversation.nodes.items():
                        if (node.role == 'collaborator' and 
                            node.name == whoami and 
                            node.parent_id == expert_node_id):
                            collaborator_node_id = node_id
                            logger.info(f"Found existing collaborator node for {whoami} under {my_expert}: {collaborator_node_id}")
                            break
                    
                    # If no collaborator node found, create one
                    if not collaborator_node_id:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        collaborator_node_id = loop.run_until_complete(
                            conversation_manager.add_collaborator(
                                conversation_id,
                                whoami,
                                expert_node_id,
                                role="collaborator",
                                expert_name=my_expert  # Add expert name to metadata for clarity
                            )
                        )
                        loop.close()
                        logger.info(f"Created new collaborator node for {whoami} under {my_expert}: {collaborator_node_id}")
        except Exception as e:
            logger.error(f"Error finding or creating collaborator node: {e}")
    
    # Get document summary with collaboration context
    context = f"Report from {my_expert}:\n{state['expert_analysis'][my_expert]}\nAreas needing work:\n{state['expert_collab_areas'][my_expert]}"
    request = get_librarian_request(whoami, state['question'], state['expert_instructions'][whoami], context)
    document_summary, relevant_documents = librarian(whoami, request, vs)
    
    # Record librarian interaction
    if collaborator_node_id and conversation_id:
        try:
            conversation_manager.add_interaction_sync(
                conversation_id,
                collaborator_node_id,
                prompt=request,
                response=document_summary,
                prompt_name="librarian_request",
                model="librarian"
            )
        except Exception as e:
            logger.error(f"Error recording librarian interaction: {e}")
    
    # Generate collaboration analysis
    prompt_template = PromptTemplate(
        input_variables=["my_expert_analysis", "collab_areas", "agent_instructions", "whoami", "document_summary", "relevant_docs"],
        template="""You are the {whoami} expert in a in a collaborative panel of multi-discipline subject matter experts. Here is your job description: {agent_instructions}\n\nYour task is to use the moderator guidance and provided documents to answer the question. \nYour analysis should \n1. Provide insights into political motivations and likely policy directions relevant to the query. \n2. Explain the roles and influences of key government bodies and officials. \n3. Discuss recent policy decisions or shifts that relate to the user\'s question. \n4. Analyze how the government\'s structure affects the issue at hand. Be detailed and specific. Support your points with relevant facts and examples found in the document summary and relevant documents.Here is a brief summary of the information retrieved from those relevant documents: \n{document_summary}\n\n Here is the actual text from the relevant documents that have been provided to help you: \n{relevant_docs}\n\n Your task is to review the report and add to, or rewrite, the areas of the report you were asked to assist with, in order to strengthen the report. You also have access to a set of documents to help you with your task.\n\nReport: {my_expert_analysis}\n\nAreas of the report to improve: {collab_areas}\n\nAnalysis:"""
    )
    
    # Prepare the input for the collaboration prompt
    prompt_input = {
        "my_expert_analysis": state['expert_analysis'][my_expert],
        "collab_areas": state['expert_collab_areas'][my_expert],
        "agent_instructions": state['expert_instructions'][whoami],
        "whoami": whoami,
        "document_summary": document_summary,
        "relevant_docs": "\n\n".join([doc.page_content for doc in relevant_documents])
    }
    
    # Format the prompt with actual values
    formatted_prompt = prompt_template.format(**prompt_input)
    
    collab_report = create_chain(
        prompt_template,
        model=state['expert_models'].get(whoami, "default_model"),
        **prompt_input
    )
    
    # Record collaboration analysis interaction
    if collaborator_node_id and conversation_id:
        try:
            conversation_manager.add_interaction_sync(
                conversation_id,
                collaborator_node_id,
                prompt=formatted_prompt,
                response=collab_report,
                prompt_name="collaboration_analysis",
                model=state['expert_models'].get(whoami, "default_model")
            )
            
            # Set final analysis for the collaborator node
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                conversation_manager.set_final_analysis(
                    conversation_id,
                    collaborator_node_id,
                    collab_report
                )
            )
            loop.close()
            
        except Exception as e:
            logger.error(f"Error recording collaboration analysis: {e}")
    
    # Return the collaboration analysis with the correct structure
    # Note: The report is from the collaborator (whoami) to the expert (my_expert)
    return {'expert_collaborator_analysis': [{"report": collab_report, "name": my_expert, "expert": whoami}]}

def expert_subgraph_entry(state: ExpertState):
    """Initial entry point for expert analysis."""
    whoami = state['expert']
    vs = state['vectorstore']
    print(create_banner(f"{whoami} SUBGRAPH ENTRY").upper())
    
    # Get conversation manager
    conversation_manager = ConversationManager()
    session_id = state.get('session_id')
    expert_node_id = None
    conversation_id = None
    
    # Get or create conversation based on session_id
    if session_id:
        try:
            # Try to get the latest conversation for this session
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            conversation_id = loop.run_until_complete(
                conversation_manager.get_latest_conversation_id(session_id)
            )
            loop.close()
            
            if not conversation_id:
                # No existing conversation, create a new one
                conversation_id = conversation_manager.create_conversation_sync(
                    question=state['question'],
                    session_id=session_id,
                    team_id=state.get('team_id', 'unknown')
                )
                logger.info(f"Created new conversation: {conversation_id}")
            else:
                logger.info(f"Using existing conversation: {conversation_id}")
                
            # Add expert node to the conversation using the new sync method
            expert_node_id = conversation_manager.add_expert_sync(
                conversation_id, 
                whoami, 
                instructions=state['expert_instructions'][whoami]
            )
            logger.info(f"Added expert node: {expert_node_id}")
            
            # Store conversation_id in state for future reference
            if 'conversation_id' not in state:
                state['conversation_id'] = conversation_id
                
        except Exception as e:
            logger.error(f"Error setting up conversation: {e}")
    
    # Get initial document summary
    agent_instructions = state['expert_instructions'][whoami]
    request = get_librarian_request(whoami, state['question'], agent_instructions)
    document_summary, relevant_documents = librarian(whoami, request, vs)
    
    # Record librarian interaction
    if expert_node_id and conversation_id:
        try:
            conversation_manager.add_interaction_sync(
                conversation_id,
                expert_node_id,
                prompt=request,
                response=document_summary,
                prompt_name="librarian_request",
                model="librarian"
            )
        except Exception as e:
            logger.error(f"Error recording librarian interaction: {e}")
    
    # Generate initial analysis
    documents_text = "\n\n".join([doc.page_content for doc in relevant_documents])
    initial_prompt_template = create_initial_report_prompt()
    
    # Prepare the input for the initial analysis prompt
    initial_prompt_input = {
        "question": state['question'],
        "document_summary": document_summary,
        "relevant_docs": documents_text,
        "moderator_guidance": state['expert_moderator_guidance'][whoami],
        "whoami": whoami,
        "agent_instructions": agent_instructions
    }
    
    # Format the prompt with actual values
    formatted_initial_prompt = initial_prompt_template.format(**initial_prompt_input)
    
    analysis = create_chain(
        initial_prompt_template,
        model=state['expert_models'][whoami],
        **initial_prompt_input
    )
    
    # Record initial analysis interaction with formatted prompt
    if expert_node_id and conversation_id:
        try:
            conversation_manager.add_interaction_sync(
                conversation_id,
                expert_node_id,
                prompt=formatted_initial_prompt,
                response=analysis,
                prompt_name="initial_analysis",
                model=state['expert_models'][whoami]
            )
        except Exception as e:
            logger.error(f"Error recording initial analysis: {e}")
    
    # Generate reflection
    reflection_prompt_template = create_reflection_prompt()
    
    # Prepare the input for the reflection prompt
    reflection_prompt_input = {
        "question": state['question'],
        "analysis": analysis,
        "documents_text": documents_text,
        "whoami": whoami,
        "agent_instructions": agent_instructions
    }
    
    # Format the reflection prompt with actual values
    formatted_reflection_prompt = reflection_prompt_template.format(**reflection_prompt_input)
    
    reflection = create_chain(
        reflection_prompt_template,
        model=state['expert_models'][whoami],
        **reflection_prompt_input
    )
    
    # Record reflection interaction with formatted prompt
    if expert_node_id and conversation_id:
        try:
            conversation_manager.add_interaction_sync(
                conversation_id,
                expert_node_id,
                prompt=formatted_reflection_prompt,
                response=reflection,
                prompt_name="reflection",
                model=state['expert_models'][whoami]
            )
        except Exception as e:
            logger.error(f"Error recording reflection: {e}")
    
    # Determine collaborators
    expert_agents_withoutme = copy.deepcopy(state['expert_list'])
    expert_agents_withoutme.remove(whoami)
    collaborators = determine_collaboration(reflection, analysis, expert_agents_withoutme)
    
    result = {
        'expert_analysis': {whoami: analysis},
        'expert_reflection': {whoami: reflection}
    }
    
    if collaborators:
        collaboration_prompt_template = create_collaboration_prompt()
        
        # Prepare the input for the collaboration prompt
        collaboration_prompt_input = {
            "question": state['question'],
            "analysis": analysis,
            "reflection": reflection,
            "collab_experts": ", ".join(collaborators),
            "whoami": whoami,
            "agent_instructions": agent_instructions
        }
        
        # Format the collaboration prompt with actual values
        formatted_collaboration_prompt = collaboration_prompt_template.format(**collaboration_prompt_input)
        
        collab_areas = create_chain(
            collaboration_prompt_template,
            model=state['expert_models'][whoami],
            **collaboration_prompt_input
        )
        
        # Record collaboration areas interaction with formatted prompt
        if expert_node_id and conversation_id:
            try:
                conversation_manager.add_interaction_sync(
                    conversation_id,
                    expert_node_id,
                    prompt=formatted_collaboration_prompt,
                    response=collab_areas,
                    prompt_name="collaboration_areas",
                    model=state['expert_models'][whoami],
                    collaborators=collaborators
                )
                
                # Add collaborator nodes
                for collaborator in collaborators:
                    # We don't have a sync version for add_collaborator, so use async with a new event loop
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    collab_node_id = loop.run_until_complete(
                        conversation_manager.add_collaborator(
                            conversation_id,
                            collaborator,
                            expert_node_id,
                            role="collaborator",
                            collaboration_areas=collab_areas
                        )
                    )
                    loop.close()
                    logger.info(f"Added collaborator node: {collab_node_id}")
                    
                    # Store collaborator node ID in state
                    if 'node_ids' not in state:
                        state['node_ids'] = {}
                    if 'collaborator_ids' not in state['node_ids']:
                        state['node_ids']['collaborator_ids'] = {}
                    state['node_ids']['collaborator_ids'][collaborator] = collab_node_id
                    
            except Exception as e:
                logger.error(f"Error handling collaborations: {e}")
        
        result.update({
            'expert_collab_areas': {whoami: collab_areas},
            'expert_collaborators_list': {whoami: collaborators}
        })
    else:
        result.update({
            'expert_collab_areas': {whoami: ""},
            'expert_collaborators_list': {whoami: []}
        })
    
    # Set final analysis for the expert node
    if expert_node_id and conversation_id:
        try:
            # We don't have a sync version for this, so we'll need to run it in a new event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                conversation_manager.set_final_analysis(
                    conversation_id,
                    expert_node_id,
                    analysis
                )
            )
            loop.close()
        except Exception as e:
            logger.error(f"Error setting final analysis: {e}")
    
    # Store node ID in state for future reference
    if expert_node_id:
        if 'node_ids' not in state:
            state['node_ids'] = {}
        state['node_ids'][whoami] = expert_node_id
    
    return result