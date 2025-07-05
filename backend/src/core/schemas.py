from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

# --- API Request/Response Schemas (for FastAPI endpoints) ---

class JobSubmitRequest(BaseModel):
    """Schema for the initial job submission request from the client."""
    query: str

class JobSubmitResponse(BaseModel):
    """Schema for the immediate response after submitting a job."""
    job_id: str

class JobResultResponse(BaseModel):
    """
    Schema for the final results payload sent to the client when a job is complete.
    This is what the frontend's GET /results/{job_id} call will receive.
    """
    job_id: str
    status: str  # Will always be "completed" for this response
    plan: Optional["WorkflowPlan"] = None  # The full, executed plan
    final_result: Optional[Dict[str, Any]] = None

# --- Internal State & Communication Schemas ---

class JobStatus(BaseModel):
    """
    Schema for the job status object stored in Redis and returned by the GET /status endpoint.
    This represents the real-time state of a job.
    """
    job_id: str
    status: str = Field(..., description='Must be one of: "pending", "planning", "running", "completed", "failed"')
    progress: int = Field(0, ge=0, le=100, description="Progress as a percentage 0-100")
    message: Optional[str] = None

class WorkflowStep(BaseModel):
    """
    Schema for a single step within a workflow plan. This is the core data structure
    that the LLM planner must generate.
    """
    step_id: str
    tool_name: str
    description: str = Field(..., description="A human-readable description of what this step does.")
    params: Dict[str, Any] = Field(default_factory=dict, description="Parameters to be passed to the tool.")
    status: str = "pending"  # "pending", "running", "completed", "failed"
    
    # --- CRITICAL ADDITION ---
    # This field MUST be populated by the Planner Agent.
    reasoning: Optional[str] = Field(None, description="The LLM's justification for why this step is necessary.")
    
    # This field is populated by the Execution Agent.
    result: Optional[Dict[str, Any]] = None

class WorkflowPlan(BaseModel):
    """
    Schema for the complete workflow plan, which is stored in Redis.
    It contains the list of all steps to be executed.
    """
    job_id: str
    steps: List[WorkflowStep] = []

# This line is important. It allows Pydantic to resolve the string "WorkflowPlan"
# in the JobResultResponse model after the WorkflowPlan class has been defined.
JobResultResponse.model_rebuild()