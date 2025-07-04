### **Backend Technical Specification: Geospatial AI Platform**


#### **1. Overview**

The backend serves as the engine for a geospatial AI platform. Its primary responsibilities are:
1.  To accept a natural language query from a user via a REST API.
2.  To use a Large Language Model (LLM) to interpret the query and generate a multi-step geospatial analysis plan (a "workflow").
3.  To execute each step of the workflow in sequence using various geospatial tools.
4.  To manage the state and progress of the job and make it available via the API.
5.  To return the final results of the analysis upon completion.

The system is designed to be asynchronous and robust, using Redis for state management and task queuing between decoupled agent processes.

#### **2. Core Technologies**

*   **Language:** Python 3.10+
*   **Web Framework:** FastAPI
*   **Data Validation:** Pydantic
*   **State & Queuing:** Redis
*   **Containerization:** Docker & Docker Compose
*   **Geospatial Libraries:** To be determined (e.g., GDAL, Rasterio, GeoPandas)

#### **3. Directory Structure**

The project must adhere to the following directory structure:

```
backend/
├── .env                  # Local environment secrets (e.g., LLM API keys)
├── .env.local            # Local Redis override for scripts run outside Docker
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
└── src/
    ├── api/
    │   ├── main.py
    │   └── endpoints/
    │       └── jobs.py
    ├── agents/
    │   ├── planner_agent.py
    │   ├── execution_agent.py
    │   └── agent_runner.py
    ├── core/
    │   ├── config.py
    │   └── schemas.py
    ├── services/
    │   ├── redis_service.py
    │   └── llm_service.py   # (To be implemented)
    └── tools/
        └── ...            # (To be implemented)
```

---

#### **4. API Contract (REST Endpoints)**

The backend must expose a REST API with the following endpoints, prefixed with `/api/v1`.

**A. `POST /jobs` - Submit a New Analysis Job**
*   **Description:** Starts a new geospatial analysis workflow. This endpoint must be **asynchronous** and return immediately.
*   **Request Body (JSON):**
    ```json
    {
      "query": "A natural language string describing the desired analysis."
    }
    ```
*   **Success Response (`202 Accepted`):**
    *   Immediately creates a job ID and an initial "pending" status in Redis.
    *   Pushes the job (`{job_id, query}`) to the `queue:planner` Redis queue.
    *   Returns the job ID to the client.
    ```json
    {
      "job_id": "a-unique-uuid-string"
    }
    ```
*   **Error Response (`422 Unprocessable Entity`):** If the request body is malformed.

**B. `GET /jobs/{job_id}/status` - Get Job Status**
*   **Description:** Allows the client to poll for the real-time status of a job.
*   **URL Parameter:** `job_id` (string).
*   **Success Response (`200 OK`):**
    *   Fetches the job's current status from the `job_status:{job_id}` key in Redis.
    *   Returns the status object. See `JobStatus` schema below.
*   **Error Response (`404 Not Found`):** If no job with the given `job_id` exists.

**C. `GET /jobs/{job_id}/results` - Get Job Results**
*   **Description:** Fetches the final results of a completed job.
*   **URL Parameter:** `job_id` (string).
*   **Success Response (`200 OK`):**
    *   Checks the job's status. If not "completed", it should return a `400 Bad Request`.
    *   Fetches the final workflow plan from `job_plan:{job_id}` in Redis.
    *   Constructs and returns the final result object. See `JobResultResponse` schema below.
*   **Error Response (`404 Not Found`):** If no job with the given `job_id` exists.
*   **Error Response (`400 Bad Request`):** If the job is not yet completed.

---

#### **5. Data Schemas (Pydantic Models)**

The file `src/core/schemas.py` must define the following Pydantic models. These models dictate the structure of data passed between agents and returned by the API.

```python
# In src/core/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

# --- API Request/Response Schemas ---

class JobSubmitRequest(BaseModel):
    query: str

class JobSubmitResponse(BaseModel):
    job_id: str

class JobResultResponse(BaseModel):
    job_id: str
    status: str
    plan: Optional["WorkflowPlan"] = None # Use string forward reference
    final_result: Optional[Dict[str, Any]] = None

# --- Internal State Schemas (stored in Redis) ---

class JobStatus(BaseModel):
    job_id: str
    status: str  # Must be one of: "pending", "planning", "running", "completed", "failed"
    progress: int = Field(0, ge=0, le=100) # Progress as a percentage 0-100
    message: Optional[str] = None

class WorkflowStep(BaseModel):
    step_id: str
    tool_name: str
    description: str
    params: Dict[str, Any]
    status: str = "pending" # "pending", "running", "completed", "failed"
    
    # Optional fields to be populated during/after execution
    result: Optional[Dict[str, Any]] = None
    reasoning: Optional[str] = None # The LLM's reason for choosing this step

class WorkflowPlan(BaseModel):
    job_id: str
    steps: List[WorkflowStep] = []

# Update forward reference
JobResultResponse.model_rebuild()
```

