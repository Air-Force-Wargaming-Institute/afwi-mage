# This file is used to create a new chat session directory in backend when a user selects to create a new chat session in the MAGE GUI. It will create a new directory located here: AFWI Multi-Agent Generative Engine\backend\chat_service\multiagent\graph\Chats
# That directory will contain a meta file that contains the following information:
# UserCreatorID:
# Session Creation Date/Time:
# Session Modified Date/Time:
# Session Name:
# Session Description:
# TeamID:

# It should crossreference the current user's ID, check is a chat directory exists for that user, if not, it will create a new one. If one does exist, it will then create a new session directory within that chat directory.
# It will also create a new Session#.py file for the new session.
# It will also create a new session in the shared state.
# It will also create a new session in the chat history.