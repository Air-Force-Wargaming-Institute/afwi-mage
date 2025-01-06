from langchain.agents import initialize_agent, Tool
from langchain.memory import ConversationBufferMemory
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langchain_core.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_core.callbacks.manager import CallbackManager
import functools

# Import system agents
from agents.system_agents.librarian_agent import librarian_agent
from agents.system_agents.synthesis_agent import synthesis_agent
from agents.system_agents.user_proxy_moderator import user_proxy_moderator

# Add these lines near the top of the file, after the existing imports
TEAM_NAME = "PRC CASI"
TEAM_DESCRIPTION = """A panel of experts on PRC military strategy and global efforts"""
TEAM_COLOR = "#FF0000"
CREATED_AT = "{{CREATED_AT}}"
MODIFIED_AT = "2024-11-22T20:51:02.683958"

class AgentTeam:
    def __init__(self, name, agents, team_instructions, memory_type="ConversationBufferMemory", memory_kwargs=None):
        self.name = name
        self.agents = agents
        self.team_instructions = team_instructions
        
        # Set up memory for the team
        if memory_type == "ConversationBufferMemory":
            self.memory = ConversationBufferMemory(**(memory_kwargs or {}))
        else:
            raise ValueError(f"Unsupported memory type: {memory_type}")
        
        # Set up LLM
        self.streaming_llm = ChatOpenAI(
            temperature=0.7,
            max_tokens=1000,
            streaming=True,
            callbacks=[StreamingStdOutCallbackHandler()]
        )
        self.non_streaming_llm = ChatOpenAI(
            temperature=0.7,
            max_tokens=1000
        )
        
        # Create the agent graph
        self.workflow = self.create_graph()
    
    def create_graph(self):
        workflow = StateGraph(dict)
        
        # Add nodes for each agent
        for agent in self.agents:
            workflow.add_node(agent.name, functools.partial(agent.run, llm=self.streaming_llm))
        
        # Add system agents
        workflow.add_node("librarian", functools.partial(librarian_agent, llm=self.non_streaming_llm))
        workflow.add_node("synthesis", functools.partial(synthesis_agent, llm=self.streaming_llm))
        workflow.add_node("user_proxy_moderator", functools.partial(user_proxy_moderator, llm=self.non_streaming_llm))
        
        # Set entry point
        workflow.set_entry_point("user_proxy_moderator")
        
        # Add edges (this is a simplified version, you might want to add more complex routing)
        for agent in self.agents:
            workflow.add_edge("user_proxy_moderator", agent.name)
            workflow.add_edge(agent.name, "librarian")
            workflow.add_edge("librarian", agent.name)
            workflow.add_edge(agent.name, "synthesis")
        
        workflow.add_edge("synthesis", END)
        
        return workflow.compile()
    
    async def run(self, human_input):
        initial_state = {
            "question": human_input,
            "team_instructions": self.team_instructions
        }
        for event in self.workflow.stream(initial_state):
            if event.event == "start":
                print(f"Starting: {event.node}")
            elif event.event == "end":
                print(f"Ending: {event.node}")
            elif event.event == "output":
                print(f"Output: {event.output}")
        
        # Return the final state
        return event.state

# The following will be filled in programmatically when creating a new team
TEAM_NAME = "PRC CASI"
TEAM_INSTRUCTIONS = """"""
MEMORY_TYPE = "ConversationBufferMemory"
MEMORY_KWARGS = {"max_token_limit": 2000}
AGENT_FILE_NAMES = ['PRC_Regional_Dynamics', 'PRC_Domestic_Stability_Expert', 'PRC_Economics_Expert', 'PRC_Global_Influence_Expert', 'PRC_Government_Expert', 'PRC_Military_Expert', 'PRC_Technology_and_Innovation_Expert', '']

# This part will be added when the team is instantiated
# def load_agent(file_name):
#     module = __import__(f'agents.individual_agents.{file_name}', fromlist=['Agent'])
#     return module.Agent(module.AGENT_NAME, module.AGENT_DESCRIPTION, module.LLM_MODEL, module.AGENT_INSTRUCTIONS, module.MEMORY_TYPE, module.MEMORY_KWARGS)

# agents = [load_agent(file_name) for file_name in AGENT_FILE_NAMES if file_name]
# team = AgentTeam(TEAM_NAME, agents, TEAM_INSTRUCTIONS, MEMORY_TYPE, MEMORY_KWARGS)