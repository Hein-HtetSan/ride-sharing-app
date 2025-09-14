// Simple Driver Navigation with Google Maps
import React, { useState, useEffect, useCallback } from 'react';
import { User, Phone } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { rideAPI } from '../../services/api';
import GoogleMapsNavigation from '../Maps/GoogleMapsNavigation';

const SimpleDriverDashboard: React.FC = () => {
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeInfo, setRouteInfo] = useState({ duration: 0, distance: 0 });
  const { currentLocation } = useLocation();
  const { user } = useAuth();

  // Load current ride
  const loadCurrentRide = useCallback(async () => {
    try {
      const ride = await rideAPI.getCurrentRide();
      setCurrentRide(ride);
      
      // Auto-start navigation when ride is accepted
      if (ride && !isNavigating) {
        setIsNavigating(true);
      }
    } catch (error) {
      console.error('Failed to load current ride:', error);
    }
  }, [isNavigating]);

  useEffect(() => {
    loadCurrentRide();
    // Refresh every 10 seconds
    const interval = setInterval(loadCurrentRide, 10000);
    return () => clearInterval(interval);
  }, [loadCurrentRide]);

  const handleStatusUpdate = async (action: string) => {
    if (!currentRide) return;
    
    try {
      await rideAPI.updateRideStatus(currentRide.id, action);
      if (action === 'complete') {
        setCurrentRide(null);
        setIsNavigating(false);
      } else {
        await loadCurrentRide();
      }
    } catch (error) {
      console.error('Failed to update ride status:', error);
    }
  };

  const getDestination = () => {
    if (!currentRide) return null;
    
    return currentRide.status === 'IN_PROGRESS' ? {
      lat: currentRide.destinationLatitude,
      lng: currentRide.destinationLongitude,
      address: currentRide.destinationAddress
    } : {
      lat: currentRide.pickupLatitude,
      lng: currentRide.pickupLongitude,
      address: currentRide.pickupAddress
    };
  };

  if (!currentRide) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🚖</div>
          <h2 className="text-xl font-semibold mb-2">No Active Ride</h2>
          <p className="text-gray-600">Waiting for ride requests...</p>
        </div>
      </div>
    );
  }

  const destination = getDestination();
  if (!currentLocation || !destination) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">📍</div>
          <h2 className="text-xl font-semibold mb-2">Getting Location...</h2>
          <p className="text-gray-600">Please allow location access</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {isNavigating ? (
        // Google Maps Navigation View
        <>
          {/* Top Navigation Bar */}
          <div className="bg-white border-b shadow-sm px-4 py-3 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">↑</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {destination.address?.split(',')[0] || 'Destination'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentRide.status === 'IN_PROGRESS' ? 'To destination' : 'To pickup'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsNavigating(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Google Maps */}
          <div className="flex-1 relative">
            <GoogleMapsNavigation
              origin={currentLocation}
              destination={destination}
              navigationMode={true}
              onDirectionsReady={(duration, distance) => {
                setRouteInfo({ duration, distance });
              }}
            />

            {/* Distance/Time Display */}
            <div className="absolute bottom-20 left-4 bg-white rounded-lg shadow-lg px-4 py-3">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{routeInfo.distance.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">km</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.round(routeInfo.duration)}</div>
                  <div className="text-xs text-gray-500">min</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="bg-white border-t px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">
                    {currentRide.riderUsername || `Rider ${currentRide.riderId}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentRide.status === 'IN_PROGRESS' ? 'In vehicle' : 'Waiting'}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => currentRide.riderPhone && window.open(`tel:${currentRide.riderPhone}`, '_self')}
                  className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white"
                >
                  <Phone className="h-5 w-5" />
                </button>
                
                {currentRide.status === 'DRIVER_EN_ROUTE' && (
                  <button
                    onClick={() => handleStatusUpdate('arrived_at_pickup')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
                  >
                    Arrived
                  </button>
                )}
                
                {currentRide.status === 'ARRIVED' && (
                  <button
                    onClick={() => handleStatusUpdate('start_ride')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium"
                  >
                    Start Trip
                  </button>
                )}
                
                {currentRide.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleStatusUpdate('complete')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium"
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        // Simple Overview Mode
        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Current Ride</h2>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Passenger</div>
                <div className="font-medium">
                  {currentRide.riderUsername || `Rider ${currentRide.riderId}`}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">
                  {currentRide.status === 'IN_PROGRESS' ? 'Destination' : 'Pickup Location'}
                </div>
                <div className="font-medium">{destination.address}</div>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <button
                  onClick={() => setIsNavigating(true)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium"
                >
                  Start Navigation
                </button>
                
                <button 
                  onClick={() => currentRide.riderPhone && window.open(`tel:${currentRide.riderPhone}`, '_self')}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg"
                >
                  <Phone className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleDriverDashboard;