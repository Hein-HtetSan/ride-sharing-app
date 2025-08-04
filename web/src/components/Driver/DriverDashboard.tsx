import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  DollarSign, 
  Clock, 
  User, 
  Phone,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { rideAPI, locationAPI } from '../../services/api';
import { Ride } from '../../types';
import Header from '../Layout/Header';

const DriverDashboard: React.FC = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);

  const { currentLocation, requestLocation } = useLocation();

  useEffect(() => {
    loadCurrentRide();
    if (isOnline && currentLocation) {
      updateDriverLocation();
      loadAvailableRides();
    }
  }, [isOnline, currentLocation]);

  const loadCurrentRide = async () => {
    try {
      const ride = await rideAPI.getCurrentRide();
      setCurrentRide(ride);
    } catch (error) {
      console.error('Failed to load current ride:', error);
    }
  };

  const loadAvailableRides = async () => {
    try {
      // This would fetch rides near the driver's location
      const rides = await rideAPI.getNearbyDrivers(currentLocation!, 10);
      setAvailableRides([]);
    } catch (error) {
      console.error('Failed to load available rides:', error);
    }
  };

  const updateDriverLocation = async () => {
    if (!currentLocation) return;
    
    try {
      await locationAPI.updateLocation(currentLocation);
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const handleToggleOnline = async () => {
    if (!isOnline) {
      try {
        await requestLocation();
        setIsOnline(true);
      } catch (error) {
        console.error('Location permission required');
      }
    } else {
      setIsOnline(false);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    setLoading(true);
    try {
      const ride = await rideAPI.acceptRide(rideId);
      setCurrentRide(ride);
      setAvailableRides(availableRides.filter(r => r.id !== rideId));
    } catch (error) {
      console.error('Failed to accept ride:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRideStatus = async (status: string) => {
    if (!currentRide) return;

    try {
      await rideAPI.updateRideStatus(currentRide.id, status);
      setCurrentRide({ ...currentRide, status: status as any });
      
      if (status === 'completed') {
        setCurrentRide(null);
      }
    } catch (error) {
      console.error('Failed to update ride status:', error);
    }
  };

  if (currentRide && currentRide.status !== 'completed') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Current Ride" />
        
        <div className="max-w-md mx-auto p-4">
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Active Ride</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentRide.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                currentRide.status === 'picking_up' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {currentRide.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">Pickup Location</p>
                  <p className="text-sm text-gray-600">{currentRide.pickupLocation.address}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Navigation className="h-5 w-5 text-red-600 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">Destination</p>
                  <p className="text-sm text-gray-600">{currentRide.destination.address}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Passenger</p>
                    <p className="text-sm text-gray-600">Waiting for pickup</p>
                  </div>
                  <button className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700">
                    <Phone className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {currentRide.fare && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-600">Fare</span>
                    </div>
                    <span className="font-bold text-lg">${currentRide.fare.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              {currentRide.status === 'accepted' && (
                <button
                  onClick={() => handleUpdateRideStatus('picking_up')}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
                >
                  Start Pickup
                </button>
              )}
              
              {currentRide.status === 'picking_up' && (
                <button
                  onClick={() => handleUpdateRideStatus('in_progress')}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200"
                >
                  Passenger Picked Up
                </button>
              )}
              
              {currentRide.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateRideStatus('completed')}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200"
                >
                  Complete Ride
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Navigation</h3>
            <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Live Navigation</p>
                <p className="text-sm text-gray-500 mt-2">
                  (Integrate with Google Maps for turn-by-turn directions)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Driver Dashboard" />
      
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Driver Status</h2>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium text-gray-600">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <button
            onClick={handleToggleOnline}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
              isOnline
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>

          {currentLocation && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Current Location</p>
                  <p className="text-sm text-gray-600">{currentLocation.address}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {isOnline && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Today's Earnings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">$85.50</p>
                  <p className="text-sm text-gray-600">Total Earned</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">12</p>
                  <p className="text-sm text-gray-600">Rides Completed</p>
                </div>
              </div>
            </div>

            {availableRides.length > 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Available Rides</h3>
                <div className="space-y-4">
                  {availableRides.map((ride) => (
                    <div key={ride.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-5 w-5 text-green-600 mt-1" />
                          <div>
                            <p className="font-medium text-gray-900">Pickup</p>
                            <p className="text-sm text-gray-600">{ride.pickupLocation.address}</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <Navigation className="h-5 w-5 text-red-600 mt-1" />
                          <div>
                            <p className="font-medium text-gray-900">Destination</p>
                            <p className="text-sm text-gray-600">{ride.destination.address}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">2.5 km away</span>
                            <span className="text-lg font-bold text-green-600">
                              ${ride.fare?.toFixed(2) || '12.50'}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                              <XCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleAcceptRide(ride.id)}
                              disabled={loading}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-center py-8">
                  <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No rides available</h3>
                  <p className="text-gray-600">
                    Stay online and we'll notify you when riders request rides in your area.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;