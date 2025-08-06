import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Location } from '../types';
import { LocationService } from '../services/locationService';

interface LocationContextType {
  currentLocation: Location | null;
  updateLocation: (location: Location) => void;
  requestLocation: () => Promise<Location | null>;
  requestDirectGPS: () => Promise<Location | null>;
  isLocationEnabled: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  const requestLocation = useCallback(async (): Promise<Location | null> => {
    console.log('🔄 LocationContext: requestLocation called');
    try {
      console.log('📍 LocationContext: calling LocationService.getCurrentLocation() - this will get GPS from browser...');
      const location = await LocationService.getCurrentLocation();
      console.log('✅ LocationContext: got location from LocationService:', {
        source: 'Browser GPS + Nominatim reverse geocoding',
        coordinates: `${location.lat}, ${location.lng}`,
        coordinatesSource: 'navigator.geolocation (Browser GPS)',
        addressSource: 'Nominatim API (OpenStreetMap reverse geocoding)',
        fullLocation: location
      });
      setCurrentLocation(location);
      setIsLocationEnabled(true);
      return location;
    } catch (error) {
      console.error('❌ LocationContext: Failed to get location:', error);
      setIsLocationEnabled(false);
      return null;
    }
  }, []);

  const updateLocation = (location: Location) => {
    console.log('🔄 LocationContext: updateLocation called with:', location);
    setCurrentLocation(location);
  };

  const requestDirectGPS = useCallback(async (): Promise<Location | null> => {
    console.log('🛰️ LocationContext: requestDirectGPS - bypassing LocationService, going DIRECT to browser GPS...');
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('❌ DirectGPS: Geolocation not supported');
        reject(new Error('Geolocation not supported'));
        return;
      }

      console.log('🛰️ DirectGPS: Calling navigator.geolocation.getCurrentPosition with maximumAge: 0');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ DirectGPS: Raw browser GPS success:', {
            source: 'DIRECT browser GPS (no LocationService)',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            timestampAge: `${Date.now() - position.timestamp}ms ago`,
            timestampFormatted: new Date(position.timestamp).toLocaleString()
          });

          const directLocation: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: `DIRECT GPS: ${position.coords.latitude}, ${position.coords.longitude}`,
            city: 'Direct GPS Reading',
            country: undefined
          };

          console.log('🛰️ DirectGPS: Setting location to:', directLocation);
          setCurrentLocation(directLocation);
          setIsLocationEnabled(true);
          resolve(directLocation);
        },
        (error) => {
          console.error('❌ DirectGPS: Failed:', {
            code: error.code,
            message: error.message
          });
          setIsLocationEnabled(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0 // FORCE fresh GPS reading
        }
      );
    });
  }, []);

  useEffect(() => {
    // Request location on mount using ONLY direct GPS - no fallback
    const initLocation = async () => {
      console.log('🔄 LocationContext: useEffect - initializing location with ONLY direct GPS (no fallback)...');
      try {
        await requestDirectGPS(); // Use ONLY direct GPS 
        console.log('✅ LocationContext: Direct GPS initialization successful');
      } catch (error) {
        console.error('❌ LocationContext: Direct GPS initialization failed:', error);
        // NO FALLBACK - we only use direct GPS now since regular location is broken
        console.log('🚫 LocationContext: NOT using fallback - direct GPS is the only working method');
      }
    };
    initLocation();
  }, [requestDirectGPS]);

  const value = {
    currentLocation,
    updateLocation,
    requestLocation,
    requestDirectGPS,
    isLocationEnabled,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};