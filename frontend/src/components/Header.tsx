import React from 'react';
import { Brain, Globe, Satellite } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Globe className="w-8 h-8 text-blue-400" />
              <Brain className="w-4 h-4 text-emerald-400 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GeoSpatial AI</h1>
              <p className="text-xs text-gray-400">Advanced Geospatial Analysis Platform</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          
          <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-full">
            <Satellite className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-300">Connected</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">U</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};