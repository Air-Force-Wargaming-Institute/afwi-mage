import re

def format_agent_name(name):
    return re.sub(r'\s+', '_', name)

def format_team_name(name):
    return re.sub(r'\s+', '_', name)

# Add any other helper functions here
