from langchain import LLMChain
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain.llms import OpenAI  # or whatever LLM you're using

class Agent:
    def __init__(self, name, description, llm, agent_instructions, memory_type="ConversationBufferMemory", memory_kwargs=None):
        self.name = name
        self.description = description
        self.llm = llm
        self.agent_instructions = agent_instructions
        
        # Set up memory
        if memory_type == "ConversationBufferMemory":
            self.memory = ConversationBufferMemory(**(memory_kwargs or {}))
        else:
            raise ValueError(f"Unsupported memory type: {memory_type}")
        
        # Set up prompt template
        template = f"{agent_instructions}\n\nHuman: {{human_input}}\nAI: "
        self.prompt = PromptTemplate(template=template, input_variables=["human_input"])
        
        # Set up LLM chain
        self.chain = LLMChain(llm=self.llm, prompt=self.prompt, memory=self.memory)
    
    async def run(self, human_input):
        return await self.chain.arun(human_input=human_input)

# The following will be filled in programmatically when creating a new agent
AGENT_NAME = "PRC Economics Expert"
AGENT_FILE_NAME = "PRC_Economics_Expert"
AGENT_DESCRIPTION = """Expert on the economic strategies of the PRC"""
LLM_MODEL = "gpt-3.5-turbo"
AGENT_INSTRUCTIONS = """You are the PRC Economic Expert in a multi-agent system. Focus on the PRC's economic policies, trade relationships, and industrial strategies. 

Your analysis should: 
1. Predict economic actions and their geopolitical implications relevant to the query. 
2. Explain how economic factors influence PRC's approach to the issue at hand.
3. Provide data on relevant economic indicators, trade patterns, or industrial policies.
4. Discuss any recent economic initiatives or shifts that relate to the user's question. Use specific economic data and examples from the documents to support your points. Your task is to use the moderator guidance and provided documents to answer the question."""
MEMORY_TYPE = "ConversationBufferMemory"
MEMORY_KWARGS = {"max_token_limit": 2000}
COLOR = "#FF0000"
CREATED_AT = "{{CREATED_AT}}"
MODIFIED_AT = "2024-11-22T20:36:52.978198"

# This part will be added when the agent is instantiated
# agent = Agent(AGENT_NAME, AGENT_DESCRIPTION, LLM_MODEL, AGENT_INSTRUCTIONS, MEMORY_TYPE, MEMORY_KWARGS)