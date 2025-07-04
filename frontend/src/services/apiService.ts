import { API_BASE_URL } from '../Config';
import type { WorkflowStep } from '../types/workflow';


export interface JobStatus {
  job_id: string;
  status: 'pending' | 'planning' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
}

export interface JobResult {
  job_id: string;
  status: 'completed';
  plan: {
    steps: WorkflowStep[];
  };
  final_result: Record<string, any>;
}

class ApiService {
  async submitJob(query: string): Promise<{ job_id: string }> {
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      throw new Error('Failed to submit job to the backend.');
    }
    return response.json();
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch status for job ${jobId}.`);
    }
    return response.json();
  }

  async getJobResult(jobId: string): Promise<JobResult> {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/results`);
    if (!response.ok) {
      throw new Error(`Failed to fetch results for job ${jobId}.`);
    }
    return response.json();
  }
}

export const apiService = new ApiService();