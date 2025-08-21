import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, Clock, Map, MapPin, Route, X } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { rideAPI, locationAPI, userAPI } from '../../services/api';
import { Driver, Ride, RideRequest, Location } from '../../types';
import { LocationService } from '../../services/locationService';
import { RoutingService } from '../../services/routingService';
import Header from '../Layout/Header';
import { OpenStreetMap, LocationSearch } from '../Maps';


const RiderDashboard: React.FC = () => {
  const [destination, setDestination] = useState('');
  const [pickup, setPickup] = useState('');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<Location | null>(null);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success' | 'error'>('idle');
  const [driverAccepted, setDriverAccepted] = useState(false); // Track when driver accepts the ride
  const [waitingForDriver, setWaitingForDriver] = useState(false); // Track when waiting for driver acceptance
  const [estimatedDuration, setEstimatedDuration] = useState<string>('');
  const [estimatedDistance, setEstimatedDistance] = useState<string>('');
  const [correctLocation, setCorrectLocation] = useState<Location | null>(null);
  const [isMapPickingMode, setIsMapPickingMode] = useState(false);
  const [pickupFieldMode, setPickupFieldMode] = useState(false); // true for pickup, false for destination
  const [cancellationNotification, setCancellationNotification] = useState<{
    show: boolean;
    message: string;
    type: 'driver_cancelled' | 'other';
  }>({ show: false, message: '', type: 'other' });
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [driverInfo, setDriverInfo] = useState<Driver | null>(null);


  const { currentLocation, requestDirectGPS } = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Function to load driver information and location
  const loadDriverInfo = useCallback(async (driverId: number) => {
    try {
      console.log('🚗 Loading driver info for ID:', driverId);
      
      // Get driver details
      const driverResponse = await userAPI.getUserById(driverId);
      if (driverResponse.success && driverResponse.data) {
        const driverData = driverResponse.data as Driver;
        setDriverInfo(driverData);
        console.log('✅ Driver info loaded:', driverData);
      }
      
      // Get driver's real-time location
      const locationResponse = await locationAPI.getRealTimeLocation(driverId.toString());
      if (locationResponse && locationResponse.latitude && locationResponse.longitude) {
        const driverLoc: Location = {
          lat: locationResponse.latitude,
          lng: locationResponse.longitude,
          address: locationResponse.address || 'Driver location'
        };
        setDriverLocation(driverLoc);
        console.log('📍 Driver location loaded:', driverLoc);
      }
    } catch (error) {
      console.error('❌ Failed to load driver info:', error);
    }
  }, []);

  // Function to update user location on server
  const updateUserLocationOnServer = useCallback(async (location: Location) => {
    
    try {
      // Check if user is authenticated and has required data
      if (!isAuthenticated || !user?.id) {
        return;
      }

      // Prepare location data with userId and additional fields
      const locationData = {
        ...location,
        userId: user.id,
        address: location.address || '',
        lastUpdated: new Date().toISOString(),
        isOnline: true
      };

      // Use the existing locationAPI service
      await locationAPI.updateLocation(locationData);
      
    } catch {
      // Silently handle location update errors
    }
  }, [isAuthenticated, user]);

  // Initialize with correct GPS location on component mount
  useEffect(() => {
    const initializeCorrectLocation = async () => {
      try {
        const freshGPS = await requestDirectGPS();
        
        if (freshGPS) {
          // Fetch address using reverse geocoding
          try {
            const withAddress = await LocationService.reverseGeocode(freshGPS.lat, freshGPS.lng);
            setCorrectLocation(withAddress);
            
            // Update user location on server after successful GPS fetch
            await updateUserLocationOnServer(withAddress);
          } catch {
            setCorrectLocation(freshGPS);
            
            // Update user location on server even without address
            await updateUserLocationOnServer(freshGPS);
          }
        }
      } catch (error) {
        console.error('Failed to get GPS location:', error);
      }
    };
    initializeCorrectLocation();
  }, [requestDirectGPS, updateUserLocationOnServer]);

  // Create swapped version of location if needed

  const displayLocation = correctLocation || currentLocation;

  // Auto-calculate route when destination is set and no pickup is selected (use current location)
  useEffect(() => {
    if (destinationLocation && displayLocation && !pickupLocation) {
      calculateRoute(displayLocation, destinationLocation);
    }
  }, [destinationLocation, displayLocation, pickupLocation]);



  // Add location refresh handler
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  
  const handleRefreshLocation = async () => {
    if (isRefreshingLocation) return;
    setLocationError('');
    try {
      setIsRefreshingLocation(true);
      const freshGPS = await requestDirectGPS();
      if (freshGPS) {
        try {
          const withAddress = await LocationService.reverseGeocode(freshGPS.lat, freshGPS.lng);
          setCorrectLocation(withAddress);
          
          // Update user location on server after successful location refresh
          await updateUserLocationOnServer(withAddress);
        } catch {
          setCorrectLocation(freshGPS);
          
          // Update user location on server even without address
          await updateUserLocationOnServer(freshGPS);
        }
      } else {
        throw new Error('requestDirectGPS returned null');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown location error';
      setLocationError(errorMessage);
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  const loadCurrentRide = useCallback(async () => {
    try {
      const ride = await rideAPI.getCurrentRide();
      setCurrentRide(ride);
      
      // Handle ride status changes
      if (ride) {
        console.log('📍 Current ride status:', ride.status);
        
        switch (ride.status) {
          case 'PENDING':
            setWaitingForDriver(true);
            setDriverAccepted(false);
            setBookingStatus('booking');
            break;
          case 'ACCEPTED':
          case 'DRIVER_EN_ROUTE':
          case 'ARRIVED':
          case 'IN_PROGRESS':
            setWaitingForDriver(false);
            setDriverAccepted(true);
            setBookingStatus('success');
            
            // Load driver information and location when ride is accepted
            if (ride.driverId && (!driverInfo || driverInfo.id !== ride.driverId)) {
              loadDriverInfo(ride.driverId);
            }
            break;
          case 'COMPLETED':
            // Reset states for completed ride
            setWaitingForDriver(false);
            setDriverAccepted(false);
            setBookingStatus('idle');
            setCurrentRide(null);
            setDriverLocation(null);
            setDriverInfo(null);
            break;
          case 'CANCELLED':
            // Handle cancellation by driver
            console.log('❌ Ride was cancelled by driver');
            setWaitingForDriver(false);
            setDriverAccepted(false);
            setBookingStatus('idle'); // Set to idle instead of error
            setCurrentRide(null);
            setDriverLocation(null);
            setDriverInfo(null);
            
            // Show specific cancellation notification
            setCancellationNotification({
              show: true,
              message: 'Your ride was cancelled by the driver. Please try booking again.',
              type: 'driver_cancelled'
            });
            
            // Hide notification after 5 seconds
            setTimeout(() => {
              setCancellationNotification({
                show: false,
                message: '',
                type: 'other'
              });
            }, 5000);
            break;
        }
      } else {
        // No current ride
        setWaitingForDriver(false);
        setDriverAccepted(false);
        setBookingStatus('idle');
        setDriverLocation(null);
        setDriverInfo(null);
      }
    } catch (error) {
      console.error('Failed to load current ride:', error);
    }
  }, [driverInfo, loadDriverInfo]);

  useEffect(() => {
    loadCurrentRide();
  }, [displayLocation, loadCurrentRide]);

  // Add polling for ride status updates
  useEffect(() => {
    let pollInterval: number;
    
    // Only poll when we have a current ride or are waiting for a driver
    if (currentRide || waitingForDriver) {
      pollInterval = window.setInterval(() => {
        loadCurrentRide();
      }, 3000); // Poll every 3 seconds
      
      console.log('🔄 Started polling ride status every 3 seconds');
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        console.log('🛑 Stopped polling ride status');
      }
    };
  }, [currentRide, waitingForDriver, loadCurrentRide]);

  // Add polling for driver location when ride is accepted
  useEffect(() => {
    let driverLocationPoll: number;
    
    // Poll driver location when ride is accepted and we have driver info
    if (currentRide && driverAccepted && currentRide.driverId && 
        ['ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED'].includes(currentRide.status)) {
      
      const pollDriverLocation = async () => {
        try {
          const locationResponse = await locationAPI.getRealTimeLocation(currentRide.driverId.toString());
          if (locationResponse && locationResponse.latitude && locationResponse.longitude) {
            const newDriverLocation: Location = {
              lat: locationResponse.latitude,
              lng: locationResponse.longitude,
              address: locationResponse.address || 'Driver location'
            };
            setDriverLocation(newDriverLocation);
            console.log('📍 Updated driver location:', newDriverLocation);
          }
        } catch (error) {
          console.error('❌ Failed to fetch driver location:', error);
        }
      };
      
      // Poll immediately then every 5 seconds
      pollDriverLocation();
      driverLocationPoll = window.setInterval(pollDriverLocation, 5000);
      
      console.log('🚗 Started polling driver location every 5 seconds');
    }
    
    return () => {
      if (driverLocationPoll) {
        clearInterval(driverLocationPoll);
        console.log('🛑 Stopped polling driver location');
      }
    };
  }, [currentRide, driverAccepted]);

  const handleBookingNow = async () => {
    if (!displayLocation || !destinationLocation) return;

    setBookingStatus('booking');
    setWaitingForDriver(true); // Start radiating animation immediately when booking starts
    setDriverAccepted(false); // Reset driver acceptance

    try {
      // Prepare the ride request data
      const rideRequest: RideRequest = {
        pickupLocation: pickupLocation || displayLocation, // Use selected pickup or current location
        destination: destinationLocation,
      };

      // Validate required data
      if (!rideRequest.pickupLocation || !rideRequest.destination) {
        throw new Error('Missing pickup location or destination');
      }

      if (!rideRequest.pickupLocation.lat || !rideRequest.pickupLocation.lng) {
        throw new Error('Invalid pickup location coordinates');
      }

      if (!rideRequest.destination.lat || !rideRequest.destination.lng) {
        throw new Error('Invalid destination coordinates');
      }

      // Send POST request to Spring backend
      const rideResponse = await rideAPI.requestRide(rideRequest);
      
      console.log('✅ Ride requested successfully, ID:', rideResponse.data);
      
      if (rideResponse.success && rideResponse.data) {
        // Create a ride object with the returned ID and request data
        const newRide: Ride = {
          id: rideResponse.data, // This is the ride ID from the backend
          riderId: user?.id || 0,
          driverId: 0,
          pickupLatitude: rideRequest.pickupLocation.lat,
          pickupLongitude: rideRequest.pickupLocation.lng,
          destinationLatitude: rideRequest.destination.lat,
          destinationLongitude: rideRequest.destination.lng,
          pickupAddress: rideRequest.pickupLocation.address,
          destinationAddress: rideRequest.destination.address,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('🆔 Created ride object with ID:', newRide.id);
        setCurrentRide(newRide);
      }
      
      // Ride status will be updated through polling in the useEffect
      
    } catch (error) {
      console.error('Booking failed:', error);
      setBookingStatus('error');
      setWaitingForDriver(false); // Stop radiating on error
      setDriverAccepted(false);
      
      // Reset status after showing error
      setTimeout(() => {
        setBookingStatus('idle');
      }, 3000);
    }
  };

  const handleCancelBooking = async () => {
    try {
      setLoading(true);
      
      // Check if we have a valid ride to cancel
      if (!currentRide) {
        console.warn('⚠️ No current ride to cancel');
        // Reset all booking states even if no ride to cancel
        setBookingStatus('idle');
        setWaitingForDriver(false);
        setDriverAccepted(false);
        setCurrentRide(null);
        return;
      }

      if (!currentRide.id) {
        console.error('❌ Current ride has no ID:', currentRide);
        // Reset all booking states
        setBookingStatus('idle');
        setWaitingForDriver(false);
        setDriverAccepted(false);
        setCurrentRide(null);
        return;
      }
      
      // Call the API to cancel the ride
      console.log('🔄 Cancelling ride with ID:', currentRide.id);
      await rideAPI.cancelRide(currentRide.id);
      console.log('✅ Ride cancelled successfully');
      
      // Reset all booking states
      setBookingStatus('idle');
      setWaitingForDriver(false);
      setDriverAccepted(false);
      setCurrentRide(null);
      
    } catch (error) {
      console.error('❌ Failed to cancel ride:', error);
      // Still reset the UI state even if API call fails
      setBookingStatus('idle');
      setWaitingForDriver(false);
      setDriverAccepted(false);
      setCurrentRide(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateRoute = async (from: Location, to: Location) => {
    try {
      // Use RoutingService (with ORS API) for accurate routing
      const routeResult = await RoutingService.getRoute(from, to);
      
      setEstimatedDuration(RoutingService.formatDuration(routeResult.duration));
      setEstimatedDistance(`${routeResult.distance.toFixed(1)} km`);
      
    } catch {
      // Fallback to simple distance calculation
      const distance = LocationService.calculateDistance(from, to);
      const duration = LocationService.estimateDuration(distance);
      
      setEstimatedDuration(duration);
      setEstimatedDistance(`${distance.toFixed(1)} km`);
    }
  };

  const handleLocationSelect = async (location: Location, isPickupMode?: boolean) => {
    // Use the passed parameter or fallback to state
    const currentMode = isPickupMode !== undefined ? isPickupMode : pickupFieldMode;
    
    // Check if this is a clear operation (empty address means clear)
    if (!location.address || location.address === '') {
      if (currentMode) {
        setPickupLocation(null);
        setPickup('');
      } else {
        setDestinationLocation(null);
        setDestination('');
        setEstimatedDuration('');
        setEstimatedDistance('');
      }
      setIsMapPickingMode(false); // Exit map picking mode
      return;
    }
    
    if (currentMode) {
      // Handle pickup selection
      setPickupLocation(location);
      setPickup(location.address);
    } else {
      // Handle destination selection
      setDestinationLocation(location);
      setDestination(location.address);
    }
    
    setIsMapPickingMode(false); // Exit map picking mode after selection
    
    // Calculate route if both pickup and destination are available
    const fromLocation = currentMode ? location : (pickupLocation || displayLocation);
    const toLocation = currentMode ? destinationLocation : location;
    
    if (fromLocation && toLocation) {
      await calculateRoute(fromLocation, toLocation);
    }
  };

  // Handle map picking mode toggle for pickup
  const handlePickupMapToggle = () => {
    if (isMapPickingMode && pickupFieldMode) {
      // Exit picking mode if already in pickup mode
      setIsMapPickingMode(false);
    } else {
      // Enter pickup picking mode
      setPickupFieldMode(true);
      setIsMapPickingMode(true);
    }
  };

  // Handle map picking mode toggle for destination
  const handleDestinationMapToggle = () => {
    if (isMapPickingMode && !pickupFieldMode) {
      // Exit picking mode if already in destination mode
      setIsMapPickingMode(false);
    } else {
      // Enter destination picking mode
      setPickupFieldMode(false);
      setIsMapPickingMode(true);
    }
  };

  // Handle clear pickup
  const handleClearPickup = () => {
    setPickupLocation(null);
    setPickup('');
    
    // Recalculate route if destination exists (from current location to destination)
    if (destinationLocation && displayLocation) {
      calculateRoute(displayLocation, destinationLocation);
    } else {
      // Clear route info if no destination
      setEstimatedDuration('');
      setEstimatedDistance('');
    }
    
    setIsMapPickingMode(false);
  };

  // Handle clear destination
  const handleClearDestination = () => {
    setDestinationLocation(null);
    setDestination('');
    setEstimatedDuration('');
    setEstimatedDistance('');
    setIsMapPickingMode(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden no-zoom-bounce">
      <Header title="Book a Ride" />
      
      {/* Cancellation Notification */}
      {cancellationNotification.show && (
        <div className="absolute top-16 left-4 right-4 z-50 animate-slide-down">
          <div className={`rounded-lg p-4 shadow-lg border-l-4 ${
            cancellationNotification.type === 'driver_cancelled' 
              ? 'bg-red-50 border-red-400 text-red-800' 
              : 'bg-yellow-50 border-yellow-400 text-yellow-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium">
                  {cancellationNotification.type === 'driver_cancelled' ? 'Ride Cancelled' : 'Notification'}
                </h3>
                <p className="mt-1 text-sm">
                  {cancellationNotification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setCancellationNotification({ show: false, message: '', type: 'other' })}
                  className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Information Panel */}
      {driverAccepted && currentRide && driverInfo && (
        <div className="absolute top-20 left-4 right-4 z-40">
          <div className="bg-white rounded-lg p-4 shadow-lg border-l-4 border-green-400">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">🚖</span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  Your Driver is Coming!
                </h3>
                <div className="mt-2 text-sm text-gray-600">
                  <p className="font-medium">{driverInfo.username}</p>
                  <p className="text-xs">{driverInfo.phone}</p>
                  {currentRide.status === 'ACCEPTED' && (
                    <p className="text-blue-600 mt-1">
                      🚗 Driver is on the way to pick you up
                      {driverLocation && displayLocation && (
                        <span className="block text-xs">
                          {LocationService.calculateDistance(driverLocation, pickupLocation || displayLocation).toFixed(1)} km away
                        </span>
                      )}
                    </p>
                  )}
                  {currentRide.status === 'DRIVER_EN_ROUTE' && (
                    <p className="text-blue-600 mt-1">
                      🚗 Driver is approaching your location
                      {driverLocation && displayLocation && (
                        <span className="block text-xs">
                          {LocationService.calculateDistance(driverLocation, pickupLocation || displayLocation).toFixed(1)} km away
                        </span>
                      )}
                    </p>
                  )}
                  {currentRide.status === 'ARRIVED' && (
                    <p className="text-green-600 mt-1">✅ Driver has arrived at pickup location</p>
                  )}
                  {currentRide.status === 'IN_PROGRESS' && (
                    <p className="text-purple-600 mt-1">🛣️ Ride in progress to destination</p>
                  )}
                </div>
              </div>
              {driverLocation && (
                <div className="ml-4 text-right">
                  <div className="text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mb-1"></div>
                    Live Location
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      
      <div className="flex-1 relative overflow-hidden map-full-height">
        {displayLocation ? (
          <OpenStreetMap
            key={`${displayLocation.lat}-${displayLocation.lng}-${pickupLocation?.lat || 'none'}-${pickupLocation?.lng || 'none'}-${destinationLocation?.lat || 'none'}-${destinationLocation?.lng || 'none'}-${isMapPickingMode}-${driverLocation?.lat || 'none'}`}
            center={waitingForDriver || driverAccepted ? (pickupLocation || displayLocation) : displayLocation} // Center on pickup during booking
            zoom={waitingForDriver || driverAccepted ? 17 : 15} // Zoom in during booking
            height="100%"
            markers={[
              displayLocation,
              ...(pickupLocation ? [pickupLocation] : []),
              ...(destinationLocation ? [destinationLocation] : [])
            ]}
            showDirections={
              driverAccepted && driverLocation ? 
                true : // Show route from driver to pickup when driver is coming
                !!(destinationLocation && displayLocation && !waitingForDriver && !driverAccepted) // Original rider route when no driver
            }
            destination={
              driverAccepted && driverLocation ? 
                (pickupLocation || displayLocation) : // Route to pickup when driver is coming  
                (destinationLocation || undefined) // Original destination when no driver
            }
            pickup={
              driverAccepted && driverLocation ? 
                driverLocation : // Start route from driver location when driver is coming
                (pickupLocation || displayLocation) // Original pickup/current location when no driver
            }
            routingService="ors"
            onLocationSelect={isMapPickingMode ? handleLocationSelect : undefined}
            driverAccepted={driverAccepted} // Pass driver acceptance state for animation
            waitingForDriver={waitingForDriver} // Pass waiting state for radiating animation
            driverLocation={driverLocation || undefined} // Pass driver's real-time location
            driverInfo={driverInfo ? { id: driverInfo.id, username: driverInfo.username, phone: driverInfo.phone } : undefined} // Pass driver information
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
                  try {
                    setIsRefreshingLocation(true);
                    const directLocation = await requestDirectGPS();
                    
                    if (directLocation) {
                      try {
                        const withAddress = await LocationService.reverseGeocode(directLocation.lat, directLocation.lng);
                        setCorrectLocation(withAddress);
                        
                        // Update user location on server after successful GPS fetch
                        await updateUserLocationOnServer(withAddress);
                      } catch {
                        setCorrectLocation(directLocation);
                        
                        // Update user location on server even without address
                        await updateUserLocationOnServer(directLocation);
                      }
                    }
                  } catch (error) {
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
                        fixed top-16 right-4 z-40">
          <button
            onClick={handleRefreshLocation}
            disabled={isRefreshingLocation}
            className={`w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 ${
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
              const event = new CustomEvent('toggleMapType');
              window.dispatchEvent(event);
            }}
            className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
            title="Switch map type"
            style={{ pointerEvents: 'auto' }}
          >
            <Map className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Map Click Instruction */}
        {displayLocation && isMapPickingMode && (
          <div className="map-overlay-instruction fixed top-20 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
            <div className={`text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 animate-bounce ${
              pickupFieldMode ? 'bg-blue-600' : 'bg-red-600'
            }`}>
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-sm font-medium">
                Click on map to set {pickupFieldMode ? 'pickup location' : 'destination'}
              </span>
            </div>
          </div>
        )}

        {/* Bottom Panel */}
        <div className={`map-overlay-bottom pb-safe zoom-stable 
                        fixed bottom-0 left-0 right-0 overflow-y-auto
                        md:top-16 md:left-12 md:right-auto md:bottom-8 md:w-96 md:max-h-none ${
                          waitingForDriver || driverAccepted 
                            ? 'max-h-[35vh]' // Smaller during booking to show map radiation
                            : 'max-h-[50vh]' // Normal height when not booking
                        }`}>
          <div className={`px-4 md:px-0 ${
            waitingForDriver || driverAccepted ? 'pb-2' : 'pb-4'
          }`}>
            <div className="w-full mx-auto bg-white rounded-t-2xl md:rounded-2xl shadow-2xl no-zoom-bounce">
              <div className={`${
                waitingForDriver || driverAccepted ? 'p-2 md:p-3' : 'p-3 md:p-4'
              }`}>
                <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-2 md:mb-3"></div>
                
                {/* Current Location Display - Hidden on mobile */}
                <div className="mb-3 hidden md:block">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="text-xs md:text-sm font-bold text-gray-900">Your Current Location</span>
                  </div>
                  <div className="p-2 md:p-3 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium text-green-900 truncate">
                        {displayLocation?.address || 'Getting your location...'}
                      </p>
                      {displayLocation?.city && (
                        <p className="text-xs text-green-700 mt-1">{displayLocation.city}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pickup Location Input */}
                <div className={`${waitingForDriver || driverAccepted ? 'mb-2 hidden md:block' : 'mb-3'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-xs md:text-sm font-bold text-gray-900">Pickup Location</span>
                    <span className="text-xs text-gray-500">(Default: Current Location)</span>
                  </div>
                  
                  <div className="bg-white rounded-lg border-2 border-gray-200 overflow-visible">
                    <div className="flex items-stretch">
                      <div className="flex-1">
                        <LocationSearch
                          placeholder={displayLocation?.address || "Search pickup location or use map pin"}
                          onLocationSelect={(location) => {
                            handleLocationSelect(location, true); // Pass true for pickup mode
                          }}
                          className="pickup-search"
                          value={pickup || (displayLocation?.address || '')}
                          onChange={setPickup}
                        />
                      </div>
                      
                      {/* Pickup Pin/Map Picking Button */}
                      <button
                        onClick={handlePickupMapToggle}
                        className={`px-3 md:px-4 py-2 md:py-3 border-l-2 transition-all duration-200 flex items-center justify-center min-w-[48px] md:min-w-[56px] ${
                          isMapPickingMode && pickupFieldMode
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                        }`}
                        title={isMapPickingMode && pickupFieldMode ? "Exit pickup map picking" : "Pick pickup from map"}
                      >
                        <MapPin className={`h-4 w-4 ${isMapPickingMode && pickupFieldMode ? 'text-white' : ''}`} />
                      </button>
                      
                      {/* Clear Pickup Button */}
                      {pickupLocation && (
                        <button
                          onClick={handleClearPickup}
                          className="px-3 md:px-4 py-2 md:py-3 border-l-2 border-gray-200 bg-gray-50 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200 flex items-center justify-center min-w-[48px] md:min-w-[56px]"
                          title="Clear pickup"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Pickup Map Picking Instruction */}
                  {isMapPickingMode && pickupFieldMode && (
                    <div className="mt-1 md:mt-2 p-2 md:p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <div className="flex items-center space-x-2 text-blue-800">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="text-xs md:text-sm font-medium">Click anywhere on the map to select pickup location</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Destination Input */}
                <div className={`${waitingForDriver || driverAccepted ? 'mb-2 hidden md:block' : 'mb-3'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-sm rotate-45 flex-shrink-0 ml-1"></div>
                    <span className="text-xs md:text-sm font-bold text-gray-900">Destination</span>
                  </div>
                  
                  <div className="bg-white rounded-lg border-2 border-gray-200 overflow-visible">
                    <div className="flex items-stretch">
                      <div className="flex-1">
                        <LocationSearch
                          placeholder="Search destination or use map pin"
                          onLocationSelect={(location) => {
                            handleLocationSelect(location, false); // Pass false for destination mode
                          }}
                          className="destination-search"
                          value={destination}
                          onChange={setDestination}
                          disabled={waitingForDriver || driverAccepted} // Disable when waiting for driver or driver accepted
                        />
                      </div>
                      
                      {/* Destination Pin/Map Picking Button */}
                      <button
                        onClick={handleDestinationMapToggle}
                        disabled={waitingForDriver || driverAccepted} // Disable when waiting for driver or driver accepted
                        className={`px-3 md:px-4 py-2 md:py-3 border-l-2 transition-all duration-200 flex items-center justify-center min-w-[48px] md:min-w-[56px] ${
                          waitingForDriver || driverAccepted
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : isMapPickingMode && !pickupFieldMode
                            ? 'bg-red-600 border-red-600 text-white shadow-lg'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                        }`}
                        title={waitingForDriver || driverAccepted ? "Cannot change destination while booking" : isMapPickingMode && !pickupFieldMode ? "Exit destination map picking" : "Pick destination from map"}
                      >
                        <MapPin className={`h-4 w-4 ${isMapPickingMode && !pickupFieldMode ? 'text-white' : ''}`} />
                      </button>
                      
                      {/* Clear Destination Button */}
                      {destinationLocation && (
                        <button
                          onClick={handleClearDestination}
                          disabled={waitingForDriver || driverAccepted} // Disable when waiting for driver or driver accepted
                          className={`px-3 md:px-4 py-2 md:py-3 border-l-2 border-gray-200 transition-all duration-200 flex items-center justify-center min-w-[48px] md:min-w-[56px] ${
                            waitingForDriver || driverAccepted
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                          }`}
                          title={waitingForDriver || driverAccepted ? "Cannot change destination while booking" : "Clear destination"}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Destination Map Picking Instruction */}
                  {isMapPickingMode && !pickupFieldMode && (
                    <div className="mt-1 md:mt-2 p-2 md:p-3 bg-red-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-center space-x-2 text-red-800">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                        <span className="text-xs md:text-sm font-medium">Click anywhere on the map to select destination</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Waiting for Driver Status */}
                {(waitingForDriver || driverAccepted) && (
                  <div className="bg-orange-50 rounded-lg p-2 md:p-3 mb-2 border-2 border-orange-200">
                    <div className="flex items-center justify-center space-x-2 text-orange-800 mb-2">
                      <div className="animate-pulse">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      </div>
                      <span className="text-xs md:text-sm font-medium">
                        {waitingForDriver ? 'Waiting for driver to accept your ride...' : 'Driver accepted! Preparing for pickup...'}
                      </span>
                    </div>
                    <div className="text-center mb-2">
                      <span className="text-xs text-orange-600">
                        {waitingForDriver ? '📍 Pickup location is radiating on map' : '🚗 Driver is on the way to pickup location'}
                      </span>
                    </div>
                    {/* Cancel Booking Button */}
                    <button
                      onClick={handleCancelBooking}
                      disabled={loading}
                      className="w-full py-2 px-4 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  </div>
                )}

                {/* Route Info */}
                {displayLocation && destinationLocation && (
                  <div className={`bg-blue-50 rounded-lg p-2 md:p-3 ${waitingForDriver || driverAccepted ? 'mb-2 hidden md:block' : 'mb-3'}`}>
                    <div className="flex justify-between items-center text-xs md:text-sm">
                      <div className="flex items-center space-x-1 md:space-x-2">
                        <Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                        <span className="text-blue-800 font-medium">
                          {estimatedDuration || 'Calculating...'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 md:space-x-2">
                        <Route className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                        <span className="text-blue-800 font-medium">
                          {estimatedDistance || 'Calculating...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Booking Button */}
                {!waitingForDriver && !driverAccepted && (
                  <button
                    onClick={handleBookingNow}
                    disabled={!destinationLocation || !displayLocation || bookingStatus === 'booking'}
                    className={`w-full py-2 md:py-3 px-4 rounded-xl font-semibold text-sm md:text-base transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 ${
                      bookingStatus === 'booking'
                        ? 'bg-blue-600 text-white focus:ring-blue-600'
                        : bookingStatus === 'success'
                        ? 'bg-green-600 text-white focus:ring-green-600'
                        : bookingStatus === 'error'
                        ? 'bg-red-600 text-white focus:ring-red-600'
                        : 'bg-black text-white hover:bg-gray-800 focus:ring-black'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {bookingStatus === 'booking' && (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Booking Your Ride...</span>
                      </div>
                    )}
                    {bookingStatus === 'success' && (
                      <div className="flex items-center justify-center space-x-2">
                        <span>✅</span>
                        <span>Driver Accepted!</span>
                      </div>
                    )}
                    {bookingStatus === 'error' && (
                      <div className="flex items-center justify-center space-x-2">
                        <span>❌</span>
                        <span>Booking Failed - Try Again</span>
                      </div>
                    )}
                    {bookingStatus === 'idle' && 'Book Your Ride'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderDashboard;
