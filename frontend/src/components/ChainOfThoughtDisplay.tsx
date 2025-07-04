import React from 'react';
import { Brain, X, Clock, CheckCircle, AlertCircle, Terminal } from 'lucide-react';
import type { WorkflowStep } from '../types/workflow';

interface ChainOfThoughtDisplayProps {
  workflow: WorkflowStep[];
  onClose: () => void;
}

export const ChainOfThoughtDisplay: React.FC<ChainOfThoughtDisplayProps> = ({
  workflow,
  onClose
}) => {
  const getStatusIcon = (status: 'pending' | 'running' | 'completed' | 'failed') => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'running':
        return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  // Filter out any steps that don't have reasoning to get a "thought count"
  const thoughtCount = workflow.filter(step => step.reasoning).length;

  return (
    <div className="h-full flex flex-col bg-gray-800 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold">Chain of Thought</h3>
            <p className="text-xs text-gray-400">{thoughtCount} reasoning steps found</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content: A unified timeline view of reasoning and execution */}
      <div className="flex-1 overflow-y-auto p-4">
        {workflow.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-4" />
              <p className="font-medium">Awaiting Workflow</p>
              <p className="text-sm">The AI's reasoning process will appear here once a workflow is generated.</p>
            </div>
          </div>
        ) : (
          <ol className="relative border-l border-gray-700 ml-3">
            {workflow.map((step, index) => (
              <li key={step.step_id} className="mb-6 ml-6">
                {/* Icon on the timeline */}
                <span className="absolute flex items-center justify-center w-8 h-8 bg-gray-700 rounded-full -left-4 ring-4 ring-gray-800">
                  {getStatusIcon(step.status)}
                </span>
                
                <div className="p-4 bg-gray-750 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">
                      Step {index + 1}: {step.tool_name}
                    </h4>
                    <span className="bg-gray-700 text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {step.status}
                    </span>
                  </div>
                  
                  {/* The "Thought" or Reasoning */}
                  {step.reasoning ? (
                    <div className="p-3 mb-2 text-sm border border-purple-500/30 bg-purple-900/20 rounded-lg">
                      <p className="text-gray-300">{step.reasoning}</p>
                    </div>
                  ) : (
                    <div className="p-3 mb-2 text-sm border border-gray-600/50 bg-gray-700 rounded-lg">
                      <p className="text-gray-400 italic">No specific reasoning provided for this step.</p>
                    </div>
                  )}

                  {/* The "Action" or Tool Execution */}
                  <div className="p-3 text-sm border border-blue-500/30 bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-blue-300 mb-2">
                      <Terminal className="w-4 h-4" />
                      <span className="font-semibold">Action: Execute Tool</span>
                    </div>
                    <p className="text-gray-300">{step.description}</p>
                  </div>
                </div>
              </li>
            ))}
             <li className="ml-6">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-green-900 rounded-full -left-4 ring-4 ring-gray-800">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </span>
                 <div className="p-4 bg-gray-750 rounded-lg shadow-sm">
                    <h4 className="text-sm font-semibold text-white">Workflow Complete</h4>
                 </div>
             </li>
          </ol>
        )}
      </div>
    </div>
  );
};