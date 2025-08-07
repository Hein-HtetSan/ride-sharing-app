import React, { useEffect, useRef, useState } from 'react';
import { Location } from '../../types';
import { RoutingService } from '../../services/routingService';

interface OpenStreetMapProps {
  center: Location;
  zoom?: number;
  height?: string;
  markers?: Location[];
  onLocationSelect?: (location: Location) => void;
  showDirections?: boolean;
  pickup?: Location;
  destination?: Location;
  routingService?: 'osrm' | 'graphhopper' | 'mapbox';
  driverAccepted?: boolean; // New prop to trigger pickup location animation
  waitingForDriver?: boolean; // New prop to show radiating while waiting for driver
}

const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
  center,
  zoom = 15,
  height = '400px',
  markers = [],
  onLocationSelect,
  showDirections = false,
  pickup,
  destination,
  routingService = 'osrm',
  driverAccepted = false,
  waitingForDriver = false
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const routeLayer = useRef<unknown>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');

  // Load Leaflet
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        // Load Leaflet CSS if not already loaded
        if (!document.querySelector('link[href*="leaflet"]')) {
          const leafletCSS = document.createElement('link');
          leafletCSS.rel = 'stylesheet';
          leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          leafletCSS.crossOrigin = '';
          document.head.appendChild(leafletCSS);
        }

        // Load Leaflet JS if not already loaded
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

        setIsLoaded(true);
        console.log('✅ OpenStreetMap (Leaflet) loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load OpenStreetMap:', error);
        setError('Failed to load OpenStreetMap. Please check your internet connection.');
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstance.current || !window.L) return;

    try {
      // Get Leaflet from window object
      const L = (window as any).L;
      
      // Initialize map
      mapInstance.current = L.map(mapRef.current).setView(
        [center.lat, center.lng], 
        zoom
      );

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstance.current);

      // Add click listener for location selection
      if (onLocationSelect) {
        (mapInstance.current as any).on('click', async (e: { latlng: { lat: number; lng: number } }) => {
          const { lat, lng } = e.latlng;
          
          console.log('🗺️ Map clicked at:', { lat: lat.toFixed(6), lng: lng.toFixed(6) });
          
          // Add temporary marker to show user where they clicked
          const L = (window as any).L;
          const tempMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); animation: pulse 1s infinite;"></div>',
              className: 'temp-marker',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(mapInstance.current);
          
          try {
            console.log('🌐 Reverse geocoding clicked location...');
            
            // Use reverse geocoding via Nominatim (OpenStreetMap's geocoding service)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'RideWithUs/1.0'
                }
              }
            );
            
            const data = await response.json();
            
            if (data && data.display_name) {
              const location: Location = {
                lat,
                lng,
                address: data.display_name,
                streetName: data.address?.road,
                city: data.address?.city || data.address?.town || data.address?.village,
                country: data.address?.country,
                postalCode: data.address?.postcode
              };
              
              console.log('✅ Map click geocoding success:', location.address);
              onLocationSelect(location);
            } else {
              console.log('⚠️ No address found, using coordinates');
              onLocationSelect({
                lat,
                lng,
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
              });
            }
          } catch (error) {
            console.error('❌ Map click geocoding failed:', error);
            onLocationSelect({
              lat,
              lng,
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            });
          } finally {
            // Remove temporary marker after a short delay
            setTimeout(() => {
              (mapInstance.current as any).removeLayer(tempMarker);
            }, 2000);
          }
        });
      }

      console.log('🗺️ OpenStreetMap initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenStreetMap:', error);
      setError('Failed to initialize map. Please refresh the page.');
    }
  }, [isLoaded, center, zoom, onLocationSelect]);

  // Update map center when center prop changes
  useEffect(() => {
    console.log('🗺️ OpenStreetMap: Center prop changed to:', {
      lat: center.lat,
      lng: center.lng,
      address: center.address,
      city: center.city
    });
    
    if (mapInstance.current) {
      console.log('🗺️ OpenStreetMap: Moving map to new center:', center.lat, center.lng);
      (mapInstance.current as any).setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom]);

  // Handle markers
  useEffect(() => {
    console.log('🔄 MARKER EFFECT TRIGGERED:', {
      mapInstanceExists: !!mapInstance.current,
      leafletExists: !!window.L,
      markersLength: markers.length,
      markersData: markers.map(m => ({ lat: m.lat, lng: m.lng, address: m.address?.substring(0, 50) + '...' }))
    });
    
    if (!mapInstance.current || !window.L) {
      console.warn('⚠️ Cannot add markers - map not ready');
      return;
    }

    const L = (window as any).L;
    
    console.log('🗺️ OpenStreetMap: Updating markers with data:', {
      center: center,
      markersCount: markers.length,
      markersData: markers
    });

    // Clear existing markers
    markersRef.current.forEach(marker => (mapInstance.current as any).removeLayer(marker));
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerLocation, index) => {
      // Determine marker type based on location comparison
      const isCurrentLocation = index === 0; // First marker is always current location
      const isPickupLocation = pickup && markerLocation.lat === pickup.lat && markerLocation.lng === pickup.lng;
      const isDestinationLocation = destination && markerLocation.lat === destination.lat && markerLocation.lng === destination.lng;
      
      let markerType, markerColor, markerEmoji, markerTitle;
      
      if (isCurrentLocation && !isPickupLocation) {
        markerType = 'CURRENT';
        markerColor = '#22c55e'; // Green
        markerEmoji = '📍';
        markerTitle = 'Current Location';
      } else if (isPickupLocation) {
        markerType = 'PICKUP';
        markerColor = '#3b82f6'; // Blue
        markerEmoji = '🚗';
        markerTitle = 'Pickup Location';
      } else if (isDestinationLocation) {
        markerType = 'DESTINATION';
        markerColor = '#ef4444'; // Red
        markerEmoji = '🎯';
        markerTitle = 'Destination';
      } else {
        markerType = 'OTHER';
        markerColor = '#6b7280'; // Gray
        markerEmoji = '📌';
        markerTitle = 'Location';
      }
      
      console.log(`🏷️ Adding ${markerType} marker:`, {
        location: markerLocation,
        coordinates: `${markerLocation.lat}, ${markerLocation.lng}`,
        address: markerLocation.address,
        title: markerTitle
      });
      
      // Create custom marker icon with radiating animation
      const markerIcon = L.divIcon({
        html: `
          <div class="marker-container">
            <div class="marker-pulse" style="
              position: absolute;
              width: 60px;
              height: 60px;
              border-radius: 50%;
              background-color: ${markerColor}40;
              top: -14px;
              left: -14px;
              animation: pulse-ring 2s infinite ease-out;
              z-index: 1;
            "></div>
            ${isPickupLocation && (waitingForDriver || driverAccepted) ? `
            <div class="driver-acceptance-ring" style="
              position: absolute;
              width: 120px;
              height: 120px;
              border-radius: 50%;
              background-color: ${markerColor}20;
              top: -44px;
              left: -44px;
              animation: driver-acceptance-pulse 1.5s infinite ease-out;
              z-index: 0;
            "></div>
            <div class="driver-acceptance-ring-2" style="
              position: absolute;
              width: 160px;
              height: 160px;
              border-radius: 50%;
              background-color: ${markerColor}15;
              top: -64px;
              left: -64px;
              animation: driver-acceptance-pulse 1.5s infinite ease-out 0.5s;
              z-index: 0;
            "></div>
            ` : ''}
            <div style="
              background-color: ${markerColor};
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 4px solid white;
              box-shadow: 0 4px 8px rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              font-weight: bold;
              color: white;
              z-index: 2;
              position: relative;
            ">${markerEmoji}</div>
          </div>
        `,
        className: 'custom-marker-animated',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([markerLocation.lat, markerLocation.lng], {
        icon: markerIcon
      }).addTo(mapInstance.current);

      // Add popup with better styling
      const popupContent = `
        <div style="padding: 12px; min-width: 250px; max-width: 300px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 16px; margin-right: 8px;">${markerEmoji}</span>
            <strong style="color: ${markerColor};">
              ${markerTitle}
            </strong>
          </div>
          <div style="color: #374151; font-size: 14px; line-height: 1.4;">
            ${markerLocation.address}
          </div>
          ${markerLocation.city ? `<div style="color: #6b7280; font-size: 12px; margin-top: 4px;">
            📍 ${markerLocation.city}
          </div>` : ''}
          <div style="color: #9ca3af; font-size: 11px; margin-top: 6px; font-family: monospace;">
            ${markerLocation.lat.toFixed(6)}, ${markerLocation.lng.toFixed(6)}
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);

      markersRef.current.push(marker);
    });
    
    console.log(`✅ Added ${markers.length} markers to map`);
  }, [markers, center, pickup, destination, driverAccepted, waitingForDriver]);

  // Handle directions
  useEffect(() => {
    if (!mapInstance.current || !showDirections || !destination) {
      if (routeLayer.current) {
        (mapInstance.current as any).removeLayer(routeLayer.current);
        routeLayer.current = null;
      }
      return;
    }

    const drawRoute = async () => {
      try {
        const L = (window as any).L;
        // Use pickup location if provided, otherwise use first marker or center
        const start = pickup || (markers.length > 0 ? markers[0] : center);
        console.log('🗺️ Drawing route from:', start, 'to:', destination);
        
        const routeResult = await RoutingService.getRoute(start, destination);
        
        if (routeResult && routeResult.coordinates.length > 0) {
          // Remove existing route
          if (routeLayer.current) {
            (mapInstance.current as any).removeLayer(routeLayer.current);
          }

          // Add new route
          routeLayer.current = L.polyline(routeResult.coordinates, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8
          }).addTo(mapInstance.current);

          // Fit map to show the entire route
          const group = L.featureGroup([
            ...markersRef.current,
            routeLayer.current
          ]);
          (mapInstance.current as any).fitBounds(group.getBounds().pad(0.1));

          console.log(`✅ Route calculated using ${routingService}: ${RoutingService.formatDuration(routeResult.duration)}, ${routeResult.distance.toFixed(1)}km`);
        }
      } catch (error) {
        console.error('Failed to calculate route:', error);
      }
    };

    drawRoute();
  }, [showDirections, destination, pickup, markers, routingService, center]);

  // Error state
  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg"
        style={{ height }}
      >
        <div className="text-center p-6 max-w-md">
          <div className="text-red-500 text-3xl mb-3">⚠️</div>
          <h3 className="text-red-700 font-semibold mb-2">OpenStreetMap Error</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          
          <div className="bg-white rounded p-3 border-l-4 border-red-400 text-left">
            <p className="text-sm font-medium text-gray-700 mb-2">Possible fixes:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Refresh the page</li>
              <li>• Clear browser cache</li>
              <li>• Disable ad blockers temporarily</li>
            </ul>
          </div>
          
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <p>Location: {center.address || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`}</p>
            {markers.length > 0 && <p>Markers: {markers.length}</p>}
            <p>Routing: {routingService.toUpperCase()}</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isLoaded) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ height }}
      >
        <div className="text-center">
          <div className="text-gray-500 text-2xl mb-2">🗺️</div>
          <p className="text-gray-600">Loading OpenStreetMap...</p>
          <div className="mt-2">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}
      className="relative"
    >
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-ring {
          0% {
            transform: scale(0.1);
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        .temp-marker {
          animation: pulse 1s infinite;
        }
        .marker-container {
          position: relative;
          width: 32px;
          height: 32px;
        }
        .custom-marker-animated .marker-pulse {
          animation: pulse-ring 2s infinite ease-out;
        }
      `}</style>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '300px',
          position: 'relative',
          zIndex: 1,
          cursor: 'crosshair'
        }}
        className="leaflet-map-wrapper"
        title="Click anywhere to set destination"
      />
    </div>
  );
};

export default OpenStreetMap;
