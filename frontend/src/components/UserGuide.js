import React from 'react';
import { Container, Paper, Typography, Box, Divider } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  mainContent: {
    backgroundColor: 'var(--container-bg-color)',
    borderRadius: 'var(--border-radius)',
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    boxShadow: 'var(--box-shadow)',
  },
  section: {
    marginBottom: theme.spacing(6),
  },
  title: {
    color: 'var(--primary-color)',
    marginBottom: theme.spacing(3),
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.1)',
  },
  subtitle: {
    color: 'var(--primary-color)',
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  content: {
    marginBottom: theme.spacing(2),
    textAlign: 'left',
    color: 'var(--text-color-dark)',
    '& strong': {
      color: 'var(--primary-color)',
    },
  },
  list: {
    paddingLeft: theme.spacing(4),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(3),
    '& li': {
      marginBottom: theme.spacing(1.5),
      textAlign: 'left',
      color: 'var(--text-color-dark)',
    },
  },
  divider: {
    margin: theme.spacing(4, 0),
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  paper: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    borderRadius: 'var(--border-radius)',
    boxShadow: 'var(--box-shadow)',
  },
}));

function UserGuide() {
  const classes = useStyles();

  return (
    <Container className={classes.root}>
      <Paper className={classes.mainContent}>
        <Typography variant="h4" className={classes.title}>
          Multi-Agent Portal Guide
        </Typography>

        <Box className={classes.section}>
          <Paper className={classes.paper}>
            <Typography variant="h5" className={classes.subtitle}>
              Understanding the LLM Library
            </Typography>
            <Typography variant="body1" className={classes.content}>
              The LLM (Large Language Model) Library in the Multi-Agent Generative Engine (MAGE) is a specialized collection of fine-tuned language models designed specifically for wargaming scenarios. The Air Force Wargaming Institute has created this library to enhance the credibility and effectiveness of AI agents across various wargaming activities.
            </Typography>
            <Typography variant="body1" className={classes.content}>
              Using the fine-tuning utility in MAGE, the institute has developed a range of LLMs tailored to support different aspects of wargaming:
            </Typography>
            <ul className={classes.list}>
              <li>Wargame design</li>
              <li>Wargame development</li>
              <li>Wargame execution</li>
              <li>Analysis of wargame outcomes</li>
              <li>Report development</li>
            </ul>
            <Typography variant="body1" className={classes.content}>
              Each of these tasks requires different tuning of LLMs to ensure optimal performance. While fine-tuning LLMs is a complex task that requires careful planning and processes, the MAGE system has been designed to support LLM fine-tuning locally using a structured process to help guide users through the process (see the Fine-Tuning tab above for more information).
            </Typography>
            <Typography variant="body1" className={classes.content}>
              When creating an agent in our Multi-Agent Builder, you can choose from these specialized LLMs. Each model has been fine-tuned with relevant military, strategic, and historical data, allowing them to generate more realistic and context-appropriate responses for wargaming scenarios.
            </Typography>
            <Typography variant="body1" className={classes.content}>
              By selecting the appropriate fine-tuned model for your agent's specific role in the wargame, you ensure that the agent's responses and decision-making processes are grounded in the necessary information and language for that particular aspect of wargaming.
            </Typography>
            <Typography variant="body1" className={classes.content}>
              If you have an idea about an LLM that could be tuned for a specific role or task, speak with wargaming institute personnel so that we evaluate fine-tuning an LLM for your use case.
            </Typography>
          </Paper>
        </Box>

        <Box className={classes.section}>
          <Paper className={classes.paper}>
            <Typography variant="h5" className={classes.subtitle}>
              Building Agents
            </Typography>
            <Typography variant="body1" className={classes.content}>
              Building an agent for wargaming involves several key steps, each crucial for creating an effective AI participant in your simulations:
            </Typography>
            <ol className={classes.list}>
              <li>
                <strong>Choose a name for your agent:</strong> Select a unique and descriptive name that reflects the agent's role in the wargame. For example, "Red Force Commander" for an agent controlling opposing forces, or "Logistics Coordinator" for an agent managing supply chains.
              </li>
              <li>
                <strong>Provide a description of the agent's purpose:</strong> Write a clear, concise description that outlines the agent's main functions and areas of expertise within the wargame. For instance: "This agent simulates a strategic air commander, specializing in coordinating long-range bombing missions and managing air superiority in contested airspace."
              </li>
              <li>
                <strong>Select an LLM model for the agent:</strong> Choose the most appropriate fine-tuned or base language model based on the agent's role in the wargame. The LLM library will have more detailed descriptions of each available model and it's intended purpose based on tuningOptions may include:
                <ul>
                  <li>Llama Open-Source Base Models: These models are the base models that have been used to train the fine-tuned models. You can use these models to create your own fine-tuned models but are themselves not fine-tuned for wargaming.</li>
                  <li>Hermes: Fine-tuned for generic role-playing but not specifically for any domain.</li>
                  <li>AFWI-MAGE Fine-Tuned Models: These models have been fine-tuned for wargaming scenarios. They are the best models to use for wargaming.</li>
                </ul>
              </li>
              <li>
                <strong>Write detailed instructions for the agent:</strong> Provide comprehensive guidelines that define the agent's behavior, knowledge boundaries, and decision-making processes within the wargame. For example:
                <ul>
                  <li>"You are the Blue Force Naval Commander. Your primary objectives are to protect allied shipping lanes and conduct amphibious operations when necessary. Always consider the following factors in your decision-making: 1) Current intelligence on enemy naval positions, 2) The status and readiness of your fleet, 3) Potential civilian casualties, 4) Long-term strategic objectives provided by Central Command. When given a situation, analyze these factors and provide a detailed course of action with justification."</li>
                  <li>"As the Red Force Cyber Warfare Specialist, your role is to simulate adversarial actions in the cyber domain. Focus on disrupting Blue Force communications, gathering intelligence, and compromising critical infrastructure. For each turn, propose a cyber operation that aligns with the overall Red Force strategy. Include potential targets, methods of attack, and expected outcomes. Always consider the risk of detection and potential Blue Force countermeasures in your planning."</li>
                </ul>
              </li>
              <li>
                <strong>Customize the agent's appearance:</strong> Select a color that represents the agent's allegiance or function in the wargame. This visual cue helps users quickly identify different agents in the simulation. For instance:
                <ul>
                  <li>Blue for friendly forces</li>
                  <li>Red for opposing forces</li>
                  <li>Green for neutral or civilian entities</li>
                  <li>Purple for special operations or unconventional warfare units</li>
                </ul>
              </li>
            </ol>
            <Typography variant="body1" className={classes.content}>
              Remember, the key to creating an effective wargaming agent lies in the details of its configuration. Take time to refine the instructions and test the agent's responses to ensure it behaves realistically and contributes meaningfully to the wargame scenarios.
            </Typography>
          </Paper>
        </Box>

        <Box className={classes.section}>
          <Paper className={classes.paper}>
            <Typography variant="h5" className={classes.subtitle}>
              Creating Multi-Agent Teams
            </Typography>
            <Typography variant="body1" className={classes.content}>
              Multi-Agent Teams allow you to combine multiple agents to simulate complex military organizations or coalitions or to assist in various wargame activities such as game design, analysis, or reporting. To create a team:
            </Typography>
            <ol className={classes.list}>
              <li>Select the agents you want to include in your team (e.g., Air Force Commander, Intelligence Officer, Logistics Specialist)</li>
              <li>Provide a name for your team (e.g., "Joint Task Force Alpha")</li>
              <li>Write team instructions that explain how the agents should collaborate and make decisions collectively</li>
              <li>Define the team's chain of command and information flow between agents</li>
            </ol>
            <Typography variant="body1" className={classes.content}>
              When creating a team, consider how each agent's role complements the others and how they can work together to achieve complex military objectives within the wargame. You can go back into individual agent system instructions and edit them by clicking on the agent's card in the team builder. This can have drastic effects on overall agent performance and behavior.
            </Typography>
          </Paper>
        </Box>

        <Box className={classes.section}>
          <Paper className={classes.paper}>
            <Typography variant="h5" className={classes.subtitle}>
              Additional Resources for Multi-Agent Wargaming Design
            </Typography>
            <Typography variant="body1" className={classes.content}>
              To enhance your multi-agent wargaming simulations, consider exploring these resources:
            </Typography>
            <ul className={classes.list}>
              <li>US Air Force doctrine and strategic documents</li>
              <li>Historical case studies of military operations and conflicts</li>
              <li>Current geopolitical analyses and threat assessments</li>
              <li>Advanced game theory and decision-making models</li>
              <li>Multi-agent system design principles and best practices</li>
              <li>Wargaming methodologies and scenario development techniques</li>
              <li>Military logistics and supply chain management concepts</li>
              <li>Emerging technologies and their impact on warfare</li>
            </ul>
            <Typography variant="body1" className={classes.content}>
              Regularly update your agents and teams based on the outcomes of wargaming sessions, emerging technologies, and evolving military strategies to ensure your simulations remain cutting-edge and relevant.
            </Typography>
          </Paper>
        </Box>

        <Box className={classes.section}>
          <Paper className={classes.paper}>
            <Typography variant="h5" className={classes.subtitle}>
              Understanding Generative AI Concepts
            </Typography>
            <Typography variant="body1" className={classes.content}>
              To better leverage the MAGE system and create more effective agents, it's important to understand key concepts in generative AI and language models. Here are some introductory lessons to help you grasp these concepts:
            </Typography>
            
            <Typography variant="h6" className={classes.subtitle}>1. Prompt Engineering</Typography>
            <Typography variant="body1" className={classes.content}>
              Prompt engineering is the art of crafting effective instructions for AI models to produce desired outputs. Think of it as giving directions to a highly capable but literal-minded assistant.
              
              Example: Instead of asking "What's the weather?", a well-engineered prompt might be "Provide a detailed weather forecast for Washington D.C. for the next 24 hours, including temperature, precipitation chances, and wind conditions."
              
              Analogy: Prompt engineering is like being a skilled coach. The better and more specific your instructions, the better the performance you'll get from your team (or in this case, the AI model).
            </Typography>

            <Typography variant="h6" className={classes.subtitle}>2. Retrieval-Augmented Generation (RAG)</Typography>
            <Typography variant="body1" className={classes.content}>
              RAG combines the power of retrieving relevant information with the ability to generate new text. It's like giving the AI model access to a vast library of information that it can reference while formulating its responses.
              
              Example: When asked about specific military operations, a RAG-enabled system might first retrieve relevant historical data and then use that information to generate a comprehensive analysis.
              
              Analogy: Think of RAG as a expert consultant with instant access to a massive, well-organized filing cabinet. They can quickly pull out relevant files and use that information to provide informed advice.
            </Typography>

            <Typography variant="h6" className={classes.subtitle}>3. LLM Fine-Tuning</Typography>
            <Typography variant="body1" className={classes.content}>
              Fine-tuning is the process of adapting a pre-trained language model to perform better on specific tasks or domains. It's like taking a general-purpose tool and customizing it for a specialized job.
              
              Example: A general language model might be fine-tuned on military strategy documents to become an expert in military planning and analysis.
              
              Analogy: Fine-tuning is similar to sending a seasoned general through specialized training for a specific type of warfare. They retain their broad knowledge but gain additional expertise in a particular area.
            </Typography>

            <Typography variant="h6" className={classes.subtitle}>4. Chain-of-Thought Prompting</Typography>
            <Typography variant="body1" className={classes.content}>
              This technique involves prompting the AI to show its reasoning process step-by-step, leading to more accurate and transparent outcomes.
              
              Example: Instead of just asking "What's the best strategy for this battle scenario?", you might prompt: "Analyze the terrain, assess troop strengths, consider supply lines, and then recommend the best strategy for this battle scenario. Show your reasoning for each step."
              
              Analogy: Chain-of-thought prompting is like asking a military strategist to think aloud while planning, allowing you to follow their reasoning and understand how they arrived at their conclusion.
            </Typography>

            <Typography variant="h6" className={classes.subtitle}>5. Ethical AI and Bias Mitigation</Typography>
            <Typography variant="body1" className={classes.content}>
              This involves creating AI systems that are fair, transparent, and respectful of human values, while actively working to reduce biases in their outputs.
              
              Example: Ensuring that a wargaming AI doesn't consistently favor certain strategies based on biased historical data, but instead considers a wide range of factors and possibilities.
              
              Analogy: Think of ethical AI development as creating a diverse, well-rounded advisory council. Just as you'd want advisors from various backgrounds to provide balanced insights, we aim to create AI systems that offer fair and comprehensive perspectives.
            </Typography>

            <Typography variant="body1" className={classes.content}>
              By understanding these concepts, you'll be better equipped to create sophisticated, effective, and responsible AI agents for your wargaming simulations. Remember, the key to mastering these concepts is practice and experimentation within the MAGE system.
            </Typography>
          </Paper>
        </Box>
      </Paper>
    </Container>
  );
}

export default UserGuide;