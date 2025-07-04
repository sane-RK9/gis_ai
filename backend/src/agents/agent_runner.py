import sys
import threading
import time
import logging
from dotenv import load_dotenv

# --- Configuration at the top ---
load_dotenv(dotenv_path=".env")

# Set up basic logging
# This will capture logs from all modules (agents, services, etc.)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Now import project modules after logging is configured
from src.services import redis_service
from src.agents import planner_agent, execution_agent

# --- Global flag for graceful shutdown ---
shutdown_flag = threading.Event()

def start_listener(queue_name, processor_func):
    """
    A generic listener function that runs in a thread.
    It continuously pops jobs from a queue and processes them.
    """
    logger.info(f"Starting listener for queue: {queue_name}")
    while not shutdown_flag.is_set():
        try:
            # Use a short timeout so the loop can check the shutdown_flag periodically
            job_data = redis_service.pop_from_queue(queue_name, timeout=1)
            if job_data:
                logger.info(f"[{queue_name}] Received job: {job_data.get('job_id', 'unknown')}")
                try:
                    # Process the job
                    processor_func(job_data)
                except Exception as e:
                    # Catch-all for unexpected errors within the processor function itself
                    logger.error(f"[{queue_name}] Unhandled exception processing job {job_data.get('job_id')}: {e}", exc_info=True)
        except redis_service.redis.exceptions.ConnectionError as e:
            logger.error(f"[{queue_name}] Redis connection error. Retrying in 5 seconds... Error: {e}")
            time.sleep(5)
        except Exception as e:
            logger.error(f"[{queue_name}] An unexpected error occurred in the listener loop: {e}", exc_info=True)
            # Avoid busy-looping on persistent errors
            time.sleep(5)

def main():
    """Starts all agent listeners and handles graceful shutdown."""
    logger.info("Initializing agent runners...")

    # Health check Redis before starting
    if not redis_service.health_check():
        logger.critical("Redis health check failed. Aborting agent runner startup.")
        sys.exit(1)

    logger.info("Redis connection successful. Starting agent threads...")

    threads = [
        threading.Thread(
            name="PlannerAgent",
            target=start_listener,
            args=(redis_service.PLANNER_QUEUE, planner_agent.process_planning_job)
        ),
        threading.Thread(
            name="ExecutionAgent",
            target=start_listener,
            args=(redis_service.EXECUTOR_QUEUE, execution_agent.process_execution_job)
        )
    ]

    for t in threads:
        t.daemon = True  # Allows main thread to exit even if daemonic threads are running
        t.start()

    # Wait for a keyboard interrupt (Ctrl+C)
    try:
        while True:
            # Keep the main thread alive to monitor worker threads
            # A more advanced implementation might check thread health here
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutdown signal received. Stopping agent listeners...")
        shutdown_flag.set()

    # Wait for all threads to finish their current task
    for t in threads:
        t.join(timeout=5)  # Wait up to 5 seconds for threads to finish cleanly
        if t.is_alive():
            logger.warning(f"Thread {t.name} did not terminate gracefully.")

    logger.info("Agent runners have been shut down.")

if __name__ == "__main__":
    main()