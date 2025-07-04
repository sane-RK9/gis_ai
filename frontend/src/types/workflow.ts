/**
 * Represents a single step in a geospatial analysis workflow.
 * This should mirror the Pydantic `WorkflowStep` schema in the backend.
 */
export interface WorkflowStep {
  step_id: string; 
  tool_name: string; 
  description: string;
  params: Record<string, any>; 
  status: 'pending' | 'running' | 'completed' | 'failed';
  
  // Optional fields that are added during or after execution
  result?: Record<string, any>;
  reasoning?: string; // Note: In our new design, reasoning is per-step
  
  // Frontend-only fields not expected from backend
  executionTime?: number; 
  error?: string;

  // These are part of the original design but are less critical now
  // as the backend manages the data flow. Can be kept for display.
  inputs?: string[]; 
  outputs?: string[];
}

/**
 * Represents a chat message in the UI. This is a frontend-only type
 * and is not directly sent to or received from the backend in this exact shape.
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
 * This should mirror the Pydantic `JobResultResponse` schema.
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
 * The structure of the status payload received from the backend.
 * This should mirror the Pydantic `JobStatus` schema.
 */
export interface JobStatusPayload {
  job_id: string;
  status: 'pending' | 'planning' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
}

// These types below are no longer needed for frontend-backend communication,
// but can be kept if components like DataPanel or AnalysisPanel use them internally.
// For our core workflow, they are not essential.

export interface DataSource {
  id: string;
  name: string;
  type: 'vector' | 'raster' | 'api' | 'database';
  description: string;
  // ... other fields if needed by UI components
}

export interface AnalysisResult {
  id: string;
  type: 'map' | 'chart' | 'statistics' | 'report';
  title: string;
  data: any;
  // ... other fields if needed by UI components
}