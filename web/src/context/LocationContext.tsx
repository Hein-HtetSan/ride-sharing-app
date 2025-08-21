import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Location } from '../types';
import { LocationService } from '../services/locationService';

interface LocationContextType {
  currentLocation: Location | null;
  updateLocation: (location: Location) => void;
  requestLocation: () => Promise<Location | null>;
  requestDirectGPS: () => Promise<Location | null>;
  swapLatLng: () => void;
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
    try {
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);
      setIsLocationEnabled(true);
      return location;
    } catch (error) {
      console.error('Failed to get location:', error);
      setIsLocationEnabled(false);
      return null;
    }
  }, []);

  const updateLocation = (location: Location) => {
    setCurrentLocation(location);
  };

  const swapLatLng = () => {
    if (currentLocation) {
      const swappedLocation: Location = {
        ...currentLocation,
        lat: currentLocation.lng,
        lng: currentLocation.lat,
        address: `${currentLocation.lng}, ${currentLocation.lat}`,
      };
      setCurrentLocation(swappedLocation);
    }
  };

  const requestDirectGPS = useCallback(async (): Promise<Location | null> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      
      navigator.geolocation.getCurrentPosition(
        (position) => {

          const directLocation: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: `${position.coords.latitude}, ${position.coords.longitude}`,
            city: 'GPS Location',
            country: undefined
          };

          // Check if coordinates might be wrong
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          

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
      try {
        await requestDirectGPS(); // Use ONLY direct GPS 
      } catch (error) {
        console.error('❌ LocationContext: Direct GPS initialization failed:', error);
        // NO FALLBACK - we only use direct GPS now since regular location is broken
      }
    };
    initLocation();
  }, [requestDirectGPS]);

  const value = {
    currentLocation,
    updateLocation,
    requestLocation,
    requestDirectGPS,
    swapLatLng,
    isLocationEnabled,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
