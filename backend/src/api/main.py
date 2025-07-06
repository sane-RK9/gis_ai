import logging
from fastapi import FastAPI
from fastapi import HTTPException
from contextlib import asynccontextmanager
from src.services import redis_service
from fastapi.middleware.cors import CORSMiddleware
from src.api.endpoints import jobs

app = FastAPI(
    title="Geospatial LLM System API",
    description="API for managing and executing geospatial analysis workflows.",
    version="0.1.0",
)

# Configure CORS to allow the Streamlit frontend to communicate with the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your Streamlit app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api/v1", tags=["Jobs"])

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Geospatial LLM System API"}

# Health Check Endpoint
@app.get("/api/v1/health", tags=["Health"])
def get_health():
    """Checks the health of the service and its dependencies."""
    if redis_service.health_check():
        return {"status": "ok", "redis_connection": "ok"}
    else:
        raise HTTPException(status_code=503, detail="Service Unavailable: Cannot connect to Redis")
    
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger = logging.getLogger(__name__)
    if not redis_service.health_check():
        logger.critical("Failed to connect to Redis on startup")
        # Consider exiting if Redis is critical
        # import sys; sys.exit(1)
    else:
        logger.info("Successfully connected to Redis")
    yield
    # Place any shutdown logic here if needed