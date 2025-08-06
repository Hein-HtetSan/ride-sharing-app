import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, Clock, DollarSign, Map } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { rideAPI } from '../../services/api';
import { Driver, Ride, RideRequest, Location } from '../../types';
import { LocationService } from '../../services/locationService';
import Header from '../Layout/Header';
import { OpenStreetMap, LocationSearch } from '../Maps';

const RiderDashboard: React.FC = () => {
  const [destination, setDestination] = useState('');
  const [destinationLocation, setDestinationLocation] = useState<Location | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRideForm, setShowRideForm] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState<string>('');
  const [correctLocation, setCorrectLocation] = useState<Location | null>(null);

  const { currentLocation, requestDirectGPS } = useLocation();

  // Initialize with correct GPS location on component mount
  useEffect(() => {
    const initializeCorrectLocation = async () => {
      console.log('🛰️ INITIALIZING - Getting GPS location...');
      try {
        const freshGPS = await requestDirectGPS();
        console.log('✅ INITIALIZATION - Got GPS:', freshGPS);
        if (freshGPS) {
          setCorrectLocation(freshGPS);
          console.log('✅ INITIALIZATION - Set location in state');
        }
      } catch (error) {
        console.error('❌ INITIALIZATION - Failed to get GPS:', error);
      }
    };

    initializeCorrectLocation();
  }, [requestDirectGPS]);

  // Use GPS location as primary source
  const displayLocation = correctLocation || currentLocation;

  // Debug: Log location status
  console.log('🔍 RiderDashboard - GPS location:', correctLocation);
  console.log('🔍 RiderDashboard - Context location:', currentLocation);
  console.log('🔍 RiderDashboard - Display location:', displayLocation);
  
  if (displayLocation) {
    console.log('🔍 RiderDashboard - DISPLAY COORDINATES:', {
      lat: displayLocation.lat,
      lng: displayLocation.lng,
      address: displayLocation.address,
      city: displayLocation.city,
      source: correctLocation ? 'GPS location' : 'Context location',
      coordinates: `${displayLocation.lat}, ${displayLocation.lng}`
    });
  }

  // Add location refresh handler
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  
  const handleRefreshLocation = async () => {
    if (isRefreshingLocation) return;
    
    console.log('🛰️ RELOCATE BUTTON - Getting fresh GPS location...');
    setLocationError('');
    
    try {
      setIsRefreshingLocation(true);
      
      const freshGPS = await requestDirectGPS();
      console.log('✅ RELOCATE - Fresh GPS result:', freshGPS);
      
      if (freshGPS) {
        setCorrectLocation(freshGPS);
        console.log('✅ RELOCATE - Updated location');
        
        // Reload nearby drivers after location update
        setTimeout(() => {
          loadNearbyDrivers();
        }, 1000);
      } else {
        throw new Error('requestDirectGPS returned null');
      }
      
    } catch (error) {
      console.error('❌ RELOCATE - GPS failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown location error';
      setLocationError(errorMessage);
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  const loadCurrentRide = useCallback(async () => {
    try {
      setCurrentRide(null);
    } catch (error) {
      console.error('Failed to load current ride:', error);
    }
  }, []);

  const loadNearbyDrivers = useCallback(async () => {
    if (!displayLocation) return;
    
    try {
      setNearbyDrivers([]);
    } catch (error) {
      console.error('Failed to load nearby drivers:', error);
    }
  }, [displayLocation]);

  useEffect(() => {
    loadCurrentRide();
    if (displayLocation) {
      loadNearbyDrivers();
    }
  }, [displayLocation, loadCurrentRide, loadNearbyDrivers]);

  const handleRequestRide = async () => {
    if (!displayLocation || !destinationLocation) return;

    setLoading(true);
    try {
      const rideRequest: RideRequest = {
        pickupLocation: displayLocation,
        destination: destinationLocation,
        estimatedFare: estimatedFare,
      };

      const ride = await rideAPI.requestRide(rideRequest);
      setCurrentRide(ride);
      setShowRideForm(false);
    } catch (error) {
      console.error('Failed to request ride:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedFare = (distance: number) => {
    const baseFare = 2.5;
    const perKmRate = 1.2;
    return baseFare + (distance * perKmRate);
  };

  const calculateRoute = (from: Location, to: Location) => {
    const distance = LocationService.calculateDistance(from, to);
    const duration = LocationService.estimateDuration(distance);
    
    setEstimatedFare(calculateEstimatedFare(distance));
    setEstimatedDuration(duration);
  };

  const handleDestinationSelect = (location: Location) => {
    setDestinationLocation(location);
    setDestination(location.address);
    
    if (displayLocation) {
      calculateRoute(displayLocation, location);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden no-zoom-bounce">
      <Header title="Book a Ride" />
      
      <div className="flex-1 relative overflow-hidden map-full-height">
        {displayLocation ? (
          <OpenStreetMap
            center={displayLocation}
            height="100%"
            markers={destinationLocation ? [displayLocation, destinationLocation] : [displayLocation]}
            showDirections={!!(destinationLocation && displayLocation)}
            destination={destinationLocation || undefined}
            routingService="osrm"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-500 text-3xl mb-4">🗺️</div>
              <p className="text-gray-600 text-lg font-medium">Map will appear after getting your location</p>
              <p className="text-gray-500 text-sm mt-2">Please allow location access to continue</p>
            </div>
          </div>
        )}

        {!displayLocation && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm mx-4">
              <div className="text-2xl mb-3">📍</div>
              <p className="text-gray-800 font-medium mb-2">Getting your location...</p>
              <p className="text-sm text-gray-600 mb-4">
                We need your location to show nearby rides and calculate routes.
              </p>
              
              {locationError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{locationError}</p>
                </div>
              )}
              
              <button
                onClick={async () => {
                  console.log('🛰️ Getting GPS location...');
                  try {
                    setIsRefreshingLocation(true);
                    const directLocation = await requestDirectGPS();
                    console.log('✅ GPS result:', directLocation);
                    
                    if (directLocation) {
                      setCorrectLocation(directLocation);
                      console.log('✅ Location updated successfully');
                    }
                  } catch (error) {
                    console.error('❌ GPS failed:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown location error';
                    setLocationError(errorMessage);
                  } finally {
                    setIsRefreshingLocation(false);
                  }
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium"
                disabled={isRefreshingLocation}
              >
                {isRefreshingLocation ? 'Getting location...' : 'Get My Location'}
              </button>
            </div>
          </div>
        )}

        {/* Map Controls */}
        <div className="map-overlay-controls flex flex-col space-y-2 zoom-stable
                        fixed bottom-56 right-4
                        md:top-20 md:right-4 md:bottom-auto">
          <button
            onClick={handleRefreshLocation}
            disabled={isRefreshingLocation}
            className={`w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 ${
              isRefreshingLocation 
                ? 'bg-blue-50 cursor-not-allowed' 
                : 'hover:bg-gray-50'
            }`}
            title="Refresh location"
            style={{ pointerEvents: 'auto' }}
          >
            <Navigation 
              className={`h-5 w-5 ${
                isRefreshingLocation 
                  ? 'text-blue-600 animate-spin' 
                  : 'text-gray-700'
              }`} 
            />
          </button>
          
          <button
            onClick={() => {
              console.log('Map switch button clicked!');
              const event = new CustomEvent('toggleMapType');
              window.dispatchEvent(event);
              console.log('Toggle map type event dispatched');
            }}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
            title="Switch map type"
            style={{ pointerEvents: 'auto' }}
          >
            <Map className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Bottom Panel */}
        <div className="map-overlay-bottom pb-4 zoom-stable 
                        fixed bottom-8 left-4 right-4 
                        md:top-20 md:left-4 md:right-auto md:w-96">
          <div className="px-4 md:px-0">
            <div className="w-full max-w-sm mx-auto md:max-w-none md:mx-0 bg-white rounded-2xl shadow-2xl no-zoom-bounce">
              <div className="p-4 pb-safe">
                <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3"></div>
                
                {/* Current Location Display */}
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-100 mb-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-green-800">Current Location</p>
                    <p className="text-sm text-gray-700 truncate">
                      {displayLocation?.address || 'Getting your location...'}
                    </p>
                    {correctLocation && (
                      <p className="text-xs text-blue-600 mt-1">📍 Using GPS location</p>
                    )}
                  </div>
                </div>

                {/* Destination Input */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-2 h-2 bg-red-500 rounded-sm rotate-45 flex-shrink-0 ml-1"></div>
                  <div className="flex-1">
                    <LocationSearch
                      placeholder="Where to?"
                      onLocationSelect={handleDestinationSelect}
                    />
                  </div>
                </div>

                {/* Route Info */}
                {destinationLocation && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3 text-blue-600" />
                        <span className="text-blue-800">{estimatedDuration || '15 mins'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-3 w-3 text-blue-600" />
                        <span className="font-semibold text-blue-900">${estimatedFare.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Find Drivers Button */}
                <button
                  onClick={() => setShowRideForm(true)}
                  disabled={!destinationLocation || !displayLocation}
                  className="w-full bg-black text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                >
                  Find Drivers
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderDashboard;
