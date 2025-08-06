import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Location } from '../types';
import { LocationService } from '../services/locationService';

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

  useEffect(() => {
    // Request location on mount
    const initLocation = async () => {
      try {
        await requestLocation();
      } catch (error) {
        console.error('Failed to get initial location:', error);
      }
    };
    initLocation();
  }, [requestLocation]);

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