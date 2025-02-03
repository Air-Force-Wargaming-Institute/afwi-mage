from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import shutil
import sys
from config_ import BUILDER_DIR


class ChatMessage(BaseModel):
    message: str
    team_name: str

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat")
async def chat(message: ChatMessage):
    try:
        print(f"Received message: {message.message}")
        print(f"Team name: {message.team_name}")
        #shared_state.QUESTION = message.message

        # Now that we have a team name, we want to copy that team from the data directory
        source_team_dir = BUILDER_DIR / "TEAMS" / message.team_name
        chat_teams_dir = Path(__file__).parent / "chat_teams"
        target_team_dir = chat_teams_dir / message.team_name
        if not source_team_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Team directory not found: {message.team_name}"
            )

        shutil.copytree(source_team_dir, target_team_dir, dirs_exist_ok=True)

        try:
            import importlib

            # Add the team's directory to Python's path
            team_dir = Path(__file__).parent / "chat_teams" / message.team_name
            team_dir_str = str(team_dir)
            sys.path.insert(0, team_dir_str)

            try:
                # Clean up any existing modules before importing
                for key in list(sys.modules.keys()):
                    module = sys.modules[key]
                    # Check if module has a __file__ attribute and if it's from our team directory
                    if hasattr(module, '__file__') and module.__file__ and \
                       str(Path(module.__file__).resolve()).startswith(team_dir_str):
                        del sys.modules[key]
                
                # Import and process
                module_name = "multiagent.processQuestion"
                process_question_module = importlib.import_module(module_name)
                process_question = process_question_module.processQuestion
                
                response = process_question(message.message)
                return {"response": response}
            finally:
                # Clean up: remove the team's directory from sys.path
                sys.path.remove(team_dir_str)
                # Clean up all modules that were loaded from the team directory
                for key in list(sys.modules.keys()):
                    module = sys.modules[key]
                    # Check if module has a __file__ attribute and if it's from our team directory
                    if hasattr(module, '__file__') and module.__file__ and \
                       str(Path(module.__file__).resolve()).startswith(team_dir_str):
                        del sys.modules[key]
                
        except ImportError as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Could not load process_question for team: {message.team_name}. Error: {str(e)}"
            )

    except Exception as e:
        print(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Chat Service API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)