---

#### **6. Agent Logic and Responsibilities**

The agents are long-running Python scripts (`agent_runner.py`) that listen for tasks on Redis queues.

**A. Planner Agent (`planner_agent.py`)**
*   **Listens to:** `queue:planner` Redis queue.
*   **Trigger:** Receives a job dictionary: `{ "job_id": "...", "query": "..." }`.
*   **Responsibilities:**
    1.  Update the job status in Redis to `"planning"` with an appropriate message.
    2.  **(TO BE IMPLEMENTED)** Call an `LLMService` to generate a plan. The LLM's task is to convert the user's `query` into a structured list of `WorkflowStep` objects. The `reasoning` field for each step must be populated by the LLM.
    3.  **(CURRENT MOCK)** For now, a mock function can generate a hardcoded list of `WorkflowStep` objects.
    4.  Validate the generated plan (e.g., ensure required fields exist).
    5.  Save the complete `WorkflowPlan` object to the `job_plan:{job_id}` key in Redis.
    6.  Update the job status to `"running"`.
    7.  Push the first step to the executor queue: `redis.lpush('queue:executor', {"job_id": "...", "step_index": 0})`.
    8.  Handle all potential errors by setting the job status to `"failed"` with a descriptive message.

**B. Execution Agent (`execution_agent.py`)**
*   **Listens to:** `queue:executor` Redis queue.
*   **Trigger:** Receives a job dictionary: `{ "job_id": "...", "step_index": ... }`.
*   **Responsibilities:**
    1.  Fetch the full `WorkflowPlan` from `job_plan:{job_id}` in Redis.
    2.  Identify the correct step to execute using the `step_index`.
    3.  Update the job status to `"running"` with a message indicating which step is being executed (e.g., "Executing step 2/5: Buffer Analysis").
    4.  **(TO BE IMPLEMENTED)** Execute the tool specified in `step.tool_name` with the parameters from `step.params`. This should eventually happen in a secure sandbox like `gVisor`.
    5.  **(CURRENT MOCK)** For now, a mock function can simulate tool execution with a `time.sleep()` and return a mock result dictionary.
    6.  On success:
        *   Update the `status` and `result` fields of the current `WorkflowStep` within the `WorkflowPlan` object.
        *   Save the *entire updated `WorkflowPlan`* back to Redis.
        *   Check if there is a next step. If yes, push the next step to the `queue:executor` (`{ "job_id": "...", "step_index": ... }`).
        *   If it was the last step, update the final job status to `"completed"`.
    7.  On failure:
        *   Update the `status` of the current step to `"failed"`.
        *   Save the updated plan to Redis so the client can see which step failed.
        *   Set the final job status to `"failed"` with a descriptive error message.

#### **7. Services**

**A. Redis Service (`redis_service.py`)**
*   **Responsibility:** Centralize all interactions with Redis.
*   **Implementation:** Must provide functions for:
    *   `set_job_status`, `get_job_status`
    *   `set_workflow_plan`, `get_workflow_plan`
    *   `push_to_queue`, `pop_from_queue` (using blocking `brpop`)
    *   `health_check` (using `ping`)
*   **Connection Handling:** Must use a single, shared `redis.ConnectionPool` to manage connections efficiently across the application.

**B. LLM Service (`llm_service.py`) - To Be Implemented**
*   **Responsibility:** Abstract all interactions with a Large Language Model (e.g., OpenAI, Anthropic, or a local model).
*   **Future Implementation:** This service will take a user query and a system prompt, make an API call to the LLM, and be responsible for parsing the LLM's response into the structured `List[WorkflowStep]` format. It must be robust against malformed JSON responses from the LLM.



Here is the updated and significantly enhanced technical specification. I have integrated your demands for a more sophisticated orchestration layer, gVisor sandboxing, and a formal LangGraph-based tool integration.

---

### **Backend Technical Specification: Geospatial AI Platform (v2.0)**

**Version:** 2.0
**Date:** [Current Date]

#### **1. Overview & Architectural Principles**

