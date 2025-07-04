import React from 'react';
import { Activity, Clock, CheckCircle, AlertCircle, Cpu, HardDrive } from 'lucide-react';

interface StatusBarProps {
  isProcessing: boolean;
  workflowSteps?: number;
  activeStep?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  isProcessing, 
  workflowSteps = 0, 
  activeStep = 0 
}) => {
  const systemMetrics = {
    cpu: '23%',
    memory: '1.2 GB',
    storage: '4.6 GB',
    connections: 3
  };

  return (
    <div className="bg-gray-850 border-t border-gray-700 px-6 py-2">
      <div className="flex items-center justify-between">
        {/* Left Side - Processing Status */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            {isProcessing ? (
              <>
                <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-sm text-blue-400">Processing</span>
                {workflowSteps > 0 && (
                  <span className="text-xs text-gray-400">
                    Step {activeStep} of {workflowSteps}
                  </span>
                )}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Ready</span>
              </>
            )}
          </div>

          {workflowSteps > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(activeStep / workflowSteps) * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-400">
                {Math.round((activeStep / workflowSteps) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Right Side - System Metrics */}
        <div className="flex items-center space-x-6 text-xs text-gray-400">
          <div className="flex items-center space-x-1">
            <Cpu className="w-3 h-3" />
            <span>CPU: {systemMetrics.cpu}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <HardDrive className="w-3 h-3" />
            <span>RAM: {systemMetrics.memory}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>Storage: {systemMetrics.storage}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>{systemMetrics.connections} connections</span>
          </div>
          
          <div className="text-gray-500">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};