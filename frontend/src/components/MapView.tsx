import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Layers, Download, Share2, Target, MapPin, Activity, TrendingUp } from 'lucide-react';
import type { WorkflowStep } from '../types/workflow';

interface MapViewProps {
  selectedLayers: string[];
  isProcessing: boolean;
  workflow: WorkflowStep[];
}

export const MapView: React.FC<MapViewProps> = ({ selectedLayers, isProcessing, workflow }) => {
  const [zoom, setZoom] = useState(8);
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0060 });
  
  const layerStyles = {
    satellite: 'from-blue-900 via-blue-800 to-blue-700',
    roads: 'from-gray-800 via-gray-700 to-gray-600',
    boundaries: 'from-red-900 via-red-800 to-red-700',
    elevation: 'from-green-900 via-green-800 to-green-700',
  };

  // Simulate analysis results based on workflow
  const analysisResults = [
    { id: 'flood-risk', icon: Activity, color: 'text-red-400', value: '23%', label: 'High Risk Areas' },
    { id: 'elevation', icon: TrendingUp, color: 'text-green-400', value: '156m', label: 'Avg Elevation' },
    { id: 'coverage', icon: MapPin, color: 'text-blue-400', value: '2.3km²', label: 'Analysis Area' },
  ];

  return (
    <div className="relative h-full bg-gray-900 overflow-hidden">
      {/* Map Container */}
      <div className="absolute inset-0">
        {/* Simulated Map Background */}
        <div className={`w-full h-full bg-gradient-to-br ${layerStyles.satellite} relative`}>
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10"
               style={{
                 backgroundImage: `
                   linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                   linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                 `,
                 backgroundSize: '50px 50px'
               }}>
          </div>
          
          {/* Simulated Geographic Features */}
          <div className="absolute inset-0">
            {/* Rivers */}
            <div className="absolute top-1/3 left-1/4 w-2 h-48 bg-blue-400 opacity-30 transform rotate-45 rounded-full"></div>
            <div className="absolute top-1/2 right-1/3 w-1 h-32 bg-blue-400 opacity-30 transform -rotate-12 rounded-full"></div>
            
            {/* Urban Areas */}
            <div className="absolute top-1/4 left-1/3 w-24 h-24 bg-yellow-400 opacity-20 rounded-lg"></div>
            <div className="absolute bottom-1/3 right-1/4 w-32 h-20 bg-yellow-400 opacity-20 rounded-lg"></div>
            
            {/* Analysis Overlays */}
            {workflow.some(step => step.status === 'completed') && (
              <>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-red-500 opacity-20 rounded-full animate-pulse"></div>
                <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-green-500 opacity-20 rounded-full"></div>
                <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-blue-500 opacity-20 rounded-full"></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <div className="bg-gray-800 rounded-lg p-1 shadow-xl backdrop-blur-sm">
          <button
            onClick={() => setZoom(Math.min(zoom + 1, 18))}
            className="block w-10 h-10 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <ZoomIn className="w-5 h-5 mx-auto" />
          </button>
          <button
            onClick={() => setZoom(Math.max(zoom - 1, 1))}
            className="block w-10 h-10 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <ZoomOut className="w-5 h-5 mx-auto" />
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-1 shadow-xl backdrop-blur-sm">
          <button className="block w-10 h-10 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
            <Layers className="w-5 h-5 mx-auto" />
          </button>
          <button className="block w-10 h-10 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
            <Target className="w-5 h-5 mx-auto" />
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-1 shadow-xl backdrop-blur-sm">
          <button className="block w-10 h-10 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
            <Download className="w-5 h-5 mx-auto" />
          </button>
          <button className="block w-10 h-10 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
            <Share2 className="w-5 h-5 mx-auto" />
          </button>
        </div>
      </div>

      {/* Analysis Results Panel */}
      {workflow.some(step => step.status === 'completed') && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-gray-800 rounded-lg p-4 shadow-xl backdrop-blur-sm">
            <h3 className="text-white font-semibold mb-3">Analysis Results</h3>
            <div className="grid grid-cols-3 gap-4">
              {analysisResults.map((result) => (
                <div key={result.id} className="text-center">
                  <div className={`w-8 h-8 mx-auto mb-2 ${result.color}`}>
                    <result.icon className="w-full h-full" />
                  </div>
                  <div className="text-white font-bold text-lg">{result.value}</div>
                  <div className="text-gray-400 text-sm">{result.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <div className="text-white font-semibold">Processing Analysis</div>
                <div className="text-gray-400 text-sm">Executing geospatial workflow...</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coordinate Display */}
      <div className="absolute bottom-4 left-4 z-10 bg-gray-800 rounded px-3 py-1 text-sm text-gray-300 font-mono">
        {center.lat.toFixed(4)}, {center.lng.toFixed(4)} | Zoom: {zoom}
      </div>
    </div>
  );
};