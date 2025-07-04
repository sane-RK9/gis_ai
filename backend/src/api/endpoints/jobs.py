import uuid
import logging
from fastapi import APIRouter, HTTPException
from src.core.schemas import (
    JobSubmitRequest, JobSubmitResponse, 
    JobStatus, JobResultResponse
)
from src.services import redis_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/jobs", response_model=JobSubmitResponse, status_code=202)
async def submit_job(request: JobSubmitRequest):
    """Accepts a new geospatial analysis job."""
    job_id = str(uuid.uuid4())
    
    # Create initial status
    initial_status = JobStatus(
        job_id=job_id, 
        status="pending", 
        progress=0, 
        message="Job accepted and queued for planning."
    )
    
    try:
        # Store the initial status
        if not redis_service.set_job_status(job_id, initial_status):
            logger.error(f"Failed to set initial status for job {job_id}")
            raise HTTPException(
                status_code=500, 
                detail="Failed to initialize job status"
            )
        
        # Push the job to the planner agent's queue
        if not redis_service.push_to_queue(
            redis_service.PLANNER_QUEUE, 
            {"job_id": job_id, "query": request.query}
        ):
            logger.error(f"Failed to push job {job_id} to planner queue")
            raise HTTPException(
                status_code=500, 
                detail="Failed to queue job for planning"
            )
            
        logger.info(f"Successfully submitted job {job_id}: {request.query}")
        return JobSubmitResponse(job_id=job_id)
        
    except Exception as e:
        logger.exception(f"Unexpected error submitting job {job_id}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )