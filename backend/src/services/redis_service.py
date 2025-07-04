import redis
import json
import logging
from typing import Optional, List, Dict, Any
from src.core.config import settings
from src.core.schemas import JobStatus, WorkflowPlan

logger = logging.getLogger(__name__)

# Redis Queue/Topic Names
PLANNER_QUEUE = "queue:planner"
EXECUTOR_QUEUE = "queue:executor"

# TTL for job data (7 days)
JOB_TTL = 7 * 24 * 60 * 60

# --- Corrected Connection Handling ---
# Create a single, globally shared connection pool.
# The redis-py library will manage connections from this pool automatically.
try:
    pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
except Exception as e:
    logger.critical(f"CRITICAL: Failed to create Redis connection pool: {e}")
    raise

# --- Job Status Functions ---

def job_exists(job_id: str) -> bool:
    """Checks if a job exists in the system."""
    try:
        r = redis.Redis(connection_pool=pool)
        # Check if either status or plan exists for this job
        return (
            r.exists(f"job_status:{job_id}") or 
            r.exists(f"job_plan:{job_id}")
        )
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis error checking job existence for {job_id}: {e}")
        return False

def set_job_status(job_id: str, status: JobStatus) -> bool:
    """Stores a job's status in Redis with TTL. Returns True on success."""
    try:
        r = redis.Redis(connection_pool=pool)
        key = f"job_status:{job_id}"
        result = r.setex(key, JOB_TTL, status.model_dump_json())
        if result:
            logger.info(f"Set status for job {job_id}: {status.status}")
            return True
        logger.error(f"Redis returned False when setting job status for {job_id}")
        return False
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis error setting job status for {job_id}: {e}")
        return False


def get_job_status(job_id: str) -> Optional[JobStatus]:
    """Retrieves a job's status from Redis."""
    try:
        r = redis.Redis(connection_pool=pool)
        status_json = r.get(f"job_status:{job_id}")
        if status_json:
            return JobStatus(**json.loads(status_json))
        return None
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis error getting job status for {job_id}: {e}")
        return None
    except json.JSONDecodeError:
        logger.error(f"JSON decode error for job status {job_id}")
        return None

# --- Workflow Plan Functions ---

def set_workflow_plan(job_id: str, plan: WorkflowPlan):
    """Stores a workflow plan in Redis with TTL."""
    try:
        r = redis.Redis(connection_pool=pool)
        key = f"job_plan:{job_id}"
        r.setex(key, JOB_TTL, plan.model_dump_json())
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis error setting workflow plan for {job_id}: {e}")

def get_workflow_plan(job_id: str) -> Optional[WorkflowPlan]:
    """Retrieves a workflow plan from Redis."""
    try:
        r = redis.Redis(connection_pool=pool)
        plan_json = r.get(f"job_plan:{job_id}")
        if plan_json:
            return WorkflowPlan(**json.loads(plan_json))
        return None
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis error getting workflow plan for {job_id}: {e}")
        return None
    except json.JSONDecodeError:
        logger.error(f"JSON decode error for workflow plan {job_id}")
        return None

# --- Queue Functions ---

def push_to_queue(queue_name: str, data: Dict[str, Any]):
    """Pushes a job (as a JSON string) to a Redis list (queue)."""
    try:
        r = redis.Redis(connection_pool=pool)
        r.lpush(queue_name, json.dumps(data))
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis error pushing to queue {queue_name}: {e}")

def pop_from_queue(queue_name: str, timeout: int = 0) -> Optional[Dict[str, Any]]:
    """Pops a job from a Redis list, blocking if timeout > 0."""
    try:
        r = redis.Redis(connection_pool=pool)
        item = r.brpop(queue_name, timeout)
        if item:
            return json.loads(item[1])
        return None
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis error popping from queue {queue_name}: {e}")
        return None
    except json.JSONDecodeError:
        logger.error(f"JSON decode error for item from queue {queue_name}")
        return None

# --- Health Check ---

from fastapi import APIRouter as router
from src.services import redis_service
# Create a FastAPI router for health checks
@router.get("/health")
def health_check() -> bool:
    """Performs a health check on the Redis connection."""
    """Check Redis connectivity"""
    if redis_service.health_check():
        return {"status": "ok", "redis": "connected"}
    return {"status": "error", "redis": "disconnected"}, 500