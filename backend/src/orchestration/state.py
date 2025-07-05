from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from src.core.schemas import WorkflowPlan, JobStatus

class OrchestratorState(BaseModel):
    # Inputs
    job_id: str
    query: str
    
    # State managed by the graph
    plan: Optional[WorkflowPlan] = None
    current_step_index: int = 0
    intermediate_results: List[Dict[str, Any]] = []
    error_message: Optional[str] = None
    
    # Final output
    final_result: Optional[Dict[str, Any]] = None
    
    def update_redis(self):
        """Update Redis with current state"""
        from src.services import redis_service
        if self.plan:
            redis_service.set_workflow_plan(self.job_id, self.plan)
        if self.error_message:
            status = JobStatus(
                job_id=self.job_id,
                status="failed",
                progress=self.calculate_progress(),
                message=self.error_message
            )
        elif self.final_result:
            status = JobStatus(
                job_id=self.job_id,
                status="completed",
                progress=100,
                message="Job completed successfully"
            )
        else:
            status = JobStatus(
                job_id=self.job_id,
                status="running",
                progress=self.calculate_progress(),
                message=self.get_status_message()
            )
        redis_service.set_job_status(self.job_id, status)
    
    def calculate_progress(self) -> int:
        """Calculate progress percentage"""
        if not self.plan:
            return 10  # Planning phase
        base = 25
        execution_range = 70
        total_steps = len(self.plan.steps)
        if total_steps == 0:
            return base
        step_progress = (self.current_step_index / total_steps) * execution_range
        return min(95, base + int(step_progress))
    
    def get_status_message(self) -> str:
        """Generate human-readable status message"""
        if not self.plan:
            return "Generating workflow plan..."
        
        if self.current_step_index < len(self.plan.steps):
            step = self.plan.steps[self.current_step_index]
            return f"Executing step {self.current_step_index+1}/{len(self.plan.steps)}: {step.description}"
        
        return "Finalizing results..."