import React, { useEffect, useState, Component, ReactNode } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Location } from '../../types';
import { RoutingService } from '../../services/routingService';

// Import Leaflet CSS in the component
import 'leaflet/dist/leaflet.css';

// Simple Error Boundary for Leaflet Map
class MapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('Leaflet Map Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border border-gray-300">
          <div className="text-center p-4">
            <div className="text-red-600 mb-2">⚠️ Map Error</div>
            <div className="text-sm text-gray-600">Failed to load map</div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fix Leaflet default markers - proper way
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icons for different marker types
const createCustomIcon = (color: string, symbol: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">${symbol}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const currentLocationIcon = createCustomIcon('#10B981', '📍');
const destinationIcon = createCustomIcon('#EF4444', '🏁');
const driverIcon = createCustomIcon('#3B82F6', '🚗');

interface LeafletMapProps {
  center: Location;
  height?: string;
  markers?: Location[];
  onLocationSelect?: (location: Location) => void;
  showDirections?: boolean;
  destination?: Location;
  drivers?: Array<{ id: string; location: Location; name: string }>;
}

// Component to handle map events and updates
const MapController: React.FC<{
  center: Location;
  onLocationSelect?: (location: Location) => void;
}> = ({ center, onLocationSelect }) => {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);

  useEffect(() => {
    if (onLocationSelect) {
      const handleClick = (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const newLocation: Location = {
          lat,
          lng,
          address: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          streetName: undefined,
          city: center.city,
          country: center.country,
          postalCode: undefined
        };
        onLocationSelect(newLocation);
      };

      map.on('click', handleClick);
      return () => {
        map.off('click', handleClick);
      };
    }
  }, [map, onLocationSelect, center]);

  return null;
};

// Simple routing function using RoutingService
const getRoute = async (start: Location, end: Location): Promise<[number, number][]> => {
  try {
    const routeResponse = await RoutingService.getRoute(start, end);
    return routeResponse.coordinates;
  } catch (error) {
    console.warn('Failed to get route, using straight line:', error);
    // Fallback to straight line
    return [
      [start.lat, start.lng],
      [end.lat, end.lng]
    ];
  }
};

const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  height = '400px',
  markers = [],
  onLocationSelect,
  showDirections = false,
  destination,
  drivers = []
}) => {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  // Validate center coordinates
  const isValidCenter = center && typeof center.lat === 'number' && typeof center.lng === 'number';

  useEffect(() => {
    if (!isValidCenter) {
      setMapError('Invalid location coordinates');
      return;
    }

    const loadRoute = async () => {
      try {
        if (showDirections && destination && destination.lat && destination.lng) {
          const route = await getRoute(center, destination);
          setRouteCoordinates(route);
        } else {
          setRouteCoordinates([]);
        }
        setMapError(null); // Clear any previous errors
      } catch (error) {
        console.warn('Failed to load route:', error);
        setMapError('Failed to load route');
      }
    };
    
    loadRoute();
  }, [center, destination, showDirections, isValidCenter]);

  if (!isValidCenter || mapError) {
    return (
      <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <div className="text-red-600 mb-2">⚠️ Map Error</div>
          <div className="text-sm text-gray-600">
            {!isValidCenter ? 'Invalid location coordinates' : mapError}
          </div>
          {mapError && (
            <button 
              onClick={() => setMapError(null)}
              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border border-gray-300 relative">
      <MapErrorBoundary>
        <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          Leaflet Map • {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
        </div>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          whenReady={() => console.log('Leaflet map ready at:', center)}
        >
          {/* OpenStreetMap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController center={center} onLocationSelect={onLocationSelect} />

          {/* Current location marker */}
          <Marker position={[center.lat, center.lng]} icon={currentLocationIcon}>
            <Popup>
              <div className="text-sm">
                <strong>Current Location</strong>
                <br />
                {center.address || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`}
                {center.city && <div className="text-xs text-gray-600">{center.city}, {center.country}</div>}
              </div>
            </Popup>
          </Marker>

          {/* Destination marker */}
          {destination && destination.lat && destination.lng && (
            <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>Destination</strong>
                  <br />
                  {destination.address}
                  {destination.city && <div className="text-xs text-gray-600">{destination.city}, {destination.country}</div>}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Additional markers */}
          {markers.filter(marker => marker && marker.lat && marker.lng).map((marker, index) => (
            <Marker key={index} position={[marker.lat, marker.lng]}>
              <Popup>
                <div className="text-sm">
                  {marker.address || `Location ${index + 1}`}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Driver markers */}
          {drivers.filter(driver => driver.location && driver.location.lat && driver.location.lng).map((driver) => (
            <Marker 
              key={driver.id} 
              position={[driver.location.lat, driver.location.lng]} 
              icon={driverIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Driver: {driver.name}</strong>
                  <br />
                  Available for pickup
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Route polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#3B82F6',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 5'
              }}
            />
          )}
        </MapContainer>
      </MapErrorBoundary>

      {onLocationSelect && (
        <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs text-gray-600 shadow-sm">
          Click on map to select location
        </div>
      )}
    </div>
  );
};

export default LeafletMap;