This document specifies a backend for a local-first, open-source Geospatial AI platform. The architecture is designed around the following core principles:

1.  **Security First:** All external code and tool execution *must* occur within a secure sandbox to prevent supply chain attacks and ensure system integrity.
2.  **Modularity & Extensibility:** The system will use a formal tool registry and a graph-based orchestration engine (`LangGraph`) to allow for easy addition and composition of new geospatial tools.
3.  **Local & Open Source:** The entire stack, from the LLMs to the geospatial tools, will prioritize open-source, locally-runnable components. Cloud services are optional extensions.
4.  **Agentic Orchestration:** The workflow will be managed by a system of specialized, autonomous agents responsible for planning, tool selection, execution, and validation.

#### **2. Enhanced System Architecture**

The system is now explicitly layered:

```mermaid
graph TD
    subgraph "API Layer"
        A[FastAPI Gateway]
    end

    subgraph "Orchestration Layer"
        B[LangGraph State Machine<br><i>Manages Workflow State</i>]
        C[Planner Agent Node<br><i>(LLM-based)</i>]
        D[Tool Execution Node<br><i>(LangChain Tool Calling)</i>]
        E[Validation Agent Node<br><i>(LLM/Rule-based)</i>]
    end

    subgraph "Execution Layer"
        F[Secure Sandbox<br><i>gVisor (runsc)</i>]
        G[MCP Tool Subprocess<br><i>(GDAL, WhiteboxTools, etc.)</i>]
    end

    subgraph "Services & Data Layer"
        H[Redis<br><i>Job State & Queues</i>]
        I[LLM Service<br><i>(Ollama/vLLM)</i>]
        J[Vector DB<br><i>(ChromaDB for RAG)</i>]
    end

    A -- "POST /jobs" --> H
    B -- "Monitors Queue" --> H
    B --> C
    C -- "Generates Plan" --> B
    B -- "Routes to Executor" --> D
    D -- "Selects Tool" --> F
    F -- "Runs in Sandbox" --> G
    G -- "Returns Result" --> F
    F -- "Result" --> D
    D -- "Updates State" --> B
    B -- "Routes to Validator" --> E
    E -- "Validates Result" --> B
    B -- "Updates Job in" --> H

    C -- "Needs Knowledge" --> J
    C -- "Needs LLM" --> I
    E -- "Needs LLM" --> I
```

#### **3. Core Technologies (Updated)**

*   **Language:** Python 3.10+
*   **Web Framework:** FastAPI
*   **Orchestration:** **LangGraph** (to build the stateful, multi-agent graph).
*   **Tool Abstraction:** **LangChain** (for defining tools and enabling the LLM to call them).
*   **LLM Serving:** **Ollama** or **vLLM** (for running open-source models like Llama 3, Mixtral, or CodeLlama locally).
*   **Sandboxing:** **gVisor (runsc)**, integrated via Docker.
*   **State & Queuing:** Redis
*   **Vector DB (RAG):** ChromaDB

#### **4. Directory Structure (Updated)**

The structure is enhanced to accommodate the new layers.

```
backend/
├── .env
├── .env.local
├── docker-compose.yml
├── Dockerfile
└── src/
    ├── api/
    │   ├── main.py
    │   └── endpoints/
    │       └── jobs.py
    ├── agents/             # <-- High-level agent definitions
    │   ├── planner.py
    │   └── validator.py
    ├── orchestration/      # <-- NEW: LangGraph implementation
    │   ├── graph.py        # Defines the LangGraph state machine and nodes
    │   └── state.py        # Pydantic model for the graph's state
    │   └── runner.py       # Main process to run the orchestrator
    ├── core/
    │   ├── config.py
    │   └── schemas.py
    ├── services/
    │   ├── redis_service.py
    │   ├── llm_service.py    # Now interfaces with Ollama/vLLM
    │   └── sandbox_service.py # <-- NEW: Logic for running commands in gVisor
    └── tools/
        ├── base.py           # LangChain BaseTool definition
        ├── gdal_tools.py     # Example: gdal_translate, gdal_warp
        └── whitebox_tools.py # Example: breach_depressions, buffer
        └── registry.py       # Discovers and registers all available tools
```

---

#### **5. API Contract & Schemas**

The public-facing API contract remains the **same** as in v1.0. This is crucial as it decouples the frontend from these significant backend changes. The Pydantic schemas in `src/core/schemas.py` also remain the same for API responses.

However, the internal state management is now more sophisticated.

