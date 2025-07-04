import time
import logging
from typing import List, Dict, Any
from src.core.schemas import JobStatus, WorkflowPlan, WorkflowStep
from src.services import redis_service

logger = logging.getLogger(__name__)

class PlannerError(Exception):
    """Custom exception for planner-related errors."""
    pass

def _mock_llm_plan_generation(query: str) -> List[WorkflowStep]:
    """Mocks a call to an LLM to generate a plan."""
    logger.info(f"Generating plan for query: '{query}'")
    time.sleep(2)  # Simulate LLM thinking time

    # Simple query-based plan generation logic
    steps = []
    query_lower = query.lower()
    
    # Dynamic plan generation based on query content
    if "park" in query_lower and "flood" in query_lower:
        steps = [
            WorkflowStep(
                step_id="step_1",
                tool_name="stac_search",
                description="Search for Sentinel-2 satellite imagery over NYC for the last month.",
                params={"bbox": [-74.25, 40.5, -73.7, 40.9], "time_range": "2025-06-01/2025-07-01"},
            ),
            WorkflowStep(
                step_id="step_2",
                tool_name="flood_analysis",
                description="Identify flood-prone areas using historical flood data.",
                params={"flood_risk_threshold": 0.7},
            ),
            WorkflowStep(
                step_id="step_3",
                tool_name="suitability_analysis",
                description="Combine imagery and flood data to generate a park suitability map.",
                params={"exclude_flood_areas": True},
            ),
        ]
    elif "vegetation" in query_lower:
        steps = [
            WorkflowStep(
                step_id="step_1",
                tool_name="stac_search",
                description="Search for vegetation indices data.",
                params={"bbox": [-74.25, 40.5, -73.7, 40.9], "indices": ["NDVI", "EVI"]},
            ),
            WorkflowStep(
                step_id="step_2",
                tool_name="vegetation_analysis",
                description="Analyze vegetation health and coverage.",
                params={"vegetation_threshold": 0.5},
            ),
        ]
    else:
        # Default generic plan
        steps = [
            WorkflowStep(
                step_id="step_1",
                tool_name="stac_search",
                description="Search for relevant satellite imagery.",
                params={"bbox": [-74.25, 40.5, -73.7, 40.9], "time_range": "2025-06-01/2025-07-01"},
            ),
            WorkflowStep(
                step_id="step_2",
                tool_name="general_analysis",
                description="Perform general geospatial analysis.",
                params={},
            ),
        ]
    
    logger.info(f"Generated plan with {len(steps)} steps")
    return steps

def validate_plan(steps: List[WorkflowStep]) -> bool:
    """Validates that the generated plan is reasonable."""
    if not steps:
        return False
    
    # Check for required fields
    for step in steps:
        if not step.step_id or not step.tool_name or not step.description:
            return False
    
    # Check for duplicate step IDs
    step_ids = [step.step_id for step in steps]
    if len(step_ids) != len(set(step_ids)):
        return False
    
    return True

def process_planning_job(job_data: Dict[str, Any]) -> bool:
    """Processes a single planning job from the queue."""
    job_id = job_data.get("job_id")
    query = job_data.get("query")
    
    if not job_id or not query:
        logger.error("Invalid job data received - missing job_id or query")
        return False

    logger.info(f"Processing planning job: {job_id}")

    try:
        # 1. Update status to "planning"
        status = JobStatus(
            job_id=job_id, 
            status="planning", 
            progress=10, 
            message="Generating workflow plan..."
        )
        if not redis_service.set_job_status(job_id, status):
            logger.error(f"Failed to update job status to planning for {job_id}")
            return False

        # 2. Generate the plan (mock LLM call)
        steps = _mock_llm_plan_generation(query)
        
        # 3. Validate the plan
        if not validate_plan(steps):
            raise PlannerError("Generated plan failed validation")
        
        # 4. Store the plan
        plan = WorkflowPlan(job_id=job_id, steps=steps)
        if not redis_service.set_workflow_plan(job_id, plan):
            raise PlannerError("Failed to store workflow plan")

        # 5. Update status to "running" and push to executor queue
        status.status = "running"
        status.progress = 25
        status.message = "Plan complete. Starting execution..."
        
        if not redis_service.set_job_status(job_id, status):
            logger.error(f"Failed to update job status to running for {job_id}")
            return False
        
        # 6. Send the first step to the executor
        executor_job_data = {"job_id": job_id, "step_index": 0}
        if not redis_service.push_to_queue(redis_service.EXECUTOR_QUEUE, executor_job_data):
            raise PlannerError("Failed to push job to executor queue")
        
        logger.info(f"Successfully processed planning job: {job_id}")
        return True
        
    except PlannerError as e:
        logger.error(f"Planner error for job {job_id}: {e}")
        error_status = JobStatus(
            job_id=job_id, 
            status="failed", 
            progress=0,
            message=f"Planning failed: {str(e)}"
        )
        redis_service.set_job_status(job_id, error_status)
        return False
        
    except Exception as e:
        logger.error(f"Unexpected error processing planning job {job_id}: {e}")
        error_status = JobStatus(
            job_id=job_id, 
            status="failed", 
            progress=0,
            message=f"Planning failed: Unexpected error"
        )
        redis_service.set_job_status(job_id, error_status)
        return False