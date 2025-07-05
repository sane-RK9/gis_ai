import logging
from src.services.llm_service import LLMService
from src.core.schemas import WorkflowStep

logger = logging.getLogger(__name__)

class ValidationAgent:
    SYSTEM_PROMPT = """Validate geospatial tool execution:

Step: {step_description}
Tool: {tool_name}
Parameters: {params}
Result: {result}

Check:
1. Is result structure valid?
2. Does output file exist?
3. Is result plausible?
4. Any error indicators?

Response format: {{"valid": boolean, "message": string}}"""

    def __init__(self, model="mixtral"):
        self.llm_service = LLMService(model=model)
    
    def validate(self, step: WorkflowStep, result: dict, intermediate_results: list) -> tuple:
        """Validate tool execution result"""
        # Basic validation
        if "error" in result:
            return False, result["error"]
        
        # LLM-based validation
        prompt = ChatPromptTemplate.from_template(self.SYSTEM_PROMPT)
        chain = prompt | self.llm_service.model | JsonOutputParser()
        
        response = chain.invoke({
            "step_description": step.description,
            "tool_name": step.tool_name,
            "params": json.dumps(step.params),
            "result": json.dumps(result)
        })
        
        return response["valid"], response.get("message", "")

class MockValidationAgent:
    """Basic validator (always returns valid)"""
    def validate(self, step, result, intermediate_results):
        return True, "Validation passed"