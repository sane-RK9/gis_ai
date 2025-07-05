/**
 * Represents a single step in a geospatial analysis workflow.
 * This MUST mirror the Pydantic `WorkflowStep` schema from the Python backend.
 */
export interface WorkflowStep {
  step_id: string;
  tool_name: string;
  description: string;
  params: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';

  // --- Data from the backend ---
  // The LLM's justification for this step.
  reasoning?: string; 
  // The output from the tool execution.
  result?: Record<string, any>;
}

/**
 * Represents a chat message in the UI. This is a frontend-only type
 * used for managing the chat display.
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // A message from the assistant can contain the completed workflow
  workflow?: WorkflowStep[];
}

/**
 * The structure of the final results payload received from the backend.
 * This MUST mirror the Pydantic `JobResultResponse` schema.
 */
export interface JobResultPayload {
  job_id: string;
  status: 'completed';
  plan: {
    job_id: string;
    steps: WorkflowStep[];
  };
  final_result: Record<string, any>;
}

/**
 * The structure of the status payload received from the backend during polling.
 * This MUST mirror the Pydantic `JobStatus` schema.
 */
export interface JobStatusPayload {
  job_id: string;
  status: 'pending' | 'planning' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
}