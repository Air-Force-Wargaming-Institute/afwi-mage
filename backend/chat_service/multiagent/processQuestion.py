from utils.shared_state import shared_state
from multiagent.graph.createGraph import create_graph

def process_question():
    graph = create_graph()
    shared_state.ITERATION += 1
    shared_state.CONVERSATION += f"User Question {shared_state.ITERATION}: {shared_state.QUESTION},\n\n"

    inputs = {
        "keys": {
            "question": shared_state.QUESTION,
            "conversation_history": shared_state.CONVERSATION,
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

    # Print the conversation, if so desired #TODO: make this sort of print toggable in config
    #print("\n\n\t\t^^^^^^^^^CONVERSATION^^^^^^^^^\n\n")
    #print(shared_state.CONVERSATION)

    if final_output and 'synthesis' in final_output and 'keys' in final_output['synthesis'] and 'synthesized_report' in final_output['synthesis']['keys']:
        return final_output['synthesis']['keys']['synthesized_report'], 
        #return final_output
    else:
        return "Error: No synthesized report generated."