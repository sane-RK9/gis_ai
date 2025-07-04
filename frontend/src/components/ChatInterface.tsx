import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, Loader2, FileText, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import type { ChatMessage, WorkflowStep } from '../types/workflow';
import { apiService} from '../services/apiService';
import type { JobResult, JobStatus } from '../services/apiService';

interface ChatInterfaceProps {
  isProcessing: boolean;
  onStartProcessing: () => void;
  onStopProcessing: () => void;
  onWorkflowGenerated: (workflow: WorkflowStep[], reasoning: string[]) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  isProcessing,
  onStartProcessing,
  onStopProcessing,
  onWorkflowGenerated
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI geospatial analysis assistant powered by advanced Chain-of-Thought reasoning. I can help you create complex spatial workflows using natural language.\n\nTry asking me:\n• "Create a flood risk assessment for New York City"\n• "Find suitable locations for solar farms in California"',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Utility Functions ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // --- Job Polling Effect ---
  useEffect(() => {
    // Only poll if we have a job ID and are in a processing state
    if (!currentJobId || !isProcessing) return;

    const poll = async () => {
      try {
        const status: JobStatus = await apiService.getJobStatus(currentJobId);
        
        // Update the last assistant message with the latest progress
        setMessages(prev => prev.map((msg, index) => 
          (index === prev.length - 1 && msg.role === 'assistant') 
            ? { ...msg, content: `🧠 ${status.message}` } 
            : msg
        ));

        if (status.status === 'completed' || status.status === 'failed') {
          handleJobCompletion(currentJobId, status.status);
        }
      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error fetching status.";
        addAssistantMessage(`❌ Error fetching job status: ${errorMessage}`);
        onStopProcessing();
        setCurrentJobId(null);
      }
    };
    
    // Use a timeout-based loop for polling instead of setInterval
    // This prevents multiple requests from stacking up if one takes too long
    const timerId = setTimeout(poll, 2000);

    return () => clearTimeout(timerId);
  }, [currentJobId, isProcessing]);

  // --- Message and Job Handling ---
  const addAssistantMessage = (content: string, workflow?: WorkflowStep[]) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      workflow,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputText;
    setInputText('');
    onStartProcessing();

    addAssistantMessage("Roger that. Analyzing your request and dispatching to the planning agent...");

    try {
      const { job_id } = await apiService.submitJob(currentQuery);
      setCurrentJobId(job_id); // This will trigger the polling useEffect
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addAssistantMessage(`❌ **Error**: Failed to submit job to the backend.\n\n**Details**: ${errorMessage}`);
      onStopProcessing();
    }
  };
  
  const handleJobCompletion = async (jobId: string, status: string) => {
    if (status === 'completed') {
      try {
        const results: JobResult = await apiService.getJobResult(jobId);
        const workflow = results.plan.steps;
        
        // Extract reasoning from each step in the plan
        const reasoning = workflow
          .map((step, index) => step.reasoning || `Step ${index+1}: Execute ${step.tool_name} for ${step.step_id}.`)
          .filter(r => r); // Filter out any empty reasoning strings
        
        onWorkflowGenerated(workflow, reasoning);
        addAssistantMessage(`✅ **Analysis Complete!**\n\nI've finished the workflow. You can now review the detailed plan and results in the 'Workflow' and 'Chain of Thought' panels.`, workflow);
      
      } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addAssistantMessage(`❌ **Error**: Failed to fetch job results.\n\n**Details**: ${errorMessage}`);
      }
    } else { // status === 'failed'
      addAssistantMessage(`❌ **Job Failed**. Please check the agent logs on the backend for more details.`);
    }

    onStopProcessing();
    setCurrentJobId(null);
  };
  
  const handleReset = () => {
    setMessages([messages[0]]); // Keep only the initial welcome message
    setInputText('');
    setCurrentJobId(null);
    onStopProcessing();
    onWorkflowGenerated([], []);
  }

  const sampleQueries = [
    "Create a flood risk assessment for coastal areas using elevation data",
    "Find optimal locations for wind farms considering terrain and infrastructure",
    "Analyze urban heat island effects using satellite imagery",
    "Detect deforestation patterns in tropical regions over the past 5 years",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">AI Geospatial Assistant</h2>
          </div>
          <button 
            onClick={handleReset} 
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
            title="Reset Chat"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Natural language to geospatial workflow generation
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 ${
                message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.workflow && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="flex items-center space-x-2 text-sm text-emerald-300">
                    <FileText className="w-4 h-4" />
                    <span>Generated {message.workflow.length} workflow steps.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Sample Queries */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-sm text-gray-400 mb-3">💡 Try an example:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
          {sampleQueries.map((query, index) => (
            <button
              key={index}
              onClick={() => setInputText(query)}
              disabled={isProcessing}
              className="text-left text-sm p-2 rounded transition-colors bg-gray-750 hover:bg-gray-700 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Describe your geospatial analysis task..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !inputText.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg px-4 py-3 transition-colors flex items-center space-x-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};