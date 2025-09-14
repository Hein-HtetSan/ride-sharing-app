import React, { useState, useEffect, useCallback } from 'react';
import { User, Phone, Navigation, MapPin } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { rideAPI, locationAPI } from '../../services/api';
import { OpenStreetMap } from '../Maps';
import Header from '../Layout/Header';

const BasicDriverDashboard: React.FC = () => {
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { currentLocation } = useLocation();

  // Update driver location
  const updateDriverLocation = useCallback(async () => {
    if (!currentLocation) return;
    
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (!userData.id) return;

      await locationAPI.updateLocation({
        userId: userData.id,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        address: currentLocation.address || `${currentLocation.lat}, ${currentLocation.lng}`
      });
    } catch (error) {
      console.error('Failed to update driver location:', error);
    }
  }, [currentLocation]);

  // Load current ride
  const loadCurrentRide = useCallback(async () => {
    try {
      const ride = await rideAPI.getCurrentRide();
      setCurrentRide(ride);
    } catch (error) {
      console.error('Failed to load current ride:', error);
    }
  }, []);

  useEffect(() => {
    loadCurrentRide();
    const interval = setInterval(loadCurrentRide, 10000);
    return () => clearInterval(interval);
  }, [loadCurrentRide]);

  // Update location every 30 seconds when idle, every 10 seconds when active
  useEffect(() => {
    if (currentLocation) {
      updateDriverLocation();
      const updateInterval = currentRide ? 10000 : 30000; // More frequent when on ride
      const locationInterval = setInterval(updateDriverLocation, updateInterval);
      return () => clearInterval(locationInterval);
    }
  }, [currentLocation, updateDriverLocation, currentRide]);

  const handleUpdateRideStatus = async (action: string) => {
    if (!currentRide) return;
    setLoading(true);
    
    try {
      await rideAPI.updateRideStatus(currentRide.id, action);
      
      // Update location immediately when status changes
      if (currentLocation) {
        await updateDriverLocation();
      }
      
      if (action === 'complete') {
        setCurrentRide(null);
      } else {
        await loadCurrentRide();
      }
    } catch (error) {
      console.error('Failed to update ride status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!currentRide) return;
    setLoading(true);
    
    try {
      await rideAPI.cancelRide(currentRide.id);
      setCurrentRide(null);
    } catch (error) {
      console.error('Failed to cancel ride:', error);
    } finally {
      setLoading(false);
    }
  };

  // No active ride
  if (!currentRide) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Header title="Driver Dashboard" />
        
        <div className="flex-1 flex flex-col">
          {/* Status Display */}
          <div className="bg-green-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <div className="font-semibold text-green-800">Available for Rides</div>
                  <div className="text-sm text-green-600">Waiting for ride requests...</div>
                </div>
              </div>
              <div className="text-6xl">🚖</div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1">
            {currentLocation ? (
              <OpenStreetMap
                center={currentLocation}
                zoom={16}
                height="100%"
                markers={[{
                  ...currentLocation,
                  address: 'Your Location'
                }]}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Getting your location...</p>
                </div>
              </div>
            )}
          </div>

          {/* Driver Status Panel */}
          <div className="bg-white border-t shadow-lg p-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Drive</h3>
              <p className="text-gray-600 mb-4">You'll be notified when riders request rides</p>
              {currentLocation && (
                <div className="text-sm text-gray-500">
                  Current Location: {currentLocation.address || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate destination based on ride status
  const destination = currentRide.status === 'IN_PROGRESS' ? {
    lat: currentRide.destinationLatitude,
    lng: currentRide.destinationLongitude,
    address: currentRide.destinationAddress || 'Destination'
  } : {
    lat: currentRide.pickupLatitude,
    lng: currentRide.pickupLongitude,
    address: currentRide.pickupAddress || 'Pickup Location'
  };

  const distance = currentLocation ? (
    Math.round(
      Math.sqrt(
        Math.pow(currentLocation.lat - destination.lat, 2) + 
        Math.pow(currentLocation.lng - destination.lng, 2)
      ) * 111 * 10
    ) / 10
  ) : 0;

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header title="Active Ride" />
      
      {/* Simple Navigation Bar */}
      <div className="bg-blue-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Navigation className="h-6 w-6" />
            <div>
              <div className="font-semibold">
                {currentRide.status === 'IN_PROGRESS' ? 'Going to Destination' : 'Going to Pickup'}
              </div>
              <div className="text-sm opacity-90">
                {destination.address} • {distance} km away
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{distance}</div>
            <div className="text-xs">km</div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        {currentLocation ? (
          <OpenStreetMap
            center={currentLocation}
            zoom={16}
            height="100%"
            markers={[
              currentLocation,
              destination
            ]}
            showDirections={true}
            pickup={currentLocation}
            destination={destination}
            routingService="ors"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Getting your location...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Panel */}
      <div className="bg-white border-t shadow-lg p-4">
        {/* Passenger Info */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">
              {currentRide.riderUsername || `Rider ${currentRide.riderId}`}
            </div>
            <div className="text-sm text-gray-600">
              Status: {currentRide.status.replace('_', ' ')}
            </div>
            {currentRide.riderPhone && (
              <div className="text-sm text-gray-500">{currentRide.riderPhone}</div>
            )}
          </div>
          
          {/* Call Button */}
          <button 
            onClick={() => currentRide.riderPhone && window.open(`tel:${currentRide.riderPhone}`, '_self')}
            className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white hover:bg-green-700"
          >
            <Phone className="h-6 w-6" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Status Action Button */}
          {currentRide.status === 'ACCEPTED' && (
            <button
              onClick={() => handleUpdateRideStatus('start_drive_to_pickup')}
              disabled={loading}
              className="col-span-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Drive to Pickup'}
            </button>
          )}
          
          {currentRide.status === 'DRIVER_EN_ROUTE' && (
            <button
              onClick={() => handleUpdateRideStatus('arrived_at_pickup')}
              disabled={loading}
              className="col-span-2 bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'I Have Arrived'}
            </button>
          )}
          
          {currentRide.status === 'ARRIVED' && (
            <button
              onClick={() => handleUpdateRideStatus('start_ride')}
              disabled={loading}
              className="col-span-2 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Trip to Destination'}
            </button>
          )}
          
          {currentRide.status === 'IN_PROGRESS' && (
            <button
              onClick={() => handleUpdateRideStatus('complete')}
              disabled={loading}
              className="col-span-2 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Completing...' : 'Complete Trip'}
            </button>
          )}

          {/* Cancel Button */}
          <button
            onClick={handleCancelRide}
            disabled={loading}
            className="col-span-2 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Cancelling...' : 'Cancel Ride'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BasicDriverDashboard;