import React, { useState, useEffect } from 'react';
import GoogleMap from './GoogleMap';
import SimpleMap from './SimpleMap';
import SimpleLeaflet from './SimpleLeaflet';
import { Location } from '../../types';

// Extend window type for Google Maps error handling
declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

interface MapSwitchProps {
  center: Location;
  height?: string;
  markers?: Location[];
  onLocationSelect?: (location: Location) => void;
  showDirections?: boolean;
  destination?: Location;
  drivers?: Array<{ id: string; location: Location; name: string }>;
}

const MapSwitch: React.FC<MapSwitchProps> = (props) => {
  const [useSimpleMap, setUseSimpleMap] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(false);
  const apiKey = import.meta.env.VITE_REACT_APP_GOOGLE_MAPS_API_KEY;

  // Debug logging
  console.log('MapSwitch props:', props);
  console.log('Center location:', props.center);
  console.log('Props center coords:', props.center?.lat, props.center?.lng);
  
  // Ensure we have a valid center with fallback to Yangon
  const safeCenter = props.center || {
    lat: 16.8661,
    lng: 96.1951,
    address: 'Yangon, Myanmar (fallback)',
    city: 'Yangon',
    country: 'Myanmar'
  };
  
  console.log('Using center:', safeCenter);

  // Listen for map toggle events
  useEffect(() => {
    const handleToggleMapType = () => {
      console.log('Toggle map type event received!');
      console.log('Current state - useGoogleMaps:', useGoogleMaps, 'apiKey:', !!apiKey, 'mapError:', mapError);
      
      if (apiKey && !mapError) {
        // If Google Maps is available, toggle between Google Maps and OpenStreetMap
        console.log('Toggling to:', !useGoogleMaps ? 'Google Maps' : 'OpenStreetMap');
        setUseGoogleMaps(!useGoogleMaps);
        setUseSimpleMap(false);
      } else {
        // If only OpenStreetMap is available, show a notification
        console.log('Only OpenStreetMap available - no Google Maps API key or error occurred');
        alert('Only OpenStreetMap is available. Google Maps requires an API key.');
      }
    };

    console.log('Adding toggle map type event listener');
    window.addEventListener('toggleMapType', handleToggleMapType);
    
    return () => {
      console.log('Removing toggle map type event listener');
      window.removeEventListener('toggleMapType', handleToggleMapType);
    };
  }, [apiKey, mapError, useGoogleMaps]);

  // Listen for Google Maps errors
  useEffect(() => {
    const handleGoogleMapsError = () => {
      console.warn('Google Maps failed to load, switching to leaflet map');
      setMapError(true);
      setUseSimpleMap(true);
    };

    // Check for existing Google Maps errors
    if (window.gm_authFailure || !apiKey) {
      handleGoogleMapsError();
    }

    // Set up error handler
    window.gm_authFailure = handleGoogleMapsError;

    return () => {
      window.gm_authFailure = undefined;
    };
  }, [apiKey]);

  // Priority: Leaflet (default) -> Google Maps (if available) -> Simple Map (fallback)
  if (useSimpleMap && mapError) {
    return (
      <div>
        <SimpleMap {...props} />
        <div className="mt-2 text-center space-x-2">
          <button
            onClick={() => { setUseSimpleMap(false); setMapError(false); }}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Try Interactive Map
          </button>
        </div>
      </div>
    );
  }

  // Use Google Maps if available and selected
  if (apiKey && useGoogleMaps && !mapError) {
    return (
      <div className="h-full w-full relative overflow-hidden">
        <GoogleMap {...props} />
        {/* Map type indicator */}
        <div className="absolute top-4 left-4 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          Google Maps
        </div>
      </div>
    );
  }

  // Use Leaflet Map as default
  if (!apiKey || useSimpleMap || !useGoogleMaps) {
    return (
      <div className="h-full w-full relative overflow-hidden">
        {/* Full-screen SimpleLeaflet without any UI elements */}
        <SimpleLeaflet 
          center={{ 
            lat: props.center?.lat || safeCenter.lat, 
            lng: props.center?.lng || safeCenter.lng 
          }}
          height="100%"
        />
        {/* Map type indicator */}
        <div className="absolute top-4 left-4 z-10 bg-green-600 text-white text-xs px-2 py-1 rounded">
          OpenStreetMap
        </div>
      </div>
    );
  }

  // Fallback - Use Google Maps if available and not switched to simple
  return (
    <div className="h-full w-full relative overflow-hidden">
      <GoogleMap {...props} />
      {/* Map type indicator */}
      <div className="absolute top-4 left-4 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded">
        Google Maps
      </div>
    </div>
  );
};

export default MapSwitch;
