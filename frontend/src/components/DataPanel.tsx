import React, { useState } from 'react';
import { Database, Upload, Globe, Satellite, Map, BarChart, Search, Download, RefreshCw } from 'lucide-react';

interface DataPanelProps {
  selectedLayers: string[];
  onLayerChange: (layers: string[]) => void;
}

export const DataPanel: React.FC<DataPanelProps> = ({ selectedLayers, onLayerChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'layers' | 'sources' | 'upload'>('layers');

  const dataSources = [
    {
      id: 'satellite',
      name: 'Satellite Imagery',
      description: 'High-resolution satellite data from various providers',
      icon: Satellite,
      type: 'Raster',
      provider: 'Sentinel-2, Landsat',
      coverage: 'Global',
      resolution: '10-30m',
      updated: '2024-01-15',
      size: '2.3 GB'
    },
    {
      id: 'roads',
      name: 'Road Networks',
      description: 'Comprehensive road and transportation data',
      icon: Map,
      type: 'Vector',
      provider: 'OpenStreetMap',
      coverage: 'Global',
      resolution: 'Variable',
      updated: '2024-01-10',
      size: '450 MB'
    },
    {
      id: 'boundaries',
      name: 'Administrative Boundaries',
      description: 'Country, state, and local administrative boundaries',
      icon: Globe,
      type: 'Vector',
      provider: 'Natural Earth',
      coverage: 'Global',
      resolution: '1:10M',
      updated: '2023-12-01',
      size: '89 MB'
    },
    {
      id: 'elevation',
      name: 'Digital Elevation Model',
      description: 'Global elevation and terrain data',
      icon: BarChart,
      type: 'Raster',
      provider: 'SRTM, ASTER',
      coverage: 'Global',
      resolution: '30m',
      updated: '2023-11-15',
      size: '1.8 GB'
    }
  ];

  const toggleLayer = (layerId: string) => {
    if (selectedLayers.includes(layerId)) {
      onLayerChange(selectedLayers.filter(id => id !== layerId));
    } else {
      onLayerChange([...selectedLayers, layerId]);
    }
  };

  const filteredSources = dataSources.filter(source =>
    source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold">Data Sources</h2>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-gray-750 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'layers'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Layers
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'sources'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Sources
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Upload
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search data sources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'layers' && (
          <div className="space-y-3">
            {filteredSources.map((source) => (
              <div
                key={source.id}
                className={`bg-gray-750 rounded-lg p-4 border-2 transition-all duration-200 cursor-pointer ${
                  selectedLayers.includes(source.id)
                    ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => toggleLayer(source.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedLayers.includes(source.id) ? 'bg-blue-600' : 'bg-gray-600'
                  }`}>
                    <source.icon className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white">{source.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        source.type === 'Raster' ? 'bg-green-600' : 'bg-purple-600'
                      }`}>
                        {source.type}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-300 mt-1">{source.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-400">
                      <div>
                        <span className="font-medium">Provider:</span> {source.provider}
                      </div>
                      <div>
                        <span className="font-medium">Resolution:</span> {source.resolution}
                      </div>
                      <div>
                        <span className="font-medium">Updated:</span> {source.updated}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {source.size}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-4">
            <div className="bg-gray-750 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">Available APIs</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <span className="text-sm text-gray-300">Bhoonidhi API</span>
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Active</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <span className="text-sm text-gray-300">OpenStreetMap API</span>
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Active</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <span className="text-sm text-gray-300">NASA EarthData</span>
                  <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">Limited</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-750 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">Data Statistics</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Total Sources</div>
                  <div className="text-white font-semibold">{dataSources.length}</div>
                </div>
                <div>
                  <div className="text-gray-400">Active Layers</div>
                  <div className="text-white font-semibold">{selectedLayers.length}</div>
                </div>
                <div>
                  <div className="text-gray-400">Storage Used</div>
                  <div className="text-white font-semibold">4.6 GB</div>
                </div>
                <div>
                  <div className="text-gray-400">Last Updated</div>
                  <div className="text-white font-semibold">2 hrs ago</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">Upload Your Data</h3>
              <p className="text-gray-400 text-sm mb-4">
                Drag and drop files or click to browse
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                Choose Files
              </button>
            </div>

            <div className="bg-gray-750 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">Supported Formats</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-300">• Shapefiles (.shp)</div>
                <div className="text-gray-300">• GeoJSON (.geojson)</div>
                <div className="text-gray-300">• GeoTIFF (.tif)</div>
                <div className="text-gray-300">• KML (.kml)</div>
                <div className="text-gray-300">• CSV with coordinates</div>
                <div className="text-gray-300">• NetCDF (.nc)</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors flex items-center justify-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};