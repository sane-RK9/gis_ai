import json
import logging
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from src.services.llm_service import LLMService
from src.core.schemas import WorkflowPlan, WorkflowStep
from src.tools.registry import list_available_tools
from src.services.llm_service import LLMService


logger = logging.getLogger(__name__)

class PlannerAgent:
    SYSTEM_PROMPT = """You are an expert geospatial analyst. Transform this query into a workflow:

Query: {query}

Available Tools:
{tools_list}

Output JSON format:
{format_instructions}

Guidelines:
1. Use only available tools
2. Break complex tasks into steps
3. Include parameter estimates
4. Add 'reasoning' for each step"""

    def __init__(self, model="llama3.2:3b"):
        self.llm_service = LLMService(model=model)
        self.parser = JsonOutputParser(pydantic_object=WorkflowPlan)
    
    def _get_tools_description(self) -> str:
        """Generate description of available tools"""
        tools = list_available_tools()
        descriptions = []
        for tool in tools:
            params = json.dumps(tool["parameters"], indent=2)
            desc = f"- {tool['name']}: {tool['description']}\n  Parameters: {params}"
            descriptions.append(desc)
        return "\n".join(descriptions)

    def generate_plan(self, query: str) -> WorkflowPlan:
        """Generate workflow plan from natural language query"""
        # Create prompt
        prompt = ChatPromptTemplate.from_template(self.SYSTEM_PROMPT)
        chain = prompt | self.llm_service.model | self.parser
        
        # Generate plan
        return chain.invoke({
            "query": query,
            "tools_list": self._get_tools_description(),
            "format_instructions": self.parser.get_format_instructions()
        })

# Mock implementation for testing purposes
# In MockPlannerAgent class
class MockPlannerAgent:
    def generate_plan(self, query: str) -> WorkflowPlan:
        return WorkflowPlan(
            job_id="mock_job",
            steps=[
                WorkflowStep(
                    step_id="step1", 
                    tool_name="stac_search", 
                    description="Find imagery", 
                    params={"bbox": [0,0,1,1]},
                    reasoning="First, I need to find the relevant satellite images for the area."
                ),
                WorkflowStep(
                    step_id="step2", 
                    tool_name="gdal_translate", 
                    description="Convert image format to cloud-optimized GeoTIFF.", 
                    params={
                        # This special string tells the executor where to get the value.
                        "input_file": "{steps.step1.result.results[0].asset_href}",
                        "of": "COG"
                    },
                    reasoning="Next, I will convert the found image to a Cloud-Optimized GeoTIFF for efficient processing."
                )
            ]
        )