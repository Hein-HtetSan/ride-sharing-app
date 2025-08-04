import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Location } from '../types';

interface LocationContextType {
  currentLocation: Location | null;
  updateLocation: (location: Location) => void;
  requestLocation: () => Promise<Location | null>;
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

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // In production, integrate with Google Maps Geocoding API
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const requestLocation = async (): Promise<Location | null> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const address = await reverseGeocode(latitude, longitude);
          
          const location: Location = {
            lat: latitude,
            lng: longitude,
            address,
          };

          setCurrentLocation(location);
          setIsLocationEnabled(true);
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  };

  const updateLocation = (location: Location) => {
    setCurrentLocation(location);
  };

  useEffect(() => {
    // Request location on mount
    requestLocation().catch(console.error);
  }, []);

  const value = {
    currentLocation,
    updateLocation,
    requestLocation,
    isLocationEnabled,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};