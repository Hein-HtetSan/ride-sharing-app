import React, { createContext, useContext, useEffect, useState } from 'react';

// Extend the Window interface to include Leaflet
declare global {
  interface Window {
    L: unknown;
  }
}

interface OpenStreetMapContextProps {
  isLoaded: boolean;
  loadError: boolean;
  routingService: 'osrm' | 'graphhopper' | 'mapbox';
}

const OpenStreetMapContext = createContext<OpenStreetMapContextProps>({
  isLoaded: false,
  loadError: false,
  routingService: 'osrm'
});

export const useOpenStreetMap = () => useContext(OpenStreetMapContext);

interface OpenStreetMapProviderProps {
  children: React.ReactNode;
  routingService?: 'osrm' | 'graphhopper' | 'mapbox';
  mapboxApiKey?: string; // Only needed if using Mapbox routing
}

export const OpenStreetMapProvider: React.FC<OpenStreetMapProviderProps> = ({ 
  children, 
  routingService = 'osrm',
  mapboxApiKey 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Load Leaflet CSS and JS for OpenStreetMap
    const loadLeaflet = async () => {
      try {
        // Load Leaflet CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const leafletCSS = document.createElement('link');
          leafletCSS.rel = 'stylesheet';
          leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          leafletCSS.crossOrigin = '';
          document.head.appendChild(leafletCSS);
        }

        // Load Leaflet JS
        if (!window.L) {
          await new Promise((resolve, reject) => {
            const leafletJS = document.createElement('script');
            leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            leafletJS.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
            leafletJS.crossOrigin = '';
            leafletJS.onload = resolve;
            leafletJS.onerror = reject;
            document.head.appendChild(leafletJS);
          });
        }

        // Validate routing service configuration
        if (routingService === 'mapbox' && !mapboxApiKey) {
          throw new Error('Mapbox API key is required when using Mapbox routing service');
        }

        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load OpenStreetMap:', error);
        setLoadError(true);
      }
    };

    loadLeaflet();
  }, [routingService, mapboxApiKey]);

  if (loadError) {
    return (
      <OpenStreetMapContext.Provider value={{ isLoaded: false, loadError: true, routingService }}>
        <div className="openstreetmap-error-container">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
            <div className="flex items-center mb-3">
              <div className="text-red-500 text-xl mr-2">�️</div>
              <h3 className="text-red-700 font-semibold">OpenStreetMap Loading Error</h3>
            </div>
            <p className="text-red-600 text-sm mb-3">
              Failed to load OpenStreetMap resources. This could be due to:
            </p>
            <ul className="text-red-600 text-sm space-y-1 mb-4 ml-4">
              <li>• Network connectivity issues</li>
              <li>• CDN unavailability</li>
              <li>• Invalid Mapbox API key (if using Mapbox routing)</li>
              <li>• Browser blocking external resources</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <p className="text-xs text-blue-700">
                <strong>Using:</strong> OpenStreetMap with {routingService.toUpperCase()} routing service
              </p>
            </div>
          </div>
        </div>
        {children}
      </OpenStreetMapContext.Provider>
    );
  }

  if (!isLoaded) {
    return (
      <OpenStreetMapContext.Provider value={{ isLoaded: false, loadError: false, routingService }}>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading OpenStreetMap...</p>
          </div>
        </div>
        {children}
      </OpenStreetMapContext.Provider>
    );
  }

  return (
    <OpenStreetMapContext.Provider value={{ isLoaded: true, loadError: false, routingService }}>
      {children}
    </OpenStreetMapContext.Provider>
  );
};
