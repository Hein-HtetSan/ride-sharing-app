import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, User, Phone, Navigation, Car } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { rideAPI } from '../../services/api';
import { OpenStreetMap } from '../Maps';
import Header from '../Layout/Header';

const BasicRiderDashboard: React.FC = () => {
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [requestingRide, setRequestingRide] = useState(false);
  const [showRideRequest, setShowRideRequest] = useState(false);
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<{lat: number, lng: number} | null>(null);
  const { currentLocation } = useLocation();

  // Simple geocoding function using OpenStreetMap Nominatim
  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data[0]) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  };

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
    const interval = setInterval(loadCurrentRide, 5000);
    return () => clearInterval(interval);
  }, [loadCurrentRide]);

  const handleRequestRide = async () => {
    if (!currentLocation || !destination) return;
    
    setRequestingRide(true);
    try {
      // Try to geocode the destination address
      let destCoords = destinationCoords;
      if (!destCoords && destination) {
        destCoords = await geocodeAddress(destination);
        if (destCoords) {
          setDestinationCoords(destCoords);
        }
      }
      
      // If geocoding failed, use a default destination
      if (!destCoords) {
        destCoords = {
          lat: 12.9716, // Default destination
          lng: 77.5946
        };
      }
      
      const rideRequest = {
        pickupLocation: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          address: 'Current Location'
        },
        destination: {
          lat: destCoords.lat,
          lng: destCoords.lng,
          address: destination
        }
      };
      
      await rideAPI.requestRide(rideRequest);
      setShowRideRequest(false);
      setDestination('');
      setDestinationCoords(null);
      await loadCurrentRide();
    } catch (error) {
      console.error('Failed to request ride:', error);
    } finally {
      setRequestingRide(false);
    }
  };

  const handleCancelRide = async () => {
    if (!currentRide) return;
    
    try {
      await rideAPI.cancelRide(currentRide.id);
      setCurrentRide(null);
    } catch (error) {
      console.error('Failed to cancel ride:', error);
    }
  };

  // Show ride request form
  if (showRideRequest) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <Header title="Request a Ride" />
        
        <div className="flex-1 p-4">
          {/* Current Location */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Location
            </label>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <div className="font-medium">Current Location</div>
                <div className="text-sm text-gray-600">
                  {currentLocation ? 
                    `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` :
                    'Getting location...'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Where to?
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination address"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Map Preview */}
          <div className="mb-6 h-48 bg-gray-100 rounded-lg overflow-hidden">
            {currentLocation ? (
              <OpenStreetMap
                center={currentLocation}
                zoom={15}
                height="100%"
                markers={[currentLocation]}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">Loading map...</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowRideRequest(false)}
              className="py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestRide}
              disabled={requestingRide || !destination || !currentLocation}
              className="py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {requestingRide ? 'Requesting...' : 'Request Ride'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No active ride
  if (!currentRide) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Header title="Rider Dashboard" />
        
        <div className="flex-1 flex flex-col">
          {/* Map */}
          <div className="flex-1">
            {currentLocation ? (
              <OpenStreetMap
                center={currentLocation}
                zoom={15}
                height="100%"
                markers={[currentLocation]}
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

          {/* Request Ride Button */}
          <div className="p-4 bg-white border-t">
            <button
              onClick={() => setShowRideRequest(true)}
              disabled={!currentLocation}
              className="w-full bg-blue-600 text-white py-4 rounded-lg text-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {currentLocation ? 'Request a Ride' : 'Getting Location...'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active ride tracking
  const getStatusMessage = () => {
    switch (currentRide.status) {
      case 'PENDING':
        return 'Looking for a driver...';
      case 'ACCEPTED':
        return 'Driver assigned! Preparing to pick you up.';
      case 'DRIVER_EN_ROUTE':
        return 'Driver is on the way to pick you up';
      case 'ARRIVED':
        return 'Driver has arrived at pickup location';
      case 'IN_PROGRESS':
        return 'On the way to your destination';
      default:
        return 'Ride in progress';
    }
  };

  const getStatusColor = () => {
    switch (currentRide.status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
      case 'DRIVER_EN_ROUTE':
        return 'bg-blue-100 text-blue-800';
      case 'ARRIVED':
        return 'bg-purple-100 text-purple-800';
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header title="Active Ride" />
      
      {/* Status Bar */}
      <div className={`px-4 py-3 ${getStatusColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Car className="h-6 w-6" />
            <div>
              <div className="font-semibold">{getStatusMessage()}</div>
              <div className="text-sm opacity-75">Ride #{currentRide.id}</div>
            </div>
          </div>
          {currentRide.status === 'DRIVER_EN_ROUTE' && (
            <div className="text-right">
              <div className="font-bold">ETA</div>
              <div className="text-sm">~5 min</div>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        {currentLocation ? (
          <OpenStreetMap
            center={currentLocation}
            zoom={15}
            height="100%"
            markers={[
              {
                ...currentLocation,
                address: currentRide.pickupAddress || 'Pickup Location'
              },
              {
                lat: currentRide.destinationLatitude,
                lng: currentRide.destinationLongitude,
                address: currentRide.destinationAddress || 'Destination'
              }
            ]}
            showDirections={currentRide.status === 'IN_PROGRESS'}
            pickup={{
              lat: currentRide.pickupLatitude || currentLocation.lat,
              lng: currentRide.pickupLongitude || currentLocation.lng,
              address: currentRide.pickupAddress || 'Pickup Location'
            }}
            destination={{
              lat: currentRide.destinationLatitude,
              lng: currentRide.destinationLongitude,
              address: currentRide.destinationAddress || 'Destination'
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="bg-white border-t shadow-lg p-4">
        {/* Trip Details */}
        <div className="mb-4">
          <div className="flex items-start space-x-3 mb-3">
            <MapPin className="h-5 w-5 text-green-600 mt-1" />
            <div>
              <div className="font-medium">Pickup</div>
              <div className="text-sm text-gray-600">
                {currentRide.pickupAddress || 'Current Location'}
              </div>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-red-600 mt-1" />
            <div>
              <div className="font-medium">Destination</div>
              <div className="text-sm text-gray-600">
                {currentRide.destinationAddress || 'Destination'}
              </div>
            </div>
          </div>
        </div>

        {/* Driver Info (if available) */}
        {currentRide.driverUsername && (
          <div className="flex items-center space-x-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{currentRide.driverUsername}</div>
              <div className="text-sm text-gray-600">Your Driver</div>
            </div>
            <button 
              onClick={() => currentRide.driverPhone && window.open(`tel:${currentRide.driverPhone}`, '_self')}
              className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white hover:bg-green-700"
            >
              <Phone className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* Cancel Button */}
        {['PENDING', 'ACCEPTED', 'DRIVER_EN_ROUTE'].includes(currentRide.status) && (
          <button
            onClick={handleCancelRide}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700"
          >
            Cancel Ride
          </button>
        )}
      </div>
    </div>
  );
};

export default BasicRiderDashboard;