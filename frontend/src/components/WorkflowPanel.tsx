import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Download, Share2, Settings, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { WorkflowStep } from '../types/workflow';

interface WorkflowPanelProps {
  workflow: WorkflowStep[];
  isProcessing: boolean;
}

export const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  workflow,
  isProcessing,
}) => {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500/50';
      case 'running':
        return 'border-yellow-500/50';
      case 'failed':
        return 'border-red-500/50';
      default:
        return 'border-gray-600';
    }
  };
  
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workflow, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "workflow.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Workflow Status</h2>
            <p className="text-sm text-gray-400">
              {workflow.length} steps • {workflow.filter(s => s.status === 'completed').length} completed
            </p>
          </div>
          {/* Action buttons are now read-only or informational */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExport}
              disabled={workflow.length === 0}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="Export Workflow as JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isProcessing
                  ? 'bg-yellow-600/20 text-yellow-300'
                  : 'bg-green-600/20 text-green-300'
              }`}
            >
              {isProcessing ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isProcessing ? 'In Progress' : 'Idle'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="flex-1 overflow-y-auto p-4">
        {workflow.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-4" />
              <p className="font-medium">No workflow generated yet</p>
              <p className="text-sm">Use the AI Assistant to create a workflow from a query.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {workflow.map((step, index) => (
              <div key={step.step_id} className="relative pl-8">
                {/* Connection Line */}
                {index < workflow.length - 1 && (
                  <div className="absolute left-[15px] top-7 w-0.5 h-full bg-gray-700"></div>
                )}
                
                {/* Status Icon on the line */}
                <div className="absolute left-0 top-2 p-1 bg-gray-800 rounded-full">
                  {getStatusIcon(step.status)}
                </div>

                <div
                  className={`bg-gray-750 rounded-lg border ${getStatusColor(step.status)} transition-all duration-300 ${
                    selectedStepId === step.step_id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => setSelectedStepId(selectedStepId === step.step_id ? null : step.step_id)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white">{step.description}</h3>
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                        {step.tool_name}
                      </span>
                    </div>
                  </div>
                  
                  {selectedStepId === step.step_id && (
                    <div className="border-t border-gray-700 p-3 space-y-3">
                      {step.reasoning && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1 font-semibold">REASONING</div>
                          <div className="text-sm text-gray-300 bg-gray-700 p-2 rounded">
                            {step.reasoning}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-gray-400 mb-1 font-semibold">PARAMETERS</div>
                        <pre className="text-xs text-gray-300 bg-gray-700 p-2 rounded-md font-mono overflow-x-auto">
                          {JSON.stringify(step.params, null, 2)}
                        </pre>
                      </div>
                      {step.result && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1 font-semibold">RESULT</div>
                          <pre className="text-xs text-gray-300 bg-gray-700 p-2 rounded-md font-mono overflow-x-auto">
                           {JSON.stringify(step.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};