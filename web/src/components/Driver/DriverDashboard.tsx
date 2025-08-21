import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  User, 
  Phone,
  XCircle,
  Map
} from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { rideAPI } from '../../services/api';
import { Ride, Location } from '../../types';
import { sseService } from '../../services/sseService';

// Extended ride type with distance
interface RideWithDistance extends Ride {
  distance: number;
}
import { LocationService } from '../../services/locationService';
import { AddressService } from '../../services/addressService';
import Header from '../Layout/Header';
import { OpenStreetMap } from '../Maps';

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

const DriverDashboard: React.FC = () => {
  const [isOpenForRides, setIsOpenForRides] = useState(false);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [correctLocation, setCorrectLocation] = useState<Location | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showRideDetails, setShowRideDetails] = useState(false);
  const [newRideNotification, setNewRideNotification] = useState(false);
  const [routeKey, setRouteKey] = useState(`route-${Date.now()}`);

  const { currentLocation, requestDirectGPS } = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Function to update driver location on server
  const updateDriverLocationOnServer = useCallback(async (location: Location) => {
    try {
      if (!isAuthenticated || !user?.id || user.userType !== 'DRIVER') {
        return;
      }

      await rideAPI.updateDriverLocation(location);
    } catch (error) {
      console.error('Failed to update driver location:', error);
    }
  }, [isAuthenticated, user]);

  // Initialize with correct GPS location on component mount
  useEffect(() => {
    const initializeCorrectLocation = async () => {
      try {
        const freshGPS = await requestDirectGPS();
        
        if (freshGPS) {
          try {
            const withAddress = await LocationService.reverseGeocode(freshGPS.lat, freshGPS.lng);
            setCorrectLocation(withAddress);
            
            if (isOpenForRides) {
              await updateDriverLocationOnServer(withAddress);
            }
          } catch {
            setCorrectLocation(freshGPS);
            
            if (isOpenForRides) {
              await updateDriverLocationOnServer(freshGPS);
            }
          }
        }
      } catch (error) {
        console.error('Failed to get GPS location:', error);
      }
    };
    initializeCorrectLocation();
  }, [requestDirectGPS, updateDriverLocationOnServer, isOpenForRides]);

  const displayLocation = correctLocation || currentLocation;

  // Handle location refresh
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
          
          if (isOpenForRides) {
            await updateDriverLocationOnServer(withAddress);
          }
        } catch {
          setCorrectLocation(freshGPS);
          
          if (isOpenForRides) {
            await updateDriverLocationOnServer(freshGPS);
          }
        }
        setTimeout(() => {
          loadAvailableRides();
        }, 1000);
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
      const previousRide = currentRide;
      const ride = await rideAPI.getCurrentRide();
      
      // Check if we had a ride before and now it's gone (cancelled by rider)
      if (previousRide && !ride) {
        console.log('⚠️ Ride was cancelled by rider');
        // Show a brief notification that ride was cancelled
        setNewRideNotification(false); // Clear any existing notifications
        setTimeout(() => {
          console.log('📢 Ride cancelled - driver is now available for new rides');
        }, 1000);
      }
      
      setCurrentRide(ride);
      console.log('📍 Current ride loaded:', ride);
    } catch (error) {
      console.error('Failed to load current ride:', error);
    }
  }, [currentRide]);

  // Helper function to enrich rides with readable addresses
  const enrichRideWithAddresses = async (ride: Ride): Promise<Ride> => {
    const enrichedRide = { ...ride };
    
    // Get pickup address if not available
    if (!enrichedRide.pickupAddress) {
      try {
        enrichedRide.pickupAddress = await AddressService.getCachedAddress(
          enrichedRide.pickupLatitude, 
          enrichedRide.pickupLongitude
        );
      } catch (error) {
        console.warn('Failed to get pickup address:', error);
      }
    }
    
    // Get destination address if not available
    if (!enrichedRide.destinationAddress) {
      try {
        enrichedRide.destinationAddress = await AddressService.getCachedAddress(
          enrichedRide.destinationLatitude, 
          enrichedRide.destinationLongitude
        );
      } catch (error) {
        console.warn('Failed to get destination address:', error);
      }
    }
    
    return enrichedRide;
  };

  const loadAvailableRides = useCallback(async () => {
    if (!displayLocation || !isOpenForRides) return;
    
    try {
      const rides = await rideAPI.getPendingRides(displayLocation, 10);
      
      console.log('🔍 Fetched pending rides:', rides);
      
      // Filter rides with valid coordinates
      const validRides = rides.filter(ride => 
        ride.pickupLatitude != null && 
        ride.pickupLongitude != null && 
        !isNaN(ride.pickupLatitude) && 
        !isNaN(ride.pickupLongitude)
      );
      
      if (validRides.length === 0) {
        console.log('📍 No valid rides found');
        setAvailableRides([]);
        return;
      }
      
      // Calculate distances and find the nearest ride
      const ridesWithDistance = validRides.map(ride => {
        const distance = calculateDistance(
          displayLocation.lat, 
          displayLocation.lng,
          ride.pickupLatitude, 
          ride.pickupLongitude
        );
        return { ...ride, distance };
      });
      
      // Sort by distance and take the nearest one
      ridesWithDistance.sort((a, b) => a.distance - b.distance);
      const nearestRideWithDistance = ridesWithDistance[0];
      
      // Enrich the nearest ride with readable addresses
      const enrichedRide = await enrichRideWithAddresses(nearestRideWithDistance);
      // Create a properly typed ride with distance
      const enrichedRideWithDistance: RideWithDistance = {
        ...enrichedRide,
        distance: nearestRideWithDistance.distance
      };
      
      console.log(`🎯 Found nearest ride at ${enrichedRideWithDistance.distance.toFixed(2)}km:`, {
        id: enrichedRideWithDistance.id,
        pickupLatitude: enrichedRideWithDistance.pickupLatitude,
        pickupLongitude: enrichedRideWithDistance.pickupLongitude,
        pickupAddress: enrichedRideWithDistance.pickupAddress,
        destinationLatitude: enrichedRideWithDistance.destinationLatitude,
        destinationLongitude: enrichedRideWithDistance.destinationLongitude,
        destinationAddress: enrichedRideWithDistance.destinationAddress,
        riderId: enrichedRideWithDistance.riderId,
        riderUsername: enrichedRideWithDistance.riderUsername,
        riderPhone: enrichedRideWithDistance.riderPhone,
        status: enrichedRideWithDistance.status,
        distance: enrichedRideWithDistance.distance
      });
      
      // Check for new rides and show notification
      if ([enrichedRideWithDistance].length > availableRides.length && availableRides.length > 0) {
        setNewRideNotification(true);
        setTimeout(() => setNewRideNotification(false), 3000);
      }
      
      // Only show the nearest ride (without distance property for state)
      setAvailableRides([enrichedRide]);
    } catch (error) {
      console.error('Failed to load available rides:', error);
      setAvailableRides([]);
    }
  }, [displayLocation, isOpenForRides, availableRides.length]);

  useEffect(() => {
    // Initial load on mount
    loadCurrentRide();
    if (displayLocation && isOpenForRides) {
      loadAvailableRides();
    }
  }, [displayLocation, isOpenForRides, loadCurrentRide, loadAvailableRides]);

  // Real-time tracking refs (no polling needed)
  const rideRequestIntervalRef = useRef<number | null>(null);
  const lastLocationRef = useRef<Location | null>(null);
  const lastRouteCalculationRef = useRef<Location | null>(null);

  // ❌ COMPLETELY DISABLE AUTOMATIC LOCATION TRACKING TO PREVENT CRASHES ❌
  useEffect(() => {
    const currentLoc = correctLocation || currentLocation;
    
    if (currentLoc) {
      // ONLY update location reference - NO API CALLS
      lastLocationRef.current = currentLoc;
      console.log('📍 Location updated (NO API calls made)');
      
      // ❌ DISABLED: No automatic server updates
      // ❌ DISABLED: No automatic ride loading  
      // ❌ DISABLED: No automatic route recalculation
    }
  }, [correctLocation, currentLocation]);

  // 🚀 REAL-TIME SSE CONNECTION - NO MORE POLLING!
  useEffect(() => {
    if (!user?.id || user.userType !== 'DRIVER') return;
    
    console.log('🔗 Connecting to SSE for real-time updates...');
    
    // Connect to real-time events
    sseService.connectDriverEvents(user.id, {
      onRideRequest: (ride) => {
        console.log('🔔 NEW RIDE REQUEST via SSE:', ride);
        setAvailableRides([ride]);
        setNewRideNotification(true);
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => setNewRideNotification(false), 5000);
      },
      
      onRideUpdate: (ride) => {
        console.log('� RIDE UPDATE via SSE:', ride);
        setCurrentRide(ride);
        
        // If ride is completed or cancelled, reload available rides
        if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
          setCurrentRide(null);
          if (isOpenForRides && displayLocation) {
            // Only load available rides once when ride ends
            loadAvailableRides();
          }
        }
      },
      
      onRideCancelled: (rideId) => {
        console.log('❌ RIDE CANCELLED via SSE:', rideId);
        setCurrentRide(null);
        if (isOpenForRides && displayLocation) {
          loadAvailableRides();
        }
      },
      
      onError: (error) => {
        console.error('❌ SSE connection error:', error);
        // Fallback to manual refresh if SSE fails
      }
    });
    
    // Cleanup SSE connection
    return () => {
      console.log('🛑 Disconnecting SSE...');
      sseService.disconnect();
    };
  }, [user?.id, user?.userType, isOpenForRides, displayLocation, loadAvailableRides]);

    // 📍 Minimal location tracking (only for server updates)
  useEffect(() => {
    const currentLoc = correctLocation || currentLocation;
    
    if (currentLoc && isOpenForRides) {
      // Only update server location every 50 meters - no excessive calls
      const hasLocationChanged = !lastLocationRef.current || 
        calculateDistance(
          lastLocationRef.current.lat, 
          lastLocationRef.current.lng,
          currentLoc.lat, 
          currentLoc.lng
        ) > 0.05; // 50 meters threshold

      if (hasLocationChanged) {
        console.log('📍 Updating server location (50m+ change)');
        lastLocationRef.current = currentLoc;
        updateDriverLocationOnServer(currentLoc);
      }
    }
  }, [correctLocation, currentLocation, isOpenForRides, updateDriverLocationOnServer]);

  const handleToggleOpenForRides = async () => {
    if (!isOpenForRides) {
      try {
        await requestDirectGPS();
        setIsOpenForRides(true);
      } catch {
        console.error('Location permission required');
        setLocationError('Location permission required to open for rides');
      }
    } else {
      setIsOpenForRides(false);
      setAvailableRides([]);
    }
  };

  const handleAcceptRide = async (rideId: number) => {
    setLoading(true);
    try {
      const result = await rideAPI.acceptRide(rideId);
      if (result) {
        // Load the current ride which should now be the accepted ride
        await loadCurrentRide();
        // Clear available rides since we've accepted one
        setAvailableRides([]);
        // Close any modals
        setShowRideDetails(false);
        setSelectedRide(null);
        
        // Force route calculation for the new ride (but with conservative key)
        lastRouteCalculationRef.current = null; // Reset to force new calculation
        
        // Update route key ONCE to show initial route
        setRouteKey(`route-accepted-${rideId}-${Math.floor(Date.now() / 60000)}`); // Only update per minute
        
        // Start driving to pickup after a delay
        setTimeout(async () => {
          try {
            await rideAPI.updateRideStatus(rideId, 'start_drive_to_pickup');
            await loadCurrentRide(); // Reload to update status
            console.log('✅ Ride accepted and route to pickup started');
          } catch (error) {
            console.error('Failed to start drive to pickup:', error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to accept ride:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!currentRide) return;
    
    try {
      setLoading(true);
      await rideAPI.cancelRide(currentRide.id);
      console.log('✅ Ride cancelled successfully');
      
      // Reload current ride (should be null now) and available rides
      await loadCurrentRide();
      if (isOpenForRides && currentLocation) {
        await loadAvailableRides();
      }
    } catch (error) {
      console.error('❌ Failed to cancel ride:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRideClick = (ride: Ride) => {
    setSelectedRide(ride);
    setShowRideDetails(true);
  };

  const handleUpdateRideStatus = async (action: string) => {
    if (!currentRide) return;

    try {
      await rideAPI.updateRideStatus(currentRide.id, action);
      
      if (action === 'complete') {
        setCurrentRide(null);
      } else {
        await loadCurrentRide();
      }
    } catch (error) {
      console.error('Failed to update ride status:', error);
    }
  };

  // Smart route calculation - only when driver moves significantly
  const shouldRecalculateRoute = useCallback((currentLoc: Location): boolean => {
    if (!lastRouteCalculationRef.current) return true;
    
    // Only recalculate if driver moved more than 100 meters from last calculation
    const distanceFromLastCalculation = calculateDistance(
      lastRouteCalculationRef.current.lat,
      lastRouteCalculationRef.current.lng,
      currentLoc.lat,
      currentLoc.lng
    );
    
    return distanceFromLastCalculation > 0.1; // 100 meters
  }, []);

  // Transform backend ride data for display
  const transformRideForDisplay = (ride: Ride) => ({
    ...ride,
    pickupLocation: {
      lat: ride.pickupLatitude,
      lng: ride.pickupLongitude,
      address: ride.pickupAddress || `${ride.pickupLatitude}, ${ride.pickupLongitude}`
    },
    destination: {
      lat: ride.destinationLatitude,
      lng: ride.destinationLongitude,
      address: ride.destinationAddress || `${ride.destinationLatitude}, ${ride.destinationLongitude}`
    }
  });

  if (currentRide && currentRide.status !== 'COMPLETED') {
    const displayRide = transformRideForDisplay(currentRide);
    
    // Calculate stable route key to prevent excessive API calls
    const needsRouteRecalculation = displayLocation && shouldRecalculateRoute(displayLocation);
    if (needsRouteRecalculation && displayLocation) {
      lastRouteCalculationRef.current = displayLocation;
    }
    
    // Use state routeKey for dynamic route updates
    const mapRouteKey = routeKey;
    
    return (
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden no-zoom-bounce">
        <Header title="Current Ride" />
        
        <div className="flex-1 relative overflow-hidden">
          {displayLocation && currentRide && 
           currentRide.pickupLatitude != null && 
           currentRide.pickupLongitude != null && 
           currentRide.destinationLatitude != null && 
           currentRide.destinationLongitude != null &&
           !isNaN(currentRide.pickupLatitude) && 
           !isNaN(currentRide.pickupLongitude) &&
           !isNaN(currentRide.destinationLatitude) && 
           !isNaN(currentRide.destinationLongitude) ? (
            <OpenStreetMap
              key={mapRouteKey} // Only re-render when route actually needs recalculation
              center={displayLocation}  // Center on driver location
              zoom={16}
              height="100%"
              markers={[
                displayLocation,
                {
                  lat: currentRide.pickupLatitude,
                  lng: currentRide.pickupLongitude,
                  address: currentRide.pickupAddress || 'Pickup Location',
                  isRiderWaiting: true
                },
                // Only show destination marker if rider is picked up
                ...(currentRide.status === 'IN_PROGRESS' ? [{
                  lat: currentRide.destinationLatitude,
                  lng: currentRide.destinationLongitude,
                  address: currentRide.destinationAddress || 'Destination'
                }] : [])
              ]}
              showDirections={false} // ❌ COMPLETELY DISABLE ROUTE CALCULATIONS TO PREVENT API CRASHES
              // Route destination changes based on ride status
              destination={
                currentRide.status === 'IN_PROGRESS' ? {
                  lat: currentRide.destinationLatitude,
                  lng: currentRide.destinationLongitude,
                  address: currentRide.destinationAddress || 'Destination'
                } : {
                  lat: currentRide.pickupLatitude,
                  lng: currentRide.pickupLongitude,
                  address: currentRide.pickupAddress || 'Pickup Location'
                }
              }
              pickup={displayLocation}  // Driver's current location
              routingService="osrm"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-500 text-3xl mb-4">🗺️</div>
                <p className="text-gray-600 text-lg font-medium">
                  {!displayLocation ? 'Getting your location...' :
                   !currentRide ? 'No active ride' :
                   'Invalid ride coordinates'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {!displayLocation ? 'Please allow location access to continue' :
                   !currentRide ? 'Start accepting rides to see pickup locations' :
                   'Ride data may be incomplete'}
                </p>
              </div>
            </div>
          )}

          {/* Bottom Panel for Current Ride - Moved outside map container */}
          <div className="absolute bottom-0 left-0 right-0 z-10 md:top-16 md:left-4 md:right-auto md:bottom-8 md:w-80">
            <div className="px-3 md:px-0 pb-3">
              <div className="bg-white rounded-t-xl md:rounded-xl shadow-xl border border-gray-200">
                <div className="p-3">
                  <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-2 md:hidden"></div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-900">Active Ride</h2>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      currentRide.status === 'ACCEPTED' ? 'bg-yellow-100 text-yellow-800' :
                      currentRide.status === 'DRIVER_EN_ROUTE' ? 'bg-blue-100 text-blue-800' :
                      currentRide.status === 'ARRIVED' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {currentRide.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Current Navigation Target - Changes based on ride status */}
                    {currentRide.status === 'IN_PROGRESS' ? (
                      // Show destination when rider is in car
                      <div className="flex items-start space-x-2">
                        <Navigation className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">Going to Destination</p>
                          <p className="text-xs text-gray-600 truncate">{displayRide.destination.address}</p>
                        </div>
                      </div>
                    ) : (
                      // Show pickup location when driving to pickup
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">
                            {currentRide.status === 'ARRIVED' ? 'Pickup Location (You\'re here!)' : 'Driving to Pickup'}
                          </p>
                          <p className="text-xs text-gray-600 truncate">{displayRide.pickupLocation.address}</p>
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-3">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">
                            {currentRide.riderUsername || `Rider ID: ${currentRide.riderId}`}
                          </p>
                          {currentRide.riderPhone && (
                            <p className="text-xs text-gray-600">{currentRide.riderPhone}</p>
                          )}
                        </div>
                        <button 
                          className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 flex-shrink-0"
                          onClick={() => {
                            if (currentRide.riderPhone) {
                              window.open(`tel:${currentRide.riderPhone}`, '_self');
                            }
                          }}
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {currentRide.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleUpdateRideStatus('start_drive_to_pickup')}
                        className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                      >
                        Start Drive to Pickup
                      </button>
                    )}
                    
                    {currentRide.status === 'DRIVER_EN_ROUTE' && (
                      <button
                        onClick={() => handleUpdateRideStatus('arrived_at_pickup')}
                        className="w-full bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors duration-200"
                      >
                        Arrived at Pickup
                      </button>
                    )}
                    
                    {currentRide.status === 'ARRIVED' && (
                      <button
                        onClick={() => handleUpdateRideStatus('start_ride')}
                        className="w-full bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-200"
                      >
                        Picked Up - Start Ride
                      </button>
                    )}
                    
                    {currentRide.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleUpdateRideStatus('complete')}
                        className="w-full bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-200"
                      >
                        Complete Ride
                      </button>
                    )}

                    <button
                      onClick={handleCancelRide}
                      disabled={loading}
                      className="w-full bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                    >
                      {loading ? 'Cancelling...' : 'Cancel Ride'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden no-zoom-bounce">
      <Header title="Driver Dashboard" />
      
      {/* New Ride Notification */}
      {newRideNotification && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="font-medium">New ride request available!</span>
          </div>
        </div>
      )}
      
      <div className="flex-1 relative overflow-hidden">
        {displayLocation ? (
          <OpenStreetMap
            center={displayLocation}
            zoom={15}
            height="100%"
            markers={[
              displayLocation,
              ...availableRides
                .filter(ride => 
                  ride.pickupLatitude != null && 
                  ride.pickupLongitude != null && 
                  !isNaN(ride.pickupLatitude) && 
                  !isNaN(ride.pickupLongitude)
                )
                .map(ride => ({
                  lat: ride.pickupLatitude,
                  lng: ride.pickupLongitude,
                  address: ride.pickupAddress || 'Pickup Location',
                  isRiderWaiting: true  // Add special flag for rider locations
                }))
            ]}
            waitingForDriver={true}  // Enable radiation effect for waiting riders
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
                We need your location to show nearby ride requests and track your position.
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
                        
                        // Use a callback to get current state value
                        setIsOpenForRides(currentOpenState => {
                          if (currentOpenState) {
                            updateDriverLocationOnServer(withAddress);
                          }
                          return currentOpenState;
                        });
                      } catch {
                        setCorrectLocation(directLocation);
                        
                        // Use a callback to get current state value
                        setIsOpenForRides(currentOpenState => {
                          if (currentOpenState) {
                            updateDriverLocationOnServer(directLocation);
                          }
                          return currentOpenState;
                        });
                      }
                    }
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown location error';
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
        <div className="map-overlay-controls flex flex-col space-y-2 zoom-stable fixed top-16 right-4 z-40">
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

        {/* Bottom Panel */}
        <div className="map-overlay-bottom pb-safe zoom-stable fixed bottom-0 left-0 right-0 overflow-y-auto md:top-16 md:left-4 md:right-auto md:bottom-8 md:w-80 max-h-[50vh]">
          <div className="px-3 md:px-0 pb-3">
            <div className="w-full mx-auto bg-white rounded-t-xl md:rounded-xl shadow-xl no-zoom-bounce">
              <div className="p-3">
                <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-2 md:hidden"></div>
                
                {/* Driver Status Card */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-gray-900">Driver Status</h2>
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${isOpenForRides ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-xs font-medium text-gray-600">
                        {isOpenForRides ? 'Open for Rides' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleOpenForRides}
                    disabled={!displayLocation}
                    className={`w-full py-2 px-3 rounded-lg font-semibold transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 text-sm ${
                      isOpenForRides
                        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600'
                        : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isOpenForRides ? 'Close for Rides' : 'Open for Rides'}
                  </button>

                  {displayLocation && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-green-900 text-xs">Current Location</p>
                          <p className="text-xs text-green-700 truncate">{displayLocation.address}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isOpenForRides && (
                  <>
                    {/* Available Rides */}
                    {availableRides.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Available Rides</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {availableRides.map((ride) => {
                            // Calculate distance for display
                            const distance = currentLocation ? calculateDistance(
                              currentLocation.lat,
                              currentLocation.lng,
                              ride.pickupLatitude,
                              ride.pickupLongitude
                            ) : 0;

                            return (
                              <div 
                                key={ride.id} 
                                className="border border-gray-200 rounded-lg p-2 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
                                onClick={() => handleRideClick(ride)}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start space-x-2">
                                    <MapPin className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 text-xs">Pickup Location</p>
                                      <p className="text-xs text-gray-600 truncate">
                                        {ride.pickupAddress || 'Address not available'}
                                      </p>
                                      {!ride.pickupAddress && (
                                        <p className="text-xs text-gray-400 truncate">
                                          {ride.pickupLatitude}, {ride.pickupLongitude}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Show rider info from API response */}
                                  {(ride.riderUsername || ride.riderPhone) && (
                                    <div className="flex items-start space-x-2">
                                      <User className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 text-xs">
                                          {ride.riderUsername || 'Unknown Rider'}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          {ride.riderPhone || 'Phone not available'}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-gray-600">{distance.toFixed(1)} km away</span>
                                    </div>
                                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                      <button 
                                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors duration-200"
                                        title="Decline ride"
                                      >
                                        Decline
                                      </button>
                                      <button
                                        onClick={() => handleAcceptRide(ride.id)}
                                        disabled={loading}
                                        className="px-3 py-1 text-xs bg-green-600 text-white hover:bg-green-700 rounded transition-colors duration-200 disabled:opacity-50 font-medium"
                                        title="Accept ride"
                                      >
                                        {loading ? 'Accepting...' : 'Accept'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No rides available</h3>
                        <p className="text-gray-600 text-xs">
                          Stay open for rides and we'll notify you when passengers request rides in your area.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ride Details Modal */}
        {showRideDetails && selectedRide && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Ride Request Details</h2>
                  <button
                    onClick={() => {
                      setShowRideDetails(false);
                      setSelectedRide(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Passenger Info */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {selectedRide.riderUsername || 'Passenger'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedRide.riderPhone || `Rider ID: ${selectedRide.riderId}`}
                        </p>
                        <p className="text-xs text-gray-500">Requested {new Date(selectedRide.createdAt).toLocaleTimeString()}</p>
                      </div>
                      <button 
                        className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 flex-shrink-0"
                        onClick={() => {
                          if (selectedRide.riderPhone) {
                            window.open(`tel:${selectedRide.riderPhone}`, '_self');
                          }
                        }}
                      >
                        <Phone className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Pickup Location */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Pickup Location</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedRide.pickupAddress || 'Address not available'}
                        </p>
                        {!selectedRide.pickupAddress && (
                          <p className="text-xs text-gray-400 mt-1">
                            Coordinates: {selectedRide.pickupLatitude}, {selectedRide.pickupLongitude}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Distance to Pickup */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <MapPin className="h-4 w-4 text-gray-600" />
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {displayLocation ? 
                          LocationService.calculateDistance(displayLocation, {
                            lat: selectedRide.pickupLatitude,
                            lng: selectedRide.pickupLongitude,
                            address: ''
                          }).toFixed(1) : '0'} km
                      </p>
                      <p className="text-xs text-gray-600">Distance to pickup</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setShowRideDetails(false);
                        setSelectedRide(null);
                      }}
                      className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptRide(selectedRide.id)}
                      disabled={loading}
                      className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Accepting...' : 'Accept Ride'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;