**`src/orchestration/state.py` (New)**
This file defines the state object that is passed between the nodes of our LangGraph.

```python
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
```

---

#### **6. Agent & Orchestration Logic**

The previous `agent_runner.py` is now replaced by a more powerful `orchestration/runner.py` that runs the LangGraph state machine.

**`src/orchestration/graph.py` (New)**
*   **Responsibility:** Define and wire together the agentic graph.
*   **Implementation:**
    1.  Define the `OrchestratorState` as the graph's state object.
    2.  Create **Nodes:**
        *   `planner_node`: Takes `state.query`, calls the `PlannerAgent`, and updates `state.plan`.
        *   `tool_executor_node`: The main workhorse. It looks at the `state.current_step_index` and the `state.plan`. It uses a LangChain LLM with tool-calling capabilities to select the appropriate tool from the `tools/registry.py`. It then executes the tool via the `SandboxService` and appends the result to `state.intermediate_results`.
        *   `validation_node`: (Optional but recommended) Takes an intermediate result, uses an LLM or rules to check its validity, and can either approve it or set `state.error_message`.
    3.  Define **Edges (Routing Logic):**
        *   `entry_point -> planner_node`
        *   `planner_node -> tool_executor_node`
        *   `tool_executor_node` has conditional routing:
            *   If there is another step in the plan, loop back to `tool_executor_node` with an incremented `current_step_index`.
            *   If all steps are complete, go to `END`.
            *   If an error occurred, go to `END`.
    4.  Compile the graph into a `LangGraph.compile()` object.

**`src/orchestration/runner.py` (New)**
*   **Responsibility:** The main process that listens to Redis and executes workflows using the compiled graph.
*   **Implementation:**
    1.  Listens to the `job:submitted` queue on Redis.
    2.  For each job, initializes the `OrchestratorState`.
    3.  Invokes the compiled LangGraph with the initial state: `graph.invoke(initial_state)`.
    4.  LangGraph handles the step-by-step execution internally. The runner's job is to stream the state changes from the graph back to Redis, updating the `JobStatus` for the polling frontend.

---

#### **7. Secure Execution Layer**

**A. `src/services/sandbox_service.py` (New)**
*   **Responsibility:** Abstract the logic of running a command inside a secure sandbox.
*   **Implementation:**
    *   Provides a function like `run_in_sandbox(command: List[str]) -> (stdout, stderr, return_code)`.
    *   This function uses Python's `subprocess` module to execute a `docker exec` command targeting a dedicated, sandboxed container.
    *   **Command:** `docker exec gvisor-worker gdal_translate ...`

**B. `docker-compose.yml` (Updated)**
A new, sandboxed worker service must be added.

```yaml
services:
  # ... redis and api services remain ...

  gvisor-worker:
    image: my-geospatial-tools-image # An image with GDAL, WhiteboxTools, etc. installed
    runtime: runsc # CRITICAL: This tells Docker to use the gVisor runtime
    entrypoint: ["sleep", "infinity"] # Keep the container running to accept exec commands
```

**C. `Dockerfile` for `gvisor-worker`**
A separate `Dockerfile` will be needed to build the `my-geospatial-tools-image`. It will be a simple image that installs all the necessary command-line geospatial tools.

**D. Host Setup**
The backend developer's host machine must have **gVisor installed and configured** as a Docker runtime. Instructions for this are in the official gVisor documentation.

---

#### **8. Tool Definition (LangChain Integration)**

The `tools/` directory is now more formal.

**`src/tools/base.py` (New)**
*   **Responsibility:** Define the base class for all tools using LangChain's `BaseTool`.
*   **Implementation:**
    ```python
    from langchain_core.tools import BaseTool
    from pydantic import BaseModel, Field

    class GdalToolInput(BaseModel):
        # Pydantic model defining the inputs for a specific tool
        input_file: str = Field(description="Path to the input raster file.")
        # ... other params

    class GdalTranslateTool(BaseTool):
        name: str = "gdal_translate"
        description: str = "Converts raster data between different formats."
        args_schema: type[BaseModel] = GdalToolInput

        def _run(self, **kwargs) -> str:
            # 1. Construct the command-line arguments from kwargs
            # 2. Call sandbox_service.run_in_sandbox(command)
            # 3. Check for errors and return the path to the output file or an error message.
            ...
    ```

This specification provides a clear and detailed roadmap for your backend developer. It addresses your advanced requirements, establishing a secure, scalable, and modern architecture while adhering to local-first and open-source principles.