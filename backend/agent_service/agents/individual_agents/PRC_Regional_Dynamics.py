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
AGENT_NAME = "PRC Regional Dynamics"
AGENT_FILE_NAME = "PRC_Regional_Dynamics"
AGENT_DESCRIPTION = """Expert on the regional dynamic factors that affect the PRC's strategic decision making."""
LLM_MODEL = "gpt-3.5-turbo"
AGENT_INSTRUCTIONS = """You are the Regional Dynamics Expert in a multi-agent system. Examine the PRC's relationships with neighboring countries and regional powers.

Your task is to use the moderator guidance and provided documents to answer the question.

Your analysis should:
1. Explain how regional dynamics affect PRC's approach to the issue in the query.
2. Discuss relevant historical context, territorial disputes, or shifting alliances. 
3. Analyze the positions and potential reactions of key regional players. 
4. Identify any recent regional developments or agreements that impact the issue. Provide specific examples of regional interactions from the documents and their implications."""
MEMORY_TYPE = "ConversationBufferMemory"
MEMORY_KWARGS = {"max_token_limit": 2000}
COLOR = "#FF0000"
CREATED_AT = "{{CREATED_AT}}"
MODIFIED_AT = "2024-11-22T20:47:38.851052"

# This part will be added when the agent is instantiated
# agent = Agent(AGENT_NAME, AGENT_DESCRIPTION, LLM_MODEL, AGENT_INSTRUCTIONS, MEMORY_TYPE, MEMORY_KWARGS)