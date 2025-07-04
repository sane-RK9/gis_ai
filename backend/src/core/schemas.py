from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class JobSubmitRequest(BaseModel):
    query: str

class JobSubmitResponse(BaseModel):
    job_id: str

class JobStatus(BaseModel):
    job_id: str
    status: str  # "pending", "planning", "running", "completed", "failed"
    progress: int = 0
    message: Optional[str] = None

class WorkflowStep(BaseModel):
    step_id: str
    tool_name: str
    description: str
    params: Dict[str, Any]
    status: str = "pending"  # "pending", "completed", "failed"
    result: Optional[Dict[str, Any]] = None

class WorkflowPlan(BaseModel):
    job_id: str
    steps: List[WorkflowStep] = []

class JobResultResponse(BaseModel):
    job_id: str
    status: str
    plan: Optional[WorkflowPlan] = None
    final_result: Optional[Dict[str, Any]] = None