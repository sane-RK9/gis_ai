import os
from langchain_community.llms import Ollama
from langchain_community.chat_models import ChatOllama
from langchain_core.output_parsers import StrOutputParser

class LLMService:
    def __init__(self, model: str = "llama3:8b", temperature: float = 0.2):
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        
        # Use ChatOllama for conversational, instruction-following tasks
        self.model = ChatOllama(
            base_url=base_url,
            model=model,
            temperature=temperature,
            # Tell the model to expect and output JSON
            format="json", 
        )
        self.parser = StrOutputParser()
        self.chain = self.model | self.parser
        
    def invoke(self, prompt: str) -> str:
        """Simple invocation for string-based responses."""
        return self.chain.invoke(prompt)