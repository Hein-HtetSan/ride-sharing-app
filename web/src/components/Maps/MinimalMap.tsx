import React from 'react';

const MinimalMap: React.FC = () => {
  return (
    <div 
      style={{ 
        height: '400px', 
        width: '100%',
        backgroundColor: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #d1d5db',
        borderRadius: '8px'
      }}
    >
      <div className="text-center p-4">
        <div className="text-2xl mb-2">🗺️</div>
        <div className="text-lg font-semibold text-gray-700 mb-2">Map Loading Test</div>
        <div className="text-sm text-gray-600">
          If you see this, React is working fine
        </div>
        <div className="mt-4 text-xs text-gray-500">
          Check browser console for Leaflet errors
        </div>
      </div>
    </div>
  );
};

export default MinimalMap;
