from utils.shared_state import shared_state
from multiagent.graph.createGraph import create_graph
import time

def process_question(question: str):
    start_time = time.time()
    graph = create_graph()
    shared_state.ITERATION += 1
    shared_state.CONVERSATION += f"User Question {shared_state.ITERATION}: {shared_state.QUESTION},\n\n"
    inputs = {
        "question": question,
        "conversation_history": shared_state.CONVERSATION
    }

    final_output = None
    for output in graph.stream(inputs, {"recursion_limit": 200}):
        final_output = output
    print(final_output)
    # Reset for the next question from this user
    shared_state.EXPERT_LIST_GENERATED = False

    # Print the conversation, if so desired #TODO: make this sort of print toggable in config
    #print("\n\n\t\t^^^^^^^^^CONVERSATION^^^^^^^^^\n\n")
    #print(shared_state.CONVERSATION)
    end_time = time.time()
    print(f"\n\n\t\tTime taken: {end_time - start_time} seconds\n\n")
    if final_output and 'synthesis' in final_output and 'synthesized_report' in final_output['synthesis']:
        return final_output['synthesis']['synthesized_report'], 
        #return final_output
    else:
        return "Error: No synthesized report generated."