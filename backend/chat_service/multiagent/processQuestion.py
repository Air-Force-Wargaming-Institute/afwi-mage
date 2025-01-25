from utils.shared_state import shared_state
from multiagent.graph.createGraph import create_graph

def process_question():
    """Legacy synchronous processing - maintained for backward compatibility"""
    graph = create_graph()
    shared_state.ITERATION += 1
    
    # Add user message to conversation log
    shared_state.conversation_manager.add_message(
        role="user",
        content=shared_state.QUESTION
    )
    
    # Get conversation history for context
    conversation_history = shared_state.conversation_manager.get_conversation_history()

    inputs = {
        "keys": {
            "question": shared_state.QUESTION,
            "conversation_history": conversation_history,
            "agent_requests": {
                "prc_government": "Information on PRC government structure and recent policy decisions",
                "prc_military": "Details on PRC military capabilities and recent strategic moves",
                "prc_economic": "Data on PRC economic policies and trade relationships",
                "regional_dynamics": "Information on PRC's relationships with neighboring countries",
                "global_influence": "Details on PRC's global diplomatic and economic initiatives",
                "technology_innovation": "Information on PRC's advancements in key technologies",
                "domestic_stability": "Data on internal social and political factors in PRC"
            }
        }
    }

    final_output = None
    for output in graph.stream(inputs, {"recursion_limit": 200}):
        final_output = output

    # Reset for the next question from this user
    shared_state.EXPERT_LIST_GENERATED = False

    if final_output and 'synthesis' in final_output and 'keys' in final_output['synthesis'] and 'synthesized_report' in final_output['synthesis']['keys']:
        synthesized_report = final_output['synthesis']['keys']['synthesized_report']
        
        # Add assistant response to conversation log
        shared_state.conversation_manager.add_message(
            role="assistant",
            content=synthesized_report,
            metadata={"type": "synthesis"}
        )
        
        return synthesized_report
    else:
        error_msg = "Error: No synthesized report generated."
        shared_state.conversation_manager.add_message(
            role="assistant",
            content=error_msg,
            metadata={"type": "error"}
        )
        return error_msg

async def process_question_stream():
    """Asynchronous streaming version of question processing"""
    graph = create_graph()
    shared_state.ITERATION += 1
    
    # Add user message to conversation log
    shared_state.conversation_manager.add_message(
        role="user",
        content=shared_state.QUESTION
    )
    
    # Get conversation history for context
    conversation_history = shared_state.conversation_manager.get_conversation_history()

    inputs = {
        "keys": {
            "question": shared_state.QUESTION,
            "conversation_history": conversation_history,
            "agent_requests": {
                "prc_government": "Information on PRC government structure and recent policy decisions",
                "prc_military": "Details on PRC military capabilities and recent strategic moves",
                "prc_economic": "Data on PRC economic policies and trade relationships",
                "regional_dynamics": "Information on PRC's relationships with neighboring countries",
                "global_influence": "Details on PRC's global diplomatic and economic initiatives",
                "technology_innovation": "Information on PRC's advancements in key technologies",
                "domestic_stability": "Data on internal social and political factors in PRC"
            }
        }
    }

    agent_responses = []
    final_synthesis = None

    for output in graph.stream(inputs, {"recursion_limit": 200}):
        # Stream intermediate agent outputs
        if output and isinstance(output, dict):
            for key, value in output.items():
                if key != 'synthesis':  # Agent outputs
                    if isinstance(value, dict) and 'keys' in value:
                        agent_response = value['keys'].get('response', 'No response available')
                        agent_responses.append({
                            "agent": key,
                            "content": agent_response
                        })
                        yield {
                            "type": "agent_update",
                            "agent": key,
                            "content": agent_response
                        }
                else:  # Final synthesis
                    if isinstance(value, dict) and 'keys' in value and 'synthesized_report' in value['keys']:
                        final_synthesis = value['keys']['synthesized_report']
                        yield {
                            "type": "final_synthesis",
                            "content": final_synthesis
                        }

    # Add all responses to conversation log
    for agent_response in agent_responses:
        shared_state.conversation_manager.add_message(
            role="assistant",
            content=agent_response["content"],
            metadata={
                "type": "agent_response",
                "agent": agent_response["agent"]
            }
        )

    if final_synthesis:
        shared_state.conversation_manager.add_message(
            role="assistant",
            content=final_synthesis,
            metadata={"type": "synthesis"}
        )
    else:
        error_msg = "Error: No synthesized report generated."
        shared_state.conversation_manager.add_message(
            role="assistant",
            content=error_msg,
            metadata={"type": "error"}
        )

    # Reset for the next question
    shared_state.EXPERT_LIST_GENERATED = False