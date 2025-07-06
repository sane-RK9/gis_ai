from langgraph.graph import StateGraph, END
from .state import OrchestratorState
from src.agents.planner import MockPlannerAgent as PlannerAgent
from src.agents.validator import MockValidationAgent as ValidationAgent
from src.tools.registry import get_tool_by_name
import logging

logger = logging.getLogger(__name__)

def planner_node(state: OrchestratorState) -> dict:
    logger.info(f"---PLANNER_NODE: Job {state.job_id}---") # USE DOT NOTATION
    state.update_redis()
    try:
        planner = PlannerAgent()
        plan = planner.generate_plan(state.query) # USE DOT NOTATION
        logger.info(f"Planner generated {len(plan.steps)} steps for job {state.job_id}")
        return {"plan": plan}
    except Exception as e:
        logger.error(f"Planning failed for job {state.job_id}: {e}", exc_info=True)
        return {"error_message": f"Planning failed: {str(e)}"}

def tool_executor_node(state: OrchestratorState) -> dict:
    logger.info(f"---TOOL_EXECUTOR_NODE: Job {state.job_id}, Step {state.current_step_index}---")
    
    plan = state.plan # USE DOT NOTATION
    current_step_index = state.current_step_index # USE DOT NOTATION

    if not plan or current_step_index >= len(plan.steps):
        return {"error_message": "Execution error: Attempted to run step out of bounds."}

    step = plan.steps[current_step_index]
    state.update_redis() 
    try:
        tool = get_tool_by_name(step.tool_name)
        result = tool.execute(step.params)
        
        step.status = "completed"
        step.result = result
        
        new_intermediate_results = state.intermediate_results + [result] # USE DOT NOTATION

        return {
            "plan": plan,
            "intermediate_results": new_intermediate_results,
        }
    except Exception as e:
        logger.error(f"Tool execution failed for job {state.job_id}, step {step.step_id}: {e}", exc_info=True)
        step.status = "failed"
        step.result = {"error": str(e)}
        return {"plan": plan, "error_message": f"Step '{step.description}' failed."}

def validation_and_increment_node(state: OrchestratorState) -> dict:
    logger.info(f"---VALIDATION_NODE: Job {state.job_id}, Step {state.current_step_index}---")
    next_step_index = state.current_step_index + 1 # USE DOT NOTATION
    return {"current_step_index": next_step_index}

def conditional_edge_router(state: OrchestratorState) -> str:
    logger.info(f"---ROUTER: Job {state.job_id}---")
    if state.error_message: # USE DOT NOTATION
        logger.warning(f"Routing job {state.job_id} to failure node due to error: {state.error_message}")
        return "handle_failure"
    if not state.plan or state.current_step_index >= len(state.plan.steps): # USE DOT NOTATION
        logger.info(f"Routing job {state.job_id} to finalize node.")
        return "finalize"
    
    logger.info(f"Routing job {state.job_id} to execute next tool.")
    return "execute_tool"

def handle_failure_node(state: OrchestratorState) -> None:
    logger.error(f"---FAILURE_NODE: Job {state.job_id} failed with message: {state.error_message}---")
    state.update_redis()

def finalize_node(state: OrchestratorState) -> dict:
    logger.info(f"---FINALIZE_NODE: Job {state.job_id} completed successfully.---")
    final_result = {"summary": "Workflow complete.", "outputs": state.intermediate_results}
    state.final_result = final_result # Update the state object
    state.update_redis()
    return {"final_result": final_result}

# The create_workflow_graph function needs to be updated for the new conditional edge syntax in LangGraph
def create_workflow_graph() -> StateGraph:
    workflow = StateGraph(OrchestratorState)
    
    workflow.add_node("plan", planner_node)
    workflow.add_node("execute_tool", tool_executor_node)
    workflow.add_node("validate_and_increment", validation_and_increment_node)
    workflow.add_node("handle_failure", handle_failure_node)
    workflow.add_node("finalize", finalize_node)
    
    workflow.set_entry_point("plan")
    
    # Conditional edge after planning
    workflow.add_conditional_edges(
        "plan",
        lambda state: "handle_failure" if state.error_message else "execute_tool"
    )

    # Conditional edge after tool execution
    workflow.add_conditional_edges(
        "execute_tool",
        lambda state: "handle_failure" if state.error_message else "validate_and_increment"
    )

    # Main routing logic
    workflow.add_conditional_edges(
        "validate_and_increment",
        conditional_edge_router,
        {
            "execute_tool": "execute_tool",
            "handle_failure": "handle_failure",
            "finalize": "finalize"
        }
    )
    workflow.add_edge("handle_failure", END)
    workflow.add_edge("finalize", END)
    
    return workflow.compile()

WORKFLOW_GRAPH = create_workflow_graph()