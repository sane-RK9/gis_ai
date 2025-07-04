import time
import random
import logging
from typing import Dict, Any, Optional
from src.core.schemas import JobStatus, WorkflowPlan, WorkflowStep
from src.services import redis_service

logger = logging.getLogger(__name__)

class ExecutionError(Exception):
    """Custom exception for execution-related errors."""
    pass

def _mock_tool_execution(step_id: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Mocks the secure execution of a geospatial tool."""
    logger.info(f"Executing step '{step_id}' with tool '{tool_name}' and params {params}")
    
    # Simulate different execution times based on tool type
    execution_times = {
        "stac_search": (1, 3),
        "flood_analysis": (2, 4),
        "vegetation_analysis": (1.5, 3.5),
        "buffer_analysis": (1, 2),
        "suitability_analysis": (3, 5),
        "general_analysis": (2, 4),
    }
    
    min_time, max_time = execution_times.get(tool_name, (1, 3))
    execution_time = random.uniform(min_time, max_time)
    time.sleep(execution_time)
    
    # Generate tool-specific mock results
    if tool_name == "stac_search":
        result = {
            "output_path": f"/data_workspace/{step_id}_stac_results.json",
            "data_size_mb": random.randint(5, 20),
            "items_found": random.randint(10, 50),
            "date_range": "2025-06-01/2025-07-01"
        }
    elif tool_name == "flood_analysis":
        result = {
            "output_path": f"/data_workspace/{step_id}_flood_risk.tif",
            "data_size_mb": random.randint(50, 200),
            "high_risk_areas": random.randint(5, 15),
            "risk_threshold": params.get("flood_risk_threshold", 0.7)
        }
    elif tool_name == "vegetation_analysis":
        result = {
            "output_path": f"/data_workspace/{step_id}_vegetation.tif",
            "data_size_mb": random.randint(30, 100),
            "vegetation_coverage": round(random.uniform(0.3, 0.8), 2),
            "indices_calculated": params.get("indices", ["NDVI"])
        }
    elif tool_name == "suitability_analysis":
        result = {
            "output_path": f"/data_workspace/{step_id}_suitability.tif",
            "data_size_mb": random.randint(40, 150),
            "suitable_areas": random.randint(8, 25),
            "excluded_flood_areas": params.get("exclude_flood_areas", False)
        }
    else:
        result = {
            "output_path": f"/data_workspace/{step_id}_output.tif",
            "data_size_mb": random.randint(10, 100),
            "status": "completed"
        }
    
    # Small chance of simulated tool failure for testing
    if random.random() < 0.05:  # 5% chance of failure
        raise ExecutionError(f"Tool {tool_name} failed during execution")
    
    logger.info(f"Step '{step_id}' completed successfully")
    return result

def calculate_progress(current_step: int, total_steps: int) -> int:
    """Calculate progress percentage for the current step."""
    base_progress = 25  # Planning is 25%
    execution_progress = 70  # Execution is 70% (25% to 95%)
    
    if total_steps == 0:
        return base_progress
    
    step_progress = (current_step / total_steps) * execution_progress
    return min(95, base_progress + int(step_progress))

def process_execution_job(job_data: Dict[str, Any]) -> bool:
    """Processes a single execution step from the queue."""
    job_id = job_data.get("job_id")
    step_index = job_data.get("step_index")
    
    if job_id is None or step_index is None:
        logger.error("Invalid job data received - missing job_id or step_index")
        return False

    logger.info(f"Processing execution job: {job_id}, step: {step_index}")

    try:
        # 1. Get the workflow plan
        plan = redis_service.get_workflow_plan(job_id)
        if not plan:
            raise ExecutionError("Workflow plan not found")
        
        if step_index >= len(plan.steps):
            raise ExecutionError(f"Step index {step_index} out of range")
        
        current_step = plan.steps[step_index]
        
        # 2. Update status to show current step execution
        progress = calculate_progress(step_index, len(plan.steps))
        status = JobStatus(
            job_id=job_id,
            status="running",
            progress=progress,
            message=f"Executing step {step_index + 1}/{len(plan.steps)}: {current_step.description}"
        )
        
        if not redis_service.set_job_status(job_id, status):
            logger.error(f"Failed to update job status for step {step_index}")
            return False

        # 3. Execute the tool
        result = _mock_tool_execution(current_step.step_id, current_step.tool_name, current_step.params)
        current_step.status = "completed"
        current_step.result = result
        
        # 4. Save the updated plan with the completed step
        if not redis_service.set_workflow_plan(job_id, plan):
            raise ExecutionError("Failed to save updated workflow plan")

        # 5. Check if there's a next step
        if step_index + 1 < len(plan.steps):
            # Push the next step to the queue
            next_step_index = step_index + 1
            next_progress = calculate_progress(next_step_index, len(plan.steps))
            next_status = JobStatus(
                job_id=job_id,
                status="running",
                progress=next_progress,
                message=f"Preparing step {next_step_index + 1}/{len(plan.steps)}: {plan.steps[next_step_index].description}"
            )
            
            if not redis_service.set_job_status(job_id, next_status):
                logger.error(f"Failed to update status for next step {next_step_index}")
                return False
            
            next_job_data = {"job_id": job_id, "step_index": next_step_index}
            if not redis_service.push_to_queue(redis_service.EXECUTOR_QUEUE, next_job_data):
                raise ExecutionError("Failed to push next step to executor queue")
            
            logger.info(f"Queued next step {next_step_index} for job {job_id}")
        else:
            # 6. This was the last step, mark the job as completed
            final_status = JobStatus(
                job_id=job_id, 
                status="completed", 
                progress=100, 
                message="Workflow completed successfully."
            )
            
            if not redis_service.set_job_status(job_id, final_status):
                logger.error(f"Failed to update final status for job {job_id}")
                return False
            
            logger.info(f"Job {job_id} completed successfully")
        
        return True
        
    except ExecutionError as e:
        logger.error(f"Execution error for job {job_id}, step {step_index}: {e}")
        
        # Update the failed step in the plan
        plan = redis_service.get_workflow_plan(job_id)
        if plan and step_index < len(plan.steps):
            plan.steps[step_index].status = "failed"
            plan.steps[step_index].result = {"error": str(e)}
            redis_service.set_workflow_plan(job_id, plan)
        
        # Set job status to failed
        error_status = JobStatus(
            job_id=job_id, 
            status="failed", 
            progress=calculate_progress(step_index, len(plan.steps) if plan else 1),
            message=f"Step '{step_index + 1}' failed: {str(e)}"
        )
        redis_service.set_job_status(job_id, error_status)
        return False
        
    except Exception as e:
        logger.error(f"Unexpected error processing execution job {job_id}, step {step_index}: {e}")
        
        error_status = JobStatus(
            job_id=job_id, 
            status="failed", 
            progress=0,
            message=f"Execution failed: Unexpected error"
        )
        redis_service.set_job_status(job_id, error_status)
        return False