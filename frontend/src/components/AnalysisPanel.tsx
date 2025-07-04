import React, { useState } from 'react';
import { BarChart3, TrendingUp, Target, Zap, Settings, Play, Download, Share2 } from 'lucide-react';

interface AnalysisPanelProps {
  isProcessing: boolean;
  onStartProcessing: () => void;
  onStopProcessing: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  isProcessing,
  onStartProcessing,
  onStopProcessing
}) => {
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>('flood-risk');

  const analysisTypes = [
    {
      id: 'flood-risk',
      name: 'Flood Risk Assessment',
      description: 'Analyze flood-prone areas using elevation and precipitation data',
      icon: TrendingUp,
      complexity: 'High',
      estimatedTime: '5-8 min',
      parameters: {
        elevation_threshold: 10,
        precipitation_weight: 0.7,
        buffer_distance: 500
      }
    },
    {
      id: 'site-suitability',
      name: 'Site Suitability Analysis',
      description: 'Find optimal locations based on multiple criteria',
      icon: Target,
      complexity: 'Medium',
      estimatedTime: '3-5 min',
      parameters: {
        distance_to_roads: 1000,
        slope_threshold: 15,
        land_use_restrictions: ['urban', 'water']
      }
    },
    {
      id: 'change-detection',
      name: 'Change Detection',
      description: 'Detect and quantify changes over time',
      icon: BarChart3,
      complexity: 'Medium',
      estimatedTime: '4-6 min',
      parameters: {
        time_period: '2020-2024',
        change_threshold: 0.3,
        analysis_type: 'ndvi'
      }
    },
    {
      id: 'hotspot-analysis',
      name: 'Hotspot Analysis',
      description: 'Identify statistically significant spatial clusters',
      icon: Zap,
      complexity: 'Low',
      estimatedTime: '2-3 min',
      parameters: {
        confidence_level: 0.95,
        neighbor_distance: 1000,
        analysis_field: 'intensity'
      }
    }
  ];

  const currentAnalysis = analysisTypes.find(a => a.id === selectedAnalysis);

  const startAnalysis = () => {
    onStartProcessing();
    // Simulate analysis completion
    setTimeout(() => {
      onStopProcessing();
    }, 5000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold">Analysis Tools</h2>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Configure and run geospatial analysis workflows
        </p>
      </div>

      {/* Analysis Types */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3 mb-6">
          {analysisTypes.map((analysis) => (
            <div
              key={analysis.id}
              className={`bg-gray-750 rounded-lg p-4 border-2 transition-all duration-200 cursor-pointer ${
                selectedAnalysis === analysis.id
                  ? 'border-emerald-500 bg-emerald-900 bg-opacity-20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setSelectedAnalysis(analysis.id)}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedAnalysis === analysis.id ? 'bg-emerald-600' : 'bg-gray-600'
                }`}>
                  <analysis.icon className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white">{analysis.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      analysis.complexity === 'High' ? 'bg-red-600' :
                      analysis.complexity === 'Medium' ? 'bg-yellow-600' : 'bg-green-600'
                    }`}>
                      {analysis.complexity}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-300 mt-1">{analysis.description}</p>
                  
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                    <span>Est. Time: {analysis.estimatedTime}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Configuration Panel */}
        {currentAnalysis && (
          <div className="bg-gray-750 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-4 h-4 text-gray-400" />
              <h3 className="font-medium text-white">Configuration</h3>
            </div>
            
            <div className="space-y-4">
              {Object.entries(currentAnalysis.parameters).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  
                  {typeof value === 'number' ? (
                    <input
                      type="number"
                      defaultValue={value}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : typeof value === 'string' ? (
                    <input
                      type="text"
                      defaultValue={value}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-2">
                      {value.map((item, index) => (
                        <span
                          key={index}
                          className="bg-gray-600 text-white px-2 py-1 rounded text-sm"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      defaultValue={JSON.stringify(value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-700">
        <div className="space-y-3">
          <button
            onClick={startAnalysis}
            disabled={isProcessing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium"
          >
            <Play className="w-4 h-4" />
            <span>{isProcessing ? 'Running Analysis...' : 'Start Analysis'}</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors flex items-center justify-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors flex items-center justify-center space-x-2">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};