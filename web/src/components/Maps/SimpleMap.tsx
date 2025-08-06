import React from 'react';
import { MapPin, Navigation2, Route } from 'lucide-react';
import { Location } from '../../types';
import { LocationService } from '../../services/locationService';

interface SimpleMapProps {
  center: Location;
  height?: string;
  markers?: Location[];
  showDirections?: boolean;
  destination?: Location;
  onLocationSelect?: (location: Location) => void;
}

const SimpleMap: React.FC<SimpleMapProps> = ({
  center,
  height = '400px',
  markers = [],
  showDirections = false,
  destination,
  onLocationSelect
}) => {
  const distance = destination ? LocationService.calculateDistance(center, destination) : null;
  const duration = destination ? LocationService.estimateDuration(distance || 0) : null;

  const handleMapClick = () => {
    if (onLocationSelect) {
      // Generate a nearby random location for demo
      const newLocation: Location = {
        lat: center.lat + (Math.random() - 0.5) * 0.01,
        lng: center.lng + (Math.random() - 0.5) * 0.01,
        address: `Near ${center.address || 'current location'}`,
        streetName: undefined,
        city: center.city,
        country: center.country,
        postalCode: undefined
      };
      onLocationSelect(newLocation);
    }
  };

  return (
    <div 
      className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-blue-200 relative overflow-hidden cursor-pointer hover:border-blue-300 transition-colors"
      style={{ height }}
      onClick={handleMapClick}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#60a5fa" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white rounded-lg shadow-md p-4 max-w-sm w-full">
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">Interactive Map</h3>
          
          {/* Current location */}
          <div className="bg-green-50 rounded-lg p-3 mb-3 text-left">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Current Location</span>
            </div>
            <p className="text-sm text-gray-700 truncate">
              {center.address || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`}
            </p>
            {center.city && (
              <p className="text-xs text-gray-500">{center.city}, {center.country}</p>
            )}
          </div>

          {/* Destination */}
          {destination && (
            <div className="bg-red-50 rounded-lg p-3 mb-3 text-left">
              <div className="flex items-center gap-2 mb-1">
                <Navigation2 className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Destination</span>
              </div>
              <p className="text-sm text-gray-700 truncate">{destination.address}</p>
              {destination.city && (
                <p className="text-xs text-gray-500">{destination.city}, {destination.country}</p>
              )}
            </div>
          )}

          {/* Route info */}
          {showDirections && destination && distance && (
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Route className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Route Information</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Distance:</span>
                <span className="font-medium">{distance.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{duration}</span>
              </div>
            </div>
          )}

          {/* Markers info */}
          {markers.length > 1 && (
            <div className="text-xs text-gray-500 mb-2">
              📍 {markers.length} locations marked
            </div>
          )}

          {onLocationSelect && (
            <p className="text-xs text-blue-600 mt-2">
              Click to select a location
            </p>
          )}
        </div>
      </div>

      {/* Corner indicator */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-80 rounded px-2 py-1">
        <span className="text-xs text-gray-600">📍 Map View</span>
      </div>
    </div>
  );
};

export default SimpleMap;
