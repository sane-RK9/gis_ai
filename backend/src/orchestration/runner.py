import time
import logging
import threading
from src.services import redis_service
from .graph import WORKFLOW_GRAPH
from .state import OrchestratorState
from src.core.schemas import JobStatus


logger = logging.getLogger(__name__)

class OrchestrationRunner:
    def __init__(self):
        self.shutdown_flag = threading.Event()
        self.graph = WORKFLOW_GRAPH

    def process_job(self, job_data: dict):
        """Process a single job using the state machine"""
        job_id = job_data.get("job_id")
        query = job_data.get("query")
        
        if not job_id or not query:
            logger.error("Invalid job data received")
            return
        
        logger.info(f"Starting orchestration for job: {job_id}")
        
        try:
            # Initialize state
            initial_state = OrchestratorState(job_id=job_id, query=query)
            initial_state.update_redis()
            
            # Execute workflow
            self.graph.invoke(initial_state)
            
        except Exception as e:
            logger.error(f"Orchestration failed for job {job_id}: {str(e)}")
            redis_service.set_job_status(job_id, JobStatus(
                job_id=job_id,
                status="failed",
                progress=0,
                message=f"Orchestration error: {str(e)}"
            ))

    def start(self):
        """Start listening for jobs"""
        logger.info("Orchestration runner started")
        while not self.shutdown_flag.is_set():
            try:
                job_data = redis_service.pop_from_queue(
                    redis_service.PLANNER_QUEUE, 
                    timeout=1
                )
                if job_data:
                    self.process_job(job_data)
            except Exception as e:
                logger.error(f"Error in orchestration runner: {str(e)}")
                time.sleep(5)

    def stop(self):
        """Stop the runner"""
        self.shutdown_flag.set()
        logger.info("Orchestration runner stopped")

def main():
    """Entry point for orchestration runner"""
    runner = OrchestrationRunner()
    
    try:
        runner.start()
    except KeyboardInterrupt:
        runner.stop()

if __name__ == "__main__":
    main()