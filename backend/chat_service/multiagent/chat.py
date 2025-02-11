from typing import Dict, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Chat:
    question: str
    expert_analyses: Dict[str, str]  # expert_name -> final_analysis
    synthesized_report: str
    timestamp: str = None
    
    def __init__(self, question: str, expert_analyses: Dict[str, str], synthesized_report: str):
        self.question = question
        self.expert_analyses = expert_analyses
        self.synthesized_report = synthesized_report
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def to_dict(self) -> dict:
        return {
            "question": self.question,
            "expert_analyses": self.expert_analyses,
            "synthesized_report": self.synthesized_report,
            "timestamp": self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Chat':
        chat = cls(
            question=data["question"],
            expert_analyses=data["expert_analyses"],
            synthesized_report=data["synthesized_report"]
        )
        chat.timestamp = data.get("timestamp")
        return chat
    
    def format_chat(self) -> str:
        """Format the chat for display/storage"""
        formatted = f"\nUser Question: {self.question}\n\n"
        
        if self.expert_analyses:
            formatted += "Expert Analyses:\n"
            for expert, analysis in self.expert_analyses.items():
                formatted += f"\n{expert}:\n{analysis}\n"
        
        if self.synthesized_report:
            formatted += f"\nFinal Synthesized Report:\n{self.synthesized_report}\n"
        
        formatted += "\n" + "-"*80 + "\n"
        return formatted 