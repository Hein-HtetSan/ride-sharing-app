import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, Clock, Map, MapPin, Route, X } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { rideAPI } from '../../services/api';
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
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRideForm, setShowRideForm] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success' | 'error'>('idle');
  const [driverAccepted, setDriverAccepted] = useState(false); // Track when driver accepts the ride
  const [waitingForDriver, setWaitingForDriver] = useState(false); // Track when waiting for driver acceptance
  const [estimatedDuration, setEstimatedDuration] = useState<string>('');
  const [estimatedDistance, setEstimatedDistance] = useState<string>('');
  const [correctLocation, setCorrectLocation] = useState<Location | null>(null);
  const [isMapPickingMode, setIsMapPickingMode] = useState(false);
  const [pickupFieldMode, setPickupFieldMode] = useState(false); // true for pickup, false for destination


  const { currentLocation, requestDirectGPS } = useLocation();

  // Initialize with correct GPS location on component mount
  useEffect(() => {
    const initializeCorrectLocation = async () => {
      console.log('🛰️ INITIALIZING - Getting GPS location...');
      try {
        const freshGPS = await requestDirectGPS();
        console.log('✅ INITIALIZATION - Got GPS:', freshGPS);
        if (freshGPS) {
          // Fetch address using reverse geocoding
          try {
            const withAddress = await LocationService.reverseGeocode(freshGPS.lat, freshGPS.lng);
            setCorrectLocation(withAddress);
            console.log('✅ INITIALIZATION - Set location with address in state');
          } catch {
            setCorrectLocation(freshGPS);
            console.warn('⚠️ INITIALIZATION - Failed to get address, using lat/lng only');
          }
        }
      } catch (error) {
        console.error('❌ INITIALIZATION - Failed to get GPS:', error);
      }
    };
    initializeCorrectLocation();
  }, [requestDirectGPS]);

  // Create swapped version of location if needed

  const displayLocation = correctLocation || currentLocation;

  // Track destination location changes
  useEffect(() => {
    console.log('🏷️ DESTINATION STATE CHANGED:', {
      destinationLocation,
      destinationAddress: destination,
      currentLocation: displayLocation,
      estimatedDuration,
      estimatedDistance,
      markersWillBe: destinationLocation ? [displayLocation, destinationLocation] : [displayLocation]
    });
  }, [destinationLocation, destination, displayLocation, estimatedDuration, estimatedDistance]);

  // Auto-calculate route when destination is set and no pickup is selected (use current location)
  useEffect(() => {
    if (destinationLocation && displayLocation && !pickupLocation) {
      console.log('🗺️ AUTO-CALCULATING ROUTE from current location to destination');
      calculateRoute(displayLocation, destinationLocation);
    }
  }, [destinationLocation, displayLocation, pickupLocation]);



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
        try {
          const withAddress = await LocationService.reverseGeocode(freshGPS.lat, freshGPS.lng);
          setCorrectLocation(withAddress);
          console.log('✅ RELOCATE - Updated location with address');
        } catch {
          setCorrectLocation(freshGPS);
          console.warn('⚠️ RELOCATE - Failed to get address, using lat/lng only');
        }
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

  const handleBookingNow = async () => {
    if (!displayLocation || !destinationLocation) return;

    console.log('🚗 BOOKING NOW - Starting ride booking process');
    setBookingStatus('booking');
    setWaitingForDriver(true); // Start radiating animation immediately when booking starts
    setDriverAccepted(false); // Reset driver acceptance

    try {
      // Prepare the ride request data
      const rideRequest: RideRequest = {
        pickupLocation: pickupLocation || displayLocation, // Use selected pickup or current location
        destination: destinationLocation,
      };

      console.log('📤 BOOKING - Sending request to Spring API:', {
        pickup: rideRequest.pickupLocation.address,
        destination: rideRequest.destination.address,
        estimatedDuration,
        estimatedDistance
      });

      // Send POST request to Spring backend
      const ride = await rideAPI.requestRide(rideRequest);
      
      console.log('✅ BOOKING SUCCESS - Ride booked:', ride);
      setCurrentRide(ride);
      setBookingStatus('success');
      
      // Keep radiating animation going - driver will see the ride request now
      console.log('📡 WAITING FOR DRIVER - Pickup location radiating until driver accepts');
      
      // Simulate driver accepting the ride after 5 seconds (for demo)
      // In real app, this will come from WebSocket/polling the API
      setTimeout(() => {
        console.log('🚗 DRIVER ACCEPTED - Stopping pickup radiation, driver is coming!');
        setDriverAccepted(true);
        setWaitingForDriver(false); // Stop radiating when driver accepts
      }, 5000);
      
    } catch (error) {
      console.error('❌ BOOKING FAILED:', error);
      setBookingStatus('error');
      setWaitingForDriver(false); // Stop radiating on error
      setDriverAccepted(false);
      
      // Reset status after showing error
      setTimeout(() => {
        setBookingStatus('idle');
      }, 3000);
    }
  };

  const handleCancelBooking = () => {
    console.log('🚫 CANCELING BOOKING - Resetting all states');
    
    // Reset all booking states
    setBookingStatus('idle');
    setWaitingForDriver(false);
    setDriverAccepted(false);
    setCurrentRide(null);
    
    console.log('✅ BOOKING CANCELLED - All states reset');
  };

  const calculateRoute = async (from: Location, to: Location) => {
    console.log('📊 CALCULATING ROUTE: Using RoutingService for accurate route');
    try {
      // Use RoutingService (with ORS API) for accurate routing
      const routeResult = await RoutingService.getRoute(from, to);
      
      console.log('✅ ROUTE CALCULATED:', {
        distance: `${routeResult.distance.toFixed(2)}km`,
        duration: RoutingService.formatDuration(routeResult.duration),
        coordinatesCount: routeResult.coordinates.length
      });
      
      setEstimatedDuration(RoutingService.formatDuration(routeResult.duration));
      setEstimatedDistance(`${routeResult.distance.toFixed(1)} km`);
      
    } catch (error) {
      console.warn('⚠️ ROUTE CALCULATION FAILED, using fallback:', error);
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
    console.log('🎯 LOCATION SELECTED:', location, 'Mode:', currentMode ? 'PICKUP' : 'DESTINATION');
    
    // Check if this is a clear operation (empty address means clear)
    if (!location.address || location.address === '') {
      if (currentMode) {
        console.log('🗑️ CLEARING PICKUP');
        setPickupLocation(null);
        setPickup('');
      } else {
        console.log('🗑️ CLEARING DESTINATION');
        setDestinationLocation(null);
        setDestination('');
        setEstimatedDuration('');
        setEstimatedDistance('');
      }
      setIsMapPickingMode(false); // Exit map picking mode
      return;
    }
    
    console.log('🎯 LOCATION COORDINATES:', `${location.lat}, ${location.lng}`);
    console.log('🎯 CURRENT LOCATION:', displayLocation);
    
    if (currentMode) {
      // Handle pickup selection
      setPickupLocation(location);
      setPickup(location.address);
      console.log('📊 PICKUP STATE UPDATED:', { pickupLocation: location, pickup: location.address });
    } else {
      // Handle destination selection
      setDestinationLocation(location);
      setDestination(location.address);
      console.log('📊 DESTINATION STATE UPDATED:', { destinationLocation: location, destination: location.address });
    }
    
    setIsMapPickingMode(false); // Exit map picking mode after selection
    
    // Calculate route if both pickup and destination are available
    const fromLocation = currentMode ? location : (pickupLocation || displayLocation);
    const toLocation = currentMode ? destinationLocation : location;
    
    if (fromLocation && toLocation) {
      console.log('🗺️ CALCULATING ROUTE from:', fromLocation, 'to:', toLocation);
      await calculateRoute(fromLocation, toLocation);
      console.log('✅ ROUTE CALCULATION COMPLETED');
    } else {
      console.warn('⚠️ Missing pickup or destination for route calculation');
    }
  };

  // Handle map picking mode toggle for pickup
  const handlePickupMapToggle = () => {
    if (isMapPickingMode && pickupFieldMode) {
      // Exit picking mode if already in pickup mode
      setIsMapPickingMode(false);
      console.log('🗺️ Exiting pickup map picking mode');
    } else {
      // Enter pickup picking mode
      setPickupFieldMode(true);
      setIsMapPickingMode(true);
      console.log('🗺️ Entering pickup map picking mode - click on map to select pickup location');
    }
  };

  // Handle map picking mode toggle for destination
  const handleDestinationMapToggle = () => {
    if (isMapPickingMode && !pickupFieldMode) {
      // Exit picking mode if already in destination mode
      setIsMapPickingMode(false);
      console.log('🗺️ Exiting destination map picking mode');
    } else {
      // Enter destination picking mode
      setPickupFieldMode(false);
      setIsMapPickingMode(true);
      console.log('🗺️ Entering destination map picking mode - click on map to select destination');
    }
  };

  // Handle clear pickup
  const handleClearPickup = () => {
    console.log('🗑️ CLEARING PICKUP via button');
    setPickupLocation(null);
    setPickup('');
    
    // Recalculate route if destination exists (from current location to destination)
    if (destinationLocation && displayLocation) {
      console.log('🗺️ Recalculating route after pickup clear from current location to destination');
      calculateRoute(displayLocation, destinationLocation);
    } else {
      // Clear route info if no destination
      setEstimatedDuration('');
      setEstimatedDistance('');
    }
    
    setIsMapPickingMode(false);
    console.log('🗑️ Pickup cleared successfully - will use current location as pickup');
  };

  // Handle clear destination
  const handleClearDestination = () => {
    console.log('🗑️ CLEARING DESTINATION via button');
    setDestinationLocation(null);
    setDestination('');
    setEstimatedDuration('');
    setEstimatedDistance('');
    setIsMapPickingMode(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden no-zoom-bounce">
      <Header title="Book a Ride" />
      

      
      <div className="flex-1 relative overflow-hidden map-full-height">
        {displayLocation ? (
          <OpenStreetMap
            key={`${displayLocation.lat}-${displayLocation.lng}-${pickupLocation?.lat || 'none'}-${pickupLocation?.lng || 'none'}-${destinationLocation?.lat || 'none'}-${destinationLocation?.lng || 'none'}-${isMapPickingMode}`}
            center={waitingForDriver || driverAccepted ? (pickupLocation || displayLocation) : displayLocation} // Center on pickup during booking
            zoom={waitingForDriver || driverAccepted ? 17 : 15} // Zoom in during booking
            height="100%"
            markers={[
              displayLocation,
              ...(pickupLocation ? [pickupLocation] : []),
              ...(destinationLocation ? [destinationLocation] : [])
            ]}
            showDirections={!!(destinationLocation && displayLocation && !waitingForDriver && !driverAccepted)} // Disable route line during booking states
            destination={destinationLocation || undefined}
            pickup={pickupLocation || displayLocation} // Use pickup location or fallback to current location
            routingService="osrm"
            onLocationSelect={isMapPickingMode ? handleLocationSelect : undefined}
            driverAccepted={driverAccepted} // Pass driver acceptance state for animation
            waitingForDriver={waitingForDriver} // Pass waiting state for radiating animation
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
              console.log('Map switch button clicked!');
              const event = new CustomEvent('toggleMapType');
              window.dispatchEvent(event);
              console.log('Toggle map type event dispatched');
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
                      className="w-full py-2 px-4 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors duration-200"
                    >
                      Cancel Booking
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
                      <span>Ride Booked Successfully!</span>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderDashboard;
