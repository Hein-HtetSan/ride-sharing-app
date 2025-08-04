import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, DollarSign, User, Star } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { rideAPI } from '../../services/api';
import { Driver, Ride, RideRequest, Location } from '../../types';
import Header from '../Layout/Header';

const RiderDashboard: React.FC = () => {
  const [destination, setDestination] = useState('');
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRideForm, setShowRideForm] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState(0);

  const { currentLocation, requestLocation } = useLocation();

  useEffect(() => {
    loadCurrentRide();
    if (currentLocation) {
      loadNearbyDrivers();
    }
  }, [currentLocation]);

  const loadCurrentRide = async () => {
    try {
      const ride = await rideAPI.getCurrentRide();
      setCurrentRide(ride);
    } catch (error) {
      console.error('Failed to load current ride:', error);
    }
  };

  const loadNearbyDrivers = async () => {
    if (!currentLocation) return;
    
    try {
      const drivers = await rideAPI.getNearbyDrivers(currentLocation);
      setNearbyDrivers(drivers);
    } catch (error) {
      console.error('Failed to load nearby drivers:', error);
    }
  };

  const handleRequestRide = async () => {
    if (!currentLocation || !destination) return;

    setLoading(true);
    try {
      const destinationLocation: Location = {
        lat: 0, // In production, geocode the destination
        lng: 0,
        address: destination,
      };

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

  if (currentRide && currentRide.status !== 'completed') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Your Ride" />
        
        <div className="max-w-md mx-auto p-4">
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Ride in Progress</h2>
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
                  <p className="font-medium text-gray-900">Pickup</p>
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

              {currentRide.driverId && (
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Your Driver</p>
                      <p className="text-sm text-gray-600">Arriving in 5 mins</p>
                    </div>
                    <div className="ml-auto flex items-center">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span className="ml-1 text-sm text-gray-600">4.9</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Live Tracking</h3>
            <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-gray-600">Map will show here</p>
              <p className="text-sm text-gray-500 mt-2">
                (Integrate with Google Maps for real-time tracking)
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Book a Ride" />
      
      <div className="max-w-md mx-auto p-4">
        {!showRideForm ? (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Where are you going?</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Your Location</p>
                    <p className="text-sm text-gray-600">
                      {currentLocation?.address || 'Location not available'}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Where to?"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                  <Navigation className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>

                <button
                  onClick={() => setShowRideForm(true)}
                  disabled={!destination || !currentLocation}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Find Drivers
                </button>
              </div>
            </div>

            {nearbyDrivers.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Nearby Drivers ({nearbyDrivers.length})
                </h3>
                <div className="space-y-3">
                  {nearbyDrivers.slice(0, 3).map((driver) => (
                    <div key={driver.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{driver.name}</p>
                        <p className="text-sm text-gray-600">{driver.vehicleType}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span className="ml-1 text-sm text-gray-600">{driver.rating}</span>
                        </div>
                        <p className="text-sm text-gray-600">2 min away</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Your Ride</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">Pickup</p>
                  <p className="text-sm text-gray-600">{currentLocation?.address}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Navigation className="h-5 w-5 text-red-600 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">Destination</p>
                  <p className="text-sm text-gray-600">{destination}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-gray-600" />
                    <span className="text-gray-600">Estimated time</span>
                  </div>
                  <span className="font-medium">15 mins</span>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-gray-600" />
                    <span className="text-gray-600">Estimated fare</span>
                  </div>
                  <span className="font-medium">${calculateEstimatedFare(5).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowRideForm(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
              >
                Back
              </button>
              <button
                onClick={handleRequestRide}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
              >
                {loading ? 'Requesting...' : 'Request Ride'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderDashboard;