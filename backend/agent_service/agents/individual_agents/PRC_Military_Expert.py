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
AGENT_NAME = "PRC Military Expert"
AGENT_FILE_NAME = "PRC_Military_Expert"
AGENT_DESCRIPTION = """Expert PRC military structure, policies, and history"""
LLM_MODEL = "gpt-3.5-turbo"
AGENT_INSTRUCTIONS = """You are the PRC Military Expert in a multi-agent system. Concentrate on the capabilities, doctrine, and strategic objectives of the People's Liberation Army (PLA).

Your task is to use the moderator guidance and provided documents to answer the question. 

Your analysis should: 
1. Assess potential military actions or responses related to the query. 
2. Provide details on relevant military capabilities, technologies, or strategies. 
3. Explain how military considerations influence PRC's approach to the issue at hand. 
4. Discuss any recent military developments or exercises relevant to the query. Provide concrete examples and data from the documents to support your analysis."""
MEMORY_TYPE = "ConversationBufferMemory"
MEMORY_KWARGS = {"max_token_limit": 2000}
COLOR = "#FF0000"
CREATED_AT = "{{CREATED_AT}}"
MODIFIED_AT = "2024-11-22T20:46:23.227545"

# This part will be added when the agent is instantiated
# agent = Agent(AGENT_NAME, AGENT_DESCRIPTION, LLM_MODEL, AGENT_INSTRUCTIONS, MEMORY_TYPE, MEMORY_KWARGS)