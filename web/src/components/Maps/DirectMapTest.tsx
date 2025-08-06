import React from 'react';

const DirectMapTest: React.FC = () => {
  React.useEffect(() => {
    // Load Leaflet CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    css.crossOrigin = '';
    document.head.appendChild(css);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    
    script.onload = () => {
      console.log('Leaflet loaded, initializing map...');
      
      // @ts-ignore
      if (typeof L !== 'undefined') {
        // @ts-ignore
        const map = L.map('direct-map').setView([16.8661, 96.1951], 13);
        
        // @ts-ignore
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // @ts-ignore
        L.marker([16.8661, 96.1951]).addTo(map)
          .bindPopup('Direct HTML Map Test')
          .openPopup();
        
        console.log('Direct map initialized successfully!');
      } else {
        console.error('Leaflet not loaded properly');
      }
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(css)) document.head.removeChild(css);
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-center p-2 bg-blue-100 rounded">
        <strong>Direct HTML Leaflet Test</strong>
        <div className="text-sm text-gray-600">Loading Leaflet from CDN...</div>
      </div>
      
      <div 
        id="direct-map" 
        style={{ 
          height: '400px', 
          width: '100%',
          backgroundColor: '#f3f4f6',
          border: '2px solid #3b82f6',
          borderRadius: '8px'
        }}
      />
      
      <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
        If this map loads, the issue is with React-Leaflet setup.
        <br />
        If this doesn't load, the issue is with network/CDN access.
      </div>
    </div>
  );
};

export default DirectMapTest;
