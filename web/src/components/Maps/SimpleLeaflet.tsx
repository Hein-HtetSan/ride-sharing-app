import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface SimpleLeafletProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  showDebug?: boolean;
}

const SimpleLeaflet: React.FC<SimpleLeafletProps> = ({
  center = { lat: 16.8661, lng: 96.1951 }, // Default to Yangon
  zoom = 13,
  height = '400px',
  showDebug = false
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Add inline CSS for Leaflet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);

    try {
      console.log('Initializing Leaflet map...');
      console.log('Container dimensions:', mapRef.current.offsetWidth, 'x', mapRef.current.offsetHeight);
      
      // Create map with explicit container check
      if (mapRef.current.offsetHeight === 0) {
        console.error('Map container has zero height!');
        return;
      }
      
      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom: zoom,
        zoomControl: true,
        attributionControl: true
      });
      
      console.log('Map instance created');
      
      // Add tile layer with error handling
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        tileSize: 256
      });
      
      tileLayer.on('loading', () => console.log('Tiles loading...'));
      tileLayer.on('load', () => console.log('Tiles loaded successfully'));
      tileLayer.on('tileerror', (e) => console.error('Tile error:', e));
      
      tileLayer.addTo(map);
      
      // Add marker
      const icon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      const marker = L.marker([center.lat, center.lng], { icon })
        .addTo(map)
        .bindPopup(`Location: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`)
        .openPopup();
      
      markerRef.current = marker;
      
      mapInstanceRef.current = map;
      console.log('Leaflet map initialized successfully!');
      
      // Force map to resize after a short delay
      setTimeout(() => {
        map.invalidateSize();
        console.log('Map size invalidated');
      }, 100);
      
      // Event listeners for debugging
      map.on('load', () => console.log('Map loaded event fired'));
      map.on('error', (e) => console.error('Map error:', e));
      map.on('zoom', () => console.log('Map zoom changed'));
      map.on('move', () => console.log('Map moved'));
      
    } catch (error) {
      console.error('Failed to initialize Leaflet map:', error);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
    };
  }, [center.lat, center.lng, zoom]);

  // Handle center changes (for relocate functionality)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      console.log('Updating map center to:', center.lat, center.lng);
      
      // Update map view
      mapInstanceRef.current.setView([center.lat, center.lng], mapInstanceRef.current.getZoom());
      
      // Update marker position
      markerRef.current.setLatLng([center.lat, center.lng]);
      
      // Update popup content
      markerRef.current.setPopupContent(`Location: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
      
      // Invalidate size to ensure proper rendering
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    }
  }, [center.lat, center.lng]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Only show status indicator in debug mode */}
      {showDebug && (
        <div className="absolute top-2 right-2 z-10 bg-green-600 text-white text-xs px-2 py-1 rounded">
          SimpleLeaflet Ready
        </div>
      )}
      
      <div 
        ref={mapRef} 
        style={{ 
          height: '100%', 
          width: '100%',
          minHeight: showDebug ? '300px' : '100vh',
          backgroundColor: '#e5e7eb'
        }}
        className={showDebug ? "border-2 border-blue-300 rounded-lg" : ""}
      />
      
      {/* Debug info - only in debug mode */}
      {showDebug && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded">
          <div>Map Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}</div>
          <div>Container Height: {height}</div>
          <div>Zoom Level: {zoom}</div>
        </div>
      )}
    </div>
  );
};

export default SimpleLeaflet;
