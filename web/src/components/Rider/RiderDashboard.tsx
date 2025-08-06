import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Clock, DollarSign, User, Star, RotateCcw, Map } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { rideAPI } from '../../services/api';
import { Driver, Ride, RideRequest, Location } from '../../types';
import { LocationService } from '../../services/locationService';
import Header from '../Layout/Header';
import MapSwitch from '../Maps/MapSwitch';
import SimpleLocationSearch from '../Maps/SimpleLocationSearch';

const RiderDashboard: React.FC = () => {
  const [destination, setDestination] = useState('');
  const [destinationLocation, setDestinationLocation] = useState<Location | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRideForm, setShowRideForm] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState<string>('');

  const { currentLocation, requestLocation } = useLocation();

  // Add location refresh handler with loading state
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  
  const handleRefreshLocation = async () => {
    if (isRefreshingLocation) return;
    
    console.log('Relocate button clicked!');
    try {
      setIsRefreshingLocation(true);
      await requestLocation();
      console.log('Location refreshed successfully');
      // Optionally reload nearby drivers after location update
      setTimeout(() => {
        loadNearbyDrivers();
      }, 1000);
    } catch (error) {
      console.error('Failed to refresh location:', error);
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  const loadCurrentRide = useCallback(async () => {
    try {
      const ride = await rideAPI.getCurrentRide();
      setCurrentRide(ride);
    } catch (error) {
      console.error('Failed to load current ride:', error);
    }
  }, []);

  const loadNearbyDrivers = useCallback(async () => {
    if (!currentLocation) return;
    
    try {
      const drivers = await rideAPI.getNearbyDrivers(currentLocation);
      setNearbyDrivers(drivers);
    } catch (error) {
      console.error('Failed to load nearby drivers:', error);
    }
  }, [currentLocation]);

  useEffect(() => {
    loadCurrentRide();
    if (currentLocation) {
      loadNearbyDrivers();
    }
  }, [currentLocation, loadCurrentRide, loadNearbyDrivers]);

  const handleRequestRide = async () => {
    if (!currentLocation || !destinationLocation) return;

    setLoading(true);
    try {
      const rideRequest: RideRequest = {
        pickupLocation: currentLocation,
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
    // Use our location service for calculations
    const distance = LocationService.calculateDistance(from, to);
    const duration = LocationService.estimateDuration(distance);
    
    setEstimatedFare(calculateEstimatedFare(distance));
    setEstimatedDuration(duration);
  };

  const handleDestinationSelect = (location: Location) => {
    setDestinationLocation(location);
    setDestination(location.address);
    
    if (currentLocation) {
      calculateRoute(currentLocation, location);
    }
  };

  if (currentRide && currentRide.status !== 'completed') {
    return (
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Header - Fixed */}
        <Header title="Your Ride" />
        
        {/* Map Container - Full remaining height */}
        <div className="flex-1 relative overflow-hidden map-full-height">
          <MapSwitch
            center={currentRide.pickupLocation}
            height="100%"
            markers={[currentRide.pickupLocation, currentRide.destination]}
            showDirections={true}
            destination={currentRide.destination}
          />
          
          {/* Map Controls for Ride in Progress */}
          <div className="absolute bottom-44 right-4 z-50 flex flex-col space-y-2">
            {/* Relocate Button */}
            <button
              onClick={handleRefreshLocation}
              disabled={isRefreshingLocation}
              className={`w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 ${
                isRefreshingLocation 
                  ? 'bg-blue-50 cursor-not-allowed' 
                  : 'hover:bg-gray-50'
              }`}
              title="Relocate to current position"
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
            
            {/* Map Switch Button */}
            <button
              onClick={() => {
                console.log('Map switch button clicked! (Ride in Progress)');
                const event = new CustomEvent('toggleMapType');
                window.dispatchEvent(event);
                console.log('Toggle map type event dispatched (Ride in Progress)');
              }}
              className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
              title="Switch map type"
              style={{ pointerEvents: 'auto' }}
            >
              <Map className="h-5 w-5 text-gray-700" />
            </button>
          </div>
          
          {/* Floating Ride Status Card */}
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="bg-white rounded-2xl shadow-xl p-4 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Ride in Progress</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  currentRide.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                  currentRide.status === 'picking_up' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {currentRide.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500">PICKUP</p>
                    <p className="text-sm text-gray-900 truncate">{currentRide.pickupLocation.address}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Navigation className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500">DESTINATION</p>
                    <p className="text-sm text-gray-900 truncate">{currentRide.destination.address}</p>
                  </div>
                </div>

                {currentRide.driverId && (
                  <div className="border-t pt-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">Your Driver</p>
                        <p className="text-xs text-gray-600">Arriving in 5 mins</p>
                      </div>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-400" />
                        <span className="ml-1 text-xs text-gray-600">4.9</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header - Fixed */}
      <Header title="Book a Ride" />
      
      {/* Map Container - Full remaining height */}
      <div className="flex-1 relative overflow-hidden map-full-height">
        {currentLocation && (
          <MapSwitch
            center={currentLocation}
            height="100%"
            markers={destinationLocation ? [currentLocation, destinationLocation] : [currentLocation]}
            showDirections={!!destinationLocation}
            destination={destinationLocation || undefined}
            drivers={nearbyDrivers.map(driver => ({
              id: driver.id.toString(),
              location: driver.currentLocation || driver.location!,
              name: driver.username
            }))}
          />
        )}

        {/* Map Controls - Relocate and Map Switch */}
        <div className="absolute bottom-28 right-4 z-50 flex flex-col space-y-2">
          {/* Relocate Button */}
          <button
            onClick={handleRefreshLocation}
            disabled={isRefreshingLocation}
            className={`w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 ${
              isRefreshingLocation 
                ? 'bg-blue-50 cursor-not-allowed' 
                : 'hover:bg-gray-50'
            }`}
            title="Relocate to current position"
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
          
          {/* Map Switch Button */}
          <button
            onClick={() => {
              console.log('Map switch button clicked!');
              // Toggle map type or show map options
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

        {/* Bottom Panel with margin */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-4">
          <div className="px-4">
            <div className="w-full max-w-sm mx-auto md:max-w-md lg:max-w-lg bg-white rounded-2xl shadow-2xl">
              {!showRideForm ? (
              <div className="p-4 pb-safe aspect-[3/1] flex flex-col justify-center">
                <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3"></div>
                
                <div className="space-y-3 mb-4">
                  {/* Current Location Display - Compact */}
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-green-800">Current Location</p>
                      <p className="text-sm text-gray-700 truncate">
                        {currentLocation?.address || 'Getting your location...'}
                      </p>
                    </div>
                    <button
                      onClick={handleRefreshLocation}
                      className="p-1 text-green-600 hover:bg-green-100 rounded-full transition-colors flex-shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Destination Input - Compact */}
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-sm rotate-45 flex-shrink-0 ml-1"></div>
                    <div className="flex-1">
                      <SimpleLocationSearch
                        placeholder="Where to?"
                        onLocationSelect={handleDestinationSelect}
                        icon="destination"
                        value={destination}
                      />
                    </div>
                  </div>
                </div>

                {/* Route Info - Compact */}
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

                {/* Find Drivers Button - Compact */}
                <button
                  onClick={() => setShowRideForm(true)}
                  disabled={!destinationLocation || !currentLocation}
                  className="w-full bg-black text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                >
                  Find Drivers
                </button>

                {/* Nearby Drivers Info - Compact */}
                {nearbyDrivers.length > 0 && (
                  <div className="mt-3 flex items-center justify-center space-x-2">
                    <div className="flex -space-x-1">
                      {nearbyDrivers.slice(0, 3).map((driver) => (
                        <div 
                          key={driver.id} 
                          className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border border-white text-xs text-white font-bold"
                        >
                          {driver.username.charAt(0)}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">
                      {nearbyDrivers.length} nearby
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 pb-safe aspect-[3/1] flex flex-col justify-center">
                <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3"></div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Ride</h3>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500">PICKUP</p>
                      <p className="text-sm text-gray-900 truncate">{currentLocation?.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Navigation className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500">DESTINATION</p>
                      <p className="text-sm text-gray-900 truncate">{destination}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{estimatedDuration || '15 mins'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="font-bold text-lg">${estimatedFare.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowRideForm(false)}
                    className="flex-1 bg-gray-100 text-gray-800 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleRequestRide}
                    disabled={loading}
                    className="flex-2 bg-black text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 disabled:opacity-50 transition-all duration-200 shadow-lg"
                  >
                    {loading ? 'Requesting...' : 'Request Ride'}
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderDashboard;