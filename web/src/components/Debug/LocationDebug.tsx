import React from 'react';
import { Location } from '../../types';

interface LocationDebugProps {
  location: Location | null;
}

export const LocationDebug: React.FC<LocationDebugProps> = ({ location }) => {
  if (!location) return null;

  const { lat, lng } = location;
  
  // Analyze coordinates
  const analysis = {
    lat_valid: lat >= -90 && lat <= 90,
    lng_valid: lng >= -180 && lng <= 180,
    likely_swapped: Math.abs(lng) > 90 && Math.abs(lat) < 90,
    region: {
      northern: lat > 0,
      southern: lat < 0,
      eastern: lng > 0,
      western: lng < 0
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
      <div className="text-yellow-400 font-bold mb-2">🔍 GPS COORDINATES DEBUG</div>
      
      <div className="space-y-1">
        <div>📍 <span className="text-green-400">Latitude:</span> {lat}</div>
        <div>📍 <span className="text-blue-400">Longitude:</span> {lng}</div>
        <div>📍 <span className="text-purple-400">Address:</span> {location.address}</div>
      </div>
      
      <div className="border-t border-gray-600 mt-2 pt-2">
        <div className="text-yellow-400 font-semibold">Analysis:</div>
        <div className={analysis.lat_valid ? 'text-green-400' : 'text-red-400'}>
          Lat Range: {analysis.lat_valid ? '✅ Valid' : '❌ Invalid'} (-90 to 90)
        </div>
        <div className={analysis.lng_valid ? 'text-green-400' : 'text-red-400'}>
          Lng Range: {analysis.lng_valid ? '✅ Valid' : '❌ Invalid'} (-180 to 180)
        </div>
        {analysis.likely_swapped && (
          <div className="text-orange-400">⚠️ Coordinates might be swapped!</div>
        )}
      </div>
      
      <div className="border-t border-gray-600 mt-2 pt-2">
        <div className="text-yellow-400 font-semibold">Region:</div>
        <div>🌍 {analysis.region.northern ? 'Northern' : 'Southern'} Hemisphere</div>
        <div>🌍 {analysis.region.eastern ? 'Eastern' : 'Western'} Hemisphere</div>
      </div>
      
      <div className="border-t border-gray-600 mt-2 pt-2">
        <div className="text-yellow-400 font-semibold">Quick Actions:</div>
        <div className="text-gray-400">Use the Swap button to test coordinate order</div>
      </div>
    </div>
  );
};

export default LocationDebug;
