from utils.shared_state import shared_state
from multiagent.team.US_NATO_Coalition import US_NATO_Coalition_graph

from team_config import load_config
from utils.vector_store.vectorstore import check_for_vectorstore, load_local_vectorstore, create_retriever

def processQuestion(question: str):

    config = load_config()
    VS_PERSIST_DIR = config['VS_PERSIST_DIR']
    SEARCH_TYPE = config['SEARCH_TYPE']
    K = config['K']
    shared_state.QUESTION = question

        # Check if a vector store exists at the VS_PERSIST_DIR location
    if check_for_vectorstore(VS_PERSIST_DIR):
        shared_state.VECTOR_STORE = load_local_vectorstore(VS_PERSIST_DIR)
    else:
        shared_state.VECTOR_STORE = None

    # If a vector store exists, create a retriever
    if shared_state.VECTOR_STORE:
        shared_state.RETRIEVER = create_retriever(type=SEARCH_TYPE, vector_store=shared_state.VECTOR_STORE, k=K)
    else:
        shared_state.RETRIEVER = None

    graph = US_NATO_Coalition_graph()
    shared_state.ITERATION += 1
    shared_state.CONVERSATION += f"User Question {shared_state.ITERATION}: {shared_state.QUESTION},\n\n"

    inputs = {
        "keys": {
            "question": shared_state.QUESTION,
            "conversation_history": shared_state.CONVERSATION,
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

    synthesized_report = final_output.get('synthesis', {}).get('keys', {}).get('synthesized_report')
    if final_output and synthesized_report:
        # Format the response with collapsible markdown
        response = synthesized_report
        response += "\n\n<details><summary>Expert Analyses</summary>\n\n"
        for expert in config['EXPERT_AGENTS']:
            expert_analysis = final_output['synthesis']['keys'].get(f'{expert}_analysis', "")
            if expert_analysis:
                response += f"<details><summary>{expert.replace('_', ' ').title()} Analysis</summary>\n\n{expert_analysis}\n\n</details>\n\n"
        response += "</details>"

        return response
    else:
        return "Error: No synthesized report generated."