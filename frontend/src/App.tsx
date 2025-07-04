import React, { useState } from 'react';
import { MapView } from './components/MapView';
import { ChatInterface } from './components/ChatInterface';
import { DataPanel } from './components/DataPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { WorkflowPanel } from './components/WorkflowPanel';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { ChainOfThoughtDisplay } from './components/ChainOfThoughtDisplay';
import type { WorkflowStep } from './types/workflow';

function App() {
  const [activePanel, setActivePanel] = useState<'data' | 'analysis' | 'workflow' | 'chat'>('chat');
  const [selectedLayers, setSelectedLayers] = useState<string[]>(['satellite']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowStep[]>([]);
  const [reasoning, setReasoning] = useState<string[]>([]);
  const [showReasoningPanel, setShowReasoningPanel] = useState(false);

  const handleWorkflowGeneration = (steps: WorkflowStep[], reasoningSteps: string[]) => {
    setCurrentWorkflow(steps);
    setReasoning(reasoningSteps);
    setShowReasoningPanel(true);
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-96 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Panel Navigation */}
          <div className="flex bg-gray-850 border-b border-gray-700">
            <button
              onClick={() => setActivePanel('data')}
              className={`flex-1 py-3 px-2 text-xs font-medium transition-colors ${
                activePanel === 'data'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              Data
            </button>
            <button
              onClick={() => setActivePanel('analysis')}
              className={`flex-1 py-3 px-2 text-xs font-medium transition-colors ${
                activePanel === 'analysis'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              Analysis
            </button>
            <button
              onClick={() => setActivePanel('workflow')}
              className={`flex-1 py-3 px-2 text-xs font-medium transition-colors ${
                activePanel === 'workflow'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              Workflow
            </button>
            <button
              onClick={() => setActivePanel('chat')}
              className={`flex-1 py-3 px-2 text-xs font-medium transition-colors ${
                activePanel === 'chat'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              AI Chat
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            {activePanel === 'data' && (
              <DataPanel
                selectedLayers={selectedLayers}
                onLayerChange={setSelectedLayers}
              />
            )}
            {activePanel === 'analysis' && (
              <AnalysisPanel
                isProcessing={isProcessing}
                onStartProcessing={() => setIsProcessing(true)}
                onStopProcessing={() => setIsProcessing(false)}
              />
            )}
            {activePanel === 'workflow' && (
              <WorkflowPanel
                workflow={currentWorkflow}
                isProcessing={isProcessing}
              />
            )}
            {activePanel === 'chat' && (
              <ChatInterface
                isProcessing={isProcessing}
                onStartProcessing={() => setIsProcessing(true)}
                onStopProcessing={() => setIsProcessing(false)}
                onWorkflowGenerated={handleWorkflowGeneration}
              />
            )}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative flex">
          <div className="flex-1">
            <MapView
              selectedLayers={selectedLayers}
              isProcessing={isProcessing}
              workflow={currentWorkflow}
            />
          </div>
          
          {/* Chain of Thought Panel */}
          {showReasoningPanel && (
            <div className="w-80 bg-gray-800 border-l border-gray-700">
              <ChainOfThoughtDisplay
                workflow={currentWorkflow}
                onClose={() => setShowReasoningPanel(false)}
              />
            </div>
          )}
        </div>
      </div>

      <StatusBar 
        isProcessing={isProcessing} 
        workflowSteps={currentWorkflow.length}
        activeStep={currentWorkflow.findIndex(step => step.status === 'running') + 1}
      />
    </div>
  );
}

export default App;