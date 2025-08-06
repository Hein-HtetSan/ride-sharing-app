import React, { useEffect, useRef, useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import { Location } from '../../types';

interface GoogleMapProps {
  center: Location;
  zoom?: number;
  height?: string;
  markers?: Location[];
  onLocationSelect?: (location: Location) => void;
  showDirections?: boolean;
  destination?: Location;
}

const MapComponent: React.FC<{
  center: Location;
  zoom: number;
  markers?: Location[];
  onLocationSelect?: (location: Location) => void;
  showDirections?: boolean;
  destination?: Location;
}> = ({ center, zoom, markers = [], onLocationSelect, showDirections, destination }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
      
      setMap(newMap);
      
      // Add click listener for location selection
      if (onLocationSelect) {
        newMap.addListener('click', async (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            
            // Reverse geocoding to get address
            const geocoder = new google.maps.Geocoder();
            try {
              const response = await geocoder.geocode({ location: { lat, lng } });
              if (response.results[0]) {
                const result = response.results[0];
                const addressComponents = result.address_components;
                
                const location: Location = {
                  lat,
                  lng,
                  address: result.formatted_address,
                  streetName: addressComponents.find(c => c.types.includes('route'))?.long_name,
                  city: addressComponents.find(c => c.types.includes('locality'))?.long_name,
                  country: addressComponents.find(c => c.types.includes('country'))?.long_name,
                  postalCode: addressComponents.find(c => c.types.includes('postal_code'))?.long_name
                };
                
                onLocationSelect(location);
              }
            } catch (error) {
              console.error('Geocoding failed:', error);
            }
          }
        });
      }
    }
  }, [ref, map, center, zoom, onLocationSelect]);

  // Update map center when center prop changes
  useEffect(() => {
    if (map) {
      map.setCenter({ lat: center.lat, lng: center.lng });
    }
  }, [map, center]);

  // Handle markers
  useEffect(() => {
    if (map) {
      // Clear existing markers
      // Add new markers
      markers.forEach((marker, index) => {
        new google.maps.Marker({
          position: { lat: marker.lat, lng: marker.lng },
          map,
          title: marker.address,
          icon: {
            url: index === 0 ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(32, 32)
          }
        });
      });
    }
  }, [map, markers]);

  // Handle directions
  useEffect(() => {
    if (map && showDirections && destination && markers.length > 0) {
      if (!directionsRenderer) {
        const renderer = new google.maps.DirectionsRenderer({
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#4285F4',
            strokeWeight: 4
          }
        });
        renderer.setMap(map);
        setDirectionsRenderer(renderer);
      }

      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: markers[0].lat, lng: markers[0].lng },
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode: google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === 'OK' && directionsRenderer) {
            directionsRenderer.setDirections(result);
          }
        }
      );
    }
  }, [map, showDirections, destination, markers, directionsRenderer]);

  return <div ref={ref} style={{ height: '100%', width: '100%' }} />;
};

const GoogleMap: React.FC<GoogleMapProps> = ({
  center,
  zoom = 15,
  height = '400px',
  markers = [],
  onLocationSelect,
  showDirections = false,
  destination
}) => {
  const apiKey = import.meta.env.VITE_REACT_APP_GOOGLE_MAPS_API_KEY;
  const [mapError, setMapError] = useState(false);
  
  if (!apiKey || mapError) {
    return (
      <div 
        className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-blue-300" 
        style={{ height }}
      >
        <div className="text-center p-4">
          <div className="text-blue-600 mb-2">
            🗺️
          </div>
          <p className="text-gray-700 font-medium mb-1">Map View</p>
          <p className="text-gray-600 text-sm">
            {center.address || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`}
          </p>
          {markers && markers.length > 1 && (
            <p className="text-gray-500 text-xs mt-2">
              {markers.length} location{markers.length > 1 ? 's' : ''}
            </p>
          )}
          {showDirections && destination && (
            <p className="text-blue-600 text-xs mt-1">
              Route to: {destination.address}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <Wrapper 
        apiKey={apiKey} 
        libraries={['geometry', 'places']}
        render={(status) => {
          if (status === 'LOADING') {
            return (
              <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height }}>
                <p className="text-gray-600">Loading map...</p>
              </div>
            );
          }
          if (status === 'FAILURE') {
            setMapError(true);
            return (
              <div className="bg-red-100 rounded-lg flex items-center justify-center" style={{ height }}>
                <p className="text-red-600">Failed to load map</p>
              </div>
            );
          }
          return (
            <MapComponent
              center={center}
              zoom={zoom}
              markers={markers}
              onLocationSelect={onLocationSelect}
              showDirections={showDirections}
              destination={destination}
            />
          );
        }}
      />
    </div>
  );
};

export default GoogleMap;
