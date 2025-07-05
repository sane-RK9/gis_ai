from langgraph.graph import StateGraph, END
from .state import OrchestratorState
from src.services import redis_service
from src.agents.planner import PlannerAgent
from src.agents.validator import ValidationAgent
from src.tools.registry import get_tool_by_name
import logging

logger = logging.getLogger(__name__)

def planner_node(state: OrchestratorState) -> dict:
    """Generate workflow plan using LLM"""
    logger.info(f"Planning job: {state.job_id}")
    state.update_redis()
    
    try:
        planner = PlannerAgent()
        state.plan = planner.generate_plan(state.query)
        state.update_redis()
        return {"plan": state.plan}
    except Exception as e:
        state.error_message = f"Planning failed: {str(e)}"
        state.update_redis()
        return {"error_message": state.error_message}

def tool_executor_node(state: OrchestratorState) -> dict:
    """Execute current step in the workflow"""
    if not state.plan or state.current_step_index >= len(state.plan.steps):
        state.error_message = "Invalid execution state"
        state.update_redis()
        return {"error_message": state.error_message}
    
    step = state.plan.steps[state.current_step_index]
    logger.info(f"Executing step {state.current_step_index+1}/{len(state.plan.steps)}: {step.tool_name}")
    state.update_redis()
    
    try:
        # Get and execute tool
        tool = get_tool_by_name(step.tool_name)
        result = tool.execute(step.params)
        
        # Update step status
        step.status = "completed"
        step.result = result
        state.intermediate_results.append(result)
        state.current_step_index += 1
        
        state.update_redis()
        return {
            "intermediate_results": state.intermediate_results,
            "current_step_index": state.current_step_index
        }
    except Exception as e:
        step.status = "failed"
        step.result = {"error": str(e)}
        state.error_message = f"Step execution failed: {str(e)}"
        state.update_redis()
        return {"error_message": state.error_message}

def validation_node(state: OrchestratorState) -> dict:
    """Validate the result of the last executed step"""
    if not state.plan or state.current_step_index == 0:
        return {}
    
    prev_index = state.current_step_index - 1
    step = state.plan.steps[prev_index]
    logger.info(f"Validating step {prev_index+1}: {step.tool_name}")
    
    try:
        validator = ValidationAgent()
        is_valid, message = validator.validate(
            step=step,
            result=step.result,
            intermediate_results=state.intermediate_results
        )
        
        if not is_valid:
            step.status = "failed"
            state.error_message = f"Validation failed: {message}"
            state.update_redis()
            return {"error_message": state.error_message}
        
        return {}
    except Exception as e:
        state.error_message = f"Validation error: {str(e)}"
        state.update_redis()
        return {"error_message": state.error_message}

def conditional_edge(state: OrchestratorState) -> str:
    """Determine next node based on current state"""
    if state.error_message:
        return "handle_failure"
    if state.current_step_index < len(state.plan.steps):
        return "execute_tool"
    return "finalize"

def handle_failure_node(state: OrchestratorState) -> dict:
    """Handle job failure"""
    logger.error(f"Job failed: {state.job_id} - {state.error_message}")
    state.update_redis()
    return {"final_result": None}

def finalize_node(state: OrchestratorState) -> dict:
    """Finalize successful job"""
    logger.info(f"Job completed: {state.job_id}")
    state.final_result = {"results": state.intermediate_results}
    state.update_redis()
    return {"final_result": state.final_result}

def create_workflow_graph() -> StateGraph:
    """Create and configure the state machine graph"""
    workflow = StateGraph(OrchestratorState)
    
    # Add nodes
    workflow.add_node("plan", planner_node)
    workflow.add_node("execute_tool", tool_executor_node)
    workflow.add_node("validate", validation_node)
    workflow.add_node("handle_failure", handle_failure_node)
    workflow.add_node("finalize", finalize_node)
    
    # Define edges
    workflow.set_entry_point("plan")
    workflow.add_edge("plan", "execute_tool")
    workflow.add_conditional_edges(
        "execute_tool",
        conditional_edge,
        {
            "execute_tool": "validate",
            "handle_failure": "handle_failure",
            "finalize": "finalize"
        }
    )
    workflow.add_conditional_edges(
        "validate",
        lambda s: "execute_tool" if not s.error_message else "handle_failure",
        {"execute_tool": "execute_tool", "handle_failure": "handle_failure"}
    )
    workflow.add_edge("handle_failure", END)
    workflow.add_edge("finalize", END)
    
    return workflow.compile()

# Global compiled graph
WORKFLOW_GRAPH = create_workflow_graph()