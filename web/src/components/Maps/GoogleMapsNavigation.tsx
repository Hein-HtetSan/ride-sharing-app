import React, { useEffect, useRef, useState } from 'react';
import { Location } from '../../types';

interface GoogleMapsNavigationProps {
  origin: Location;
  destination: Location;
  onDirectionsReady?: (duration: number, distance: number) => void;
  navigationMode?: boolean;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

const GoogleMapsNavigation: React.FC<GoogleMapsNavigationProps> = ({
  origin,
  destination,
  onDirectionsReady,
  navigationMode = false
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const directionsService = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google) {
        setIsLoaded(true);
        return;
      }

      // Add Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=geometry,places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      window.initGoogleMaps = () => {
        setIsLoaded(true);
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google) return;

    // Create map
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      zoom: navigationMode ? 18 : 15,
      center: { lat: origin.lat, lng: origin.lng },
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: navigationMode, // Hide controls in navigation mode
      zoomControl: !navigationMode,
      fullscreenControl: false,
      streetViewControl: false,
      styles: navigationMode ? [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ] : []
    });

    // Initialize directions
    directionsService.current = new window.google.maps.DirectionsService();
    directionsRenderer.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#4285f4', // Google Blue
        strokeWeight: 6,
        strokeOpacity: 0.8
      }
    });

    directionsRenderer.current.setMap(mapInstance.current);
  }, [isLoaded, origin, navigationMode]);

  // Calculate and display route
  useEffect(() => {
    if (!directionsService.current || !directionsRenderer.current) return;

    const request = {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode: window.google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true,
      avoidHighways: false,
      avoidTolls: false
    };

    directionsService.current.route(request, (result: any, status: any) => {
      if (status === 'OK') {
        directionsRenderer.current.setDirections(result);
        
        // Extract route info
        const route = result.routes[0];
        const leg = route.legs[0];
        const duration = leg.duration.value / 60; // Convert to minutes
        const distance = leg.distance.value / 1000; // Convert to km
        
        onDirectionsReady?.(duration, distance);

        // In navigation mode, keep following the user
        if (navigationMode) {
          mapInstance.current.setCenter({ lat: origin.lat, lng: origin.lng });
          mapInstance.current.setZoom(18);
        }
      } else {
        console.error('Directions request failed due to:', status);
      }
    });
  }, [origin, destination, onDirectionsReady, navigationMode]);

  // Follow user in navigation mode
  useEffect(() => {
    if (navigationMode && mapInstance.current) {
      mapInstance.current.panTo({ lat: origin.lat, lng: origin.lng });
    }
  }, [origin, navigationMode]);

  return (
    <div className="w-full h-full relative">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="text-2xl mb-2">🗺️</div>
            <p>Loading Google Maps...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsNavigation;