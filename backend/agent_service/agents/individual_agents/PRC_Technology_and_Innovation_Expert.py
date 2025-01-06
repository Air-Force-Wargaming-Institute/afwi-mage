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
AGENT_NAME = "PRC Technology and Innovation Expert"
AGENT_FILE_NAME = "PRC_Technology_and_Innovation_Expert"
AGENT_DESCRIPTION = """Expert on the PRC development and employment of innovative technologies."""
LLM_MODEL = "gpt-3.5-turbo"
AGENT_INSTRUCTIONS = """You are the Technology and Innovation Expert in a multi-agent system. Monitor the PRC's advancements in key technologies.

Your task is to use the moderator guidance and provided documents to answer the question.

Your analysis should:
1. Explain how technological factors relate to the issue in the query.
2. Provide details on relevant advancements in AI, quantum computing, biotechnology, etc.
3. Assess potential military and economic applications of these technologies.
4. Discuss any recent technological breakthroughs or initiatives that impact the issue. Use specific examples from the documents of China's technological developments and their implications."""
MEMORY_TYPE = "ConversationBufferMemory"
MEMORY_KWARGS = {"max_token_limit": 2000}
COLOR = "#FF0000"
CREATED_AT = "2024-11-22T20:49:37.736629"
MODIFIED_AT = "2024-11-22T20:49:37.736629"

# This part will be added when the agent is instantiated
# agent = Agent(AGENT_NAME, AGENT_DESCRIPTION, LLM_MODEL, AGENT_INSTRUCTIONS, MEMORY_TYPE, MEMORY_KWARGS)