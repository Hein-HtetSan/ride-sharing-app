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
import { rideAPI, locationAPI } from '../../services/api';
import { LocationService } from '../../services/locationService';
import { AddressService } from '../../services/addressService';
import Header from '../Layout/Header';
import { OpenStreetMap } from '../Maps';
import { subscribeRideEvents, RideEvent as RideEvt } from '../../services/events';
import { Ride, Location } from '../../types';

// Extended ride type with distance
interface RideWithDistance extends Ride {
  distance: number;
}

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
  const [isDrivingMode, setIsDrivingMode] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState<string>('');
  const [distanceToNextTurn, setDistanceToNextTurn] = useState<number>(0);
  const [nextTurnDirection, setNextTurnDirection] = useState<string>('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const { currentLocation, requestDirectGPS } = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Voice synthesis for navigation
  const speakInstruction = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    // Wait for voices to load and use English voice if available
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.localService
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      window.speechSynthesis.speak(utterance);
      console.log('🔊 Voice guidance:', text);
    };

    // If voices are already loaded
    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        setVoice();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [voiceEnabled]);

  // Generate navigation instructions based on route and current location
  const generateNavigationInstruction = useCallback((currentLoc: Location, targetLat: number, targetLng: number) => {
    const distance = calculateDistance(currentLoc.lat, currentLoc.lng, targetLat, targetLng);
    const distanceInMeters = Math.round(distance * 1000);
    
    // Get destination name for instructions
    const destinationName = currentRide?.status === 'IN_PROGRESS' 
      ? (currentRide?.destinationAddress?.split(',')[0] || 'destination')
      : (currentRide?.pickupAddress?.split(',')[0] || 'pickup location');
    
    if (distance < 0.02) { // Less than 20 meters
      return {
        instruction: `You have arrived at ${destinationName}`,
        distance: 0,
        direction: "arrived"
      };
    } else if (distance < 0.1) { // Less than 100 meters
      return {
        instruction: `${destinationName} ahead`,
        distance: distanceInMeters,
        direction: "straight"
      };
    } else if (distance < 0.2) { // Less than 200 meters
      return {
        instruction: `Continue to ${destinationName}`,
        distance: distanceInMeters,
        direction: "straight"
      };
    } else if (distance < 0.5) { // Less than 500 meters
      return {
        instruction: `Head toward ${destinationName}`,
        distance: distanceInMeters,
        direction: "straight"
      };
    } else if (distance < 1) { // Less than 1 km
      return {
        instruction: `Continue on current road`,
        distance: distanceInMeters,
        direction: "straight"
      };
    } else if (distance < 5) { // Less than 5 km
      return {
        instruction: `Continue straight`,
        distance: distanceInMeters,
        direction: "straight"
      };
    } else {
      return {
        instruction: `Continue on route`,
        distance: distanceInMeters,
        direction: "straight"
      };
    }
  }, [currentRide]);

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
  const lastLocationRef = useRef<Location | null>(null);
  const lastRouteCalculationRef = useRef<Location | null>(null);
  const routeUpdateTimeoutRef = useRef<number | null>(null);
  const lastRouteUpdateRef = useRef<number>(0);

  // Real-time navigation updates with voice guidance
  useEffect(() => {
    if (!isDrivingMode || !currentRide || !displayLocation) return;

    const targetLat = currentRide.status === 'IN_PROGRESS' 
      ? currentRide.destinationLatitude 
      : currentRide.pickupLatitude;
    const targetLng = currentRide.status === 'IN_PROGRESS' 
      ? currentRide.destinationLongitude 
      : currentRide.pickupLongitude;

    if (targetLat && targetLng && !isNaN(targetLat) && !isNaN(targetLng)) {
      const navInfo = generateNavigationInstruction(displayLocation, targetLat, targetLng);
      
      // Update navigation state
      const previousInstruction = currentInstruction;
      setCurrentInstruction(navInfo.instruction);
      setDistanceToNextTurn(navInfo.distance);
      setNextTurnDirection(navInfo.direction);

      // Voice guidance logic - more frequent announcements
      const shouldSpeak = 
        navInfo.direction === 'arrived' || // Arrival
        (navInfo.distance <= 50 && navInfo.distance > 0) || // Very close
        (navInfo.distance <= 100 && navInfo.distance > 50) || // Close
        (navInfo.distance <= 200 && navInfo.distance > 100) || // Approaching
        (navInfo.distance <= 500 && navInfo.distance > 200 && navInfo.distance % 200 < 20) || // Every 200m when close
        (navInfo.distance > 500 && navInfo.distance % 1000 < 50) || // Every 1km for longer distances
        (previousInstruction !== navInfo.instruction && navInfo.distance < 1000); // Instruction changed

      if (shouldSpeak) {
        // Add distance context for voice
        let voiceText = navInfo.instruction;
        if (navInfo.distance > 0 && navInfo.direction !== 'arrived') {
          if (navInfo.distance < 1000) {
            voiceText = `In ${navInfo.distance} meters, ${navInfo.instruction.toLowerCase()}`;
          } else {
            voiceText = `In ${(navInfo.distance/1000).toFixed(1)} kilometers, ${navInfo.instruction.toLowerCase()}`;
          }
        }
        
        speakInstruction(voiceText);
      }
    }
  }, [isDrivingMode, currentRide, displayLocation, generateNavigationInstruction, speakInstruction, currentInstruction]);

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
        // Update location immediately when accepting ride
        if (correctLocation || currentLocation) {
          const locationToUpdate = correctLocation || currentLocation;
          if (locationToUpdate) {
            await updateDriverLocationOnServer(locationToUpdate);
            console.log('📍 Updated driver location after accepting ride');
          }
        }
        
        // Load the current ride which should now be the accepted ride
        await loadCurrentRide();
        // Clear available rides since we've accepted one
        setAvailableRides([]);
        // Close any modals
        setShowRideDetails(false);
        setSelectedRide(null);
        
        // Reset route calculation tracking for new ride
        lastRouteCalculationRef.current = null;
        lastRouteUpdateRef.current = Date.now(); // Set initial timestamp
        
        // Start with route view, then switch to driving mode after 10 seconds
        setIsDrivingMode(false);
        setRouteKey(`route-accepted-${rideId}-${Date.now()}`);
        
        console.log('🛣️ Initial route set for accepted ride');
        
        // Switch to driving mode after 10 seconds
        setTimeout(() => {
          console.log('🚗 Switching to driving mode');
          setIsDrivingMode(true);
          
          // Voice announcement for entering navigation mode
          const destination = currentRide?.status === 'IN_PROGRESS' ? 'destination' : 'pickup location';
          speakInstruction(`Navigation started. Driving to ${destination}.`);
        }, 10000);
        
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
      
      // Turn off driving mode when ride is cancelled
      setIsDrivingMode(false);
      
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
        // Turn off driving mode when ride is completed
        setIsDrivingMode(false);
      } else {
        await loadCurrentRide();
      }
    } catch (error) {
      console.error('Failed to update ride status:', error);
    }
  };

  // Smart route calculation - only when driver moves significantly AND with 5s throttling
  const shouldRecalculateRoute = useCallback((currentLoc: Location): boolean => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastRouteUpdateRef.current;
    
    // Don't recalculate if less than 5 seconds since last update
    if (timeSinceLastUpdate < 5000) {
      console.log(`🚫 Route update blocked - only ${Math.round(timeSinceLastUpdate/1000)}s since last update (need 5s)`);
      return false;
    }
    
    if (!lastRouteCalculationRef.current) {
      console.log('🛣️ First route calculation needed');
      return true;
    }
    
    // Only recalculate if driver moved more than 100 meters from last calculation
    const distanceFromLastCalculation = calculateDistance(
      lastRouteCalculationRef.current.lat,
      lastRouteCalculationRef.current.lng,
      currentLoc.lat,
      currentLoc.lng
    );
    
    const shouldUpdate = distanceFromLastCalculation > 0.1; // 100 meters
    if (shouldUpdate) {
      console.log(`🛣️ Route update needed - driver moved ${Math.round(distanceFromLastCalculation * 1000)}m`);
    } else {
      console.log(`📍 Driver only moved ${Math.round(distanceFromLastCalculation * 1000)}m - no route update needed`);
    }
    
    return shouldUpdate;
  }, []);

  // Throttled route update function
  const scheduleRouteUpdate = useCallback((location: Location) => {
    // Clear any existing timeout
    if (routeUpdateTimeoutRef.current) {
      console.log('⏰ Clearing previous route update timeout');
      clearTimeout(routeUpdateTimeoutRef.current);
    }

    console.log('⏰ Scheduling route update in 5 seconds...');
    
    // Schedule new route update after 5 seconds
    routeUpdateTimeoutRef.current = window.setTimeout(() => {
      if (shouldRecalculateRoute(location)) {
        console.log('🛣️ Executing throttled route update');
        lastRouteCalculationRef.current = location;
        lastRouteUpdateRef.current = Date.now();
        
        // Update route key to trigger map re-render with new route
        setRouteKey(`route-update-${Date.now()}`);
      } else {
        console.log('🚫 Throttled route update cancelled - conditions not met');
      }
    }, 5000);
  }, [shouldRecalculateRoute]);

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

  // Subscribe to server-sent events for the current ride
  useEffect(() => {
    if (!currentRide?.id) return;
    const unsubscribe = subscribeRideEvents(currentRide.id, (ev: RideEvt) => {
      if (ev.type === 'STATUS' && ev.status) {
        setCurrentRide(prev => prev ? { ...prev, status: ev.status!, updatedAt: new Date().toISOString() } : prev);
      }
    });
    return () => unsubscribe();
  }, [currentRide?.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (routeUpdateTimeoutRef.current) {
        clearTimeout(routeUpdateTimeoutRef.current);
      }
    };
  }, []);

  if (currentRide && currentRide.status !== 'COMPLETED') {
    const displayRide = transformRideForDisplay(currentRide);
    
    // Calculate stable route key with throttling to prevent excessive API calls
    const currentLoc = displayLocation;
    if (currentLoc && shouldRecalculateRoute(currentLoc)) {
      // Instead of immediately updating, schedule a throttled update
      scheduleRouteUpdate(currentLoc);
    }
    
    // Use state routeKey for map rendering (stable until throttled update)
    const mapRouteKey = routeKey;
    
    return (
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden no-zoom-bounce">
        <Header title="Current Ride" />
        
        <div className="flex-1 relative overflow-hidden">
          {isDrivingMode ? (
            // Google Maps-style navigation mode
            <div className="h-full bg-gray-100 relative">
              {/* Top Navigation Direction Bar (like Google Maps) */}
              <div className="absolute top-0 left-0 right-0 z-30 bg-white shadow-lg">
                <div className="flex items-center justify-between p-3">
                  {/* Main Direction Instruction */}
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      {nextTurnDirection === 'arrived' ? '🏁' :
                       nextTurnDirection === 'straight' ? '⬆️' :
                       nextTurnDirection === 'left' ? '↰' :
                       nextTurnDirection === 'right' ? '↱' : '⬆️'}
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900">
                        {currentRide?.status === 'IN_PROGRESS' 
                          ? (currentRide.destinationAddress?.split(',')[0] || 'Destination')
                          : (currentRide.pickupAddress?.split(',')[0] || 'Pickup Location')}
                      </div>
                      {distanceToNextTurn > 0 && (
                        <div className="text-sm text-gray-600">
                          in {distanceToNextTurn > 1000 
                            ? `${(distanceToNextTurn/1000).toFixed(1)} km` 
                            : `${distanceToNextTurn} m`}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Voice toggle and exit */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        voiceEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {voiceEnabled ? '🔊' : '🔇'}
                    </button>
                    <button
                      onClick={() => setIsDrivingMode(false)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* Map with maximum zoom like Google Maps */}
              <div className="h-full pt-16">
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
                    routeKey={mapRouteKey}
                    center={displayLocation}
                    zoom={21}  // Maximum possible zoom for street-level detail
                    height="100%"
                    markers={[
                      displayLocation,
                      {
                        lat: currentRide.pickupLatitude,
                        lng: currentRide.pickupLongitude,
                        address: currentRide.pickupAddress || 'Pickup Location',
                        isRiderWaiting: true
                      },
                      ...(currentRide.status === 'IN_PROGRESS' ? [{
                        lat: currentRide.destinationLatitude,
                        lng: currentRide.destinationLongitude,
                        address: currentRide.destinationAddress || 'Destination'
                      }] : [])
                    ]}
                    showDirections={true}
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
                    pickup={displayLocation}
                    routingService="ors"
                    followUser={true}
                    navigationMode={true}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <div className="text-center text-gray-600">
                      <div className="text-3xl mb-4">🗺️</div>
                      <p className="text-lg font-medium">Loading Navigation...</p>
                    </div>
                  </div>
                )}

                {/* Bottom Left: Distance/Time Display (Google Maps style) */}
                <div className="absolute bottom-20 left-4 z-30">
                  <div className="bg-white rounded-lg shadow-lg px-3 py-2 min-w-[80px]">
                    <div className="flex items-center space-x-3">
                      {/* Distance remaining */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {displayLocation && currentRide ? (
                            currentRide.status === 'IN_PROGRESS' 
                              ? Math.round(calculateDistance(
                                  displayLocation.lat, displayLocation.lng,
                                  currentRide.destinationLatitude, currentRide.destinationLongitude
                                ) * 10) / 10
                              : Math.round(calculateDistance(
                                  displayLocation.lat, displayLocation.lng,
                                  currentRide.pickupLatitude, currentRide.pickupLongitude
                                ) * 10) / 10
                          ) : '0'}
                        </div>
                        <div className="text-xs text-gray-500">km</div>
                      </div>
                      
                      {/* Time estimate */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {displayLocation && currentRide ? 
                            Math.round((currentRide.status === 'IN_PROGRESS' 
                              ? calculateDistance(
                                  displayLocation.lat, displayLocation.lng,
                                  currentRide.destinationLatitude, currentRide.destinationLongitude
                                )
                              : calculateDistance(
                                  displayLocation.lat, displayLocation.lng,
                                  currentRide.pickupLatitude, currentRide.pickupLongitude
                                )) * 2) // Rough time estimate: 2 min per km in city
                            : '0'}
                        </div>
                        <div className="text-xs text-gray-500">min</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Passenger Bar (minimal) */}
              <div className="absolute bottom-0 left-0 right-0 z-30 bg-white border-t shadow-lg">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {currentRide.riderUsername || `Rider ${currentRide.riderId}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {currentRide.status === 'IN_PROGRESS' ? 'In vehicle' : 'Waiting'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Call button */}
                    <button 
                      className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700"
                      onClick={() => {
                        if (currentRide.riderPhone) {
                          window.open(`tel:${currentRide.riderPhone}`, '_self');
                        }
                      }}
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    
                    {/* Main action button */}
                    {currentRide.status === 'DRIVER_EN_ROUTE' && (
                      <button
                        onClick={() => handleUpdateRideStatus('arrived_at_pickup')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Arrived
                      </button>
                    )}
                    
                    {currentRide.status === 'ARRIVED' && (
                      <button
                        onClick={() => handleUpdateRideStatus('start_ride')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                      >
                        Start Trip
                      </button>
                    )}
                    
                    {currentRide.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleUpdateRideStatus('complete')}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                      >
                        End Trip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Regular map view
            <>
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
                  routeKey={mapRouteKey}
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
                  showDirections={
                    // Show route: to pickup before pickup, to destination once in progress
                    !!currentRide && (
                      currentRide.status === 'ACCEPTED' ||
                      currentRide.status === 'DRIVER_EN_ROUTE' ||
                      currentRide.status === 'ARRIVED' ||
                      currentRide.status === 'IN_PROGRESS'
                    )
                  }
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
                  routingService="ors"
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
            </>
          )}

          {/* Bottom Panel for Current Ride - Only show in map view */}
          {!isDrivingMode && (
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
          )}
        </div>
      </div>
    );
  }

  // (Removed duplicate subscription hook that violated hooks rules)

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
            routingService="ors"
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

                {isOpenForRides && !currentRide && (
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

                {/* Current Ride Section */}
                {currentRide && (
                  <div className="mb-3">
                    <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-900">Current Ride</h3>
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-blue-700 capitalize">
                            {currentRide.status.replace('_', ' ').toLowerCase()}
                          </span>
                        </div>
                      </div>

                      {/* Rider Information */}
                      <div className="bg-white rounded-lg p-2 mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900">Passenger</p>
                            <p className="text-xs text-gray-600">
                              Rider ID: {currentRide.riderId}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Pickup Location */}
                      <div className="bg-white rounded-lg p-2 mb-2">
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900">Pickup Location</p>
                            <p className="text-xs text-gray-600">
                              {currentRide.pickupAddress || `${currentRide.pickupLatitude}, ${currentRide.pickupLongitude}`}
                            </p>
                            {displayLocation && (
                              <p className="text-xs text-blue-600 mt-1">
                                {LocationService.calculateDistance(
                                  displayLocation,
                                  { lat: currentRide.pickupLatitude, lng: currentRide.pickupLongitude, address: '' }
                                ).toFixed(1)} km away
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Destination */}
                      <div className="bg-white rounded-lg p-2 mb-2">
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900">Destination</p>
                            <p className="text-xs text-gray-600">
                              {currentRide.destinationAddress || `${currentRide.destinationLatitude}, ${currentRide.destinationLongitude}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        {currentRide.status === 'ACCEPTED' && (
                          <button
                            onClick={() => handleUpdateRideStatus('start_drive_to_pickup')}
                            className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                          >
                            Start Drive to Pickup
                          </button>
                        )}
                        
                        {currentRide.status === 'DRIVER_EN_ROUTE' && (
                          <button
                            onClick={() => handleUpdateRideStatus('arrive_at_pickup')}
                            className="w-full py-2 px-3 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 transition-colors"
                          >
                            Arrived at Pickup
                          </button>
                        )}
                        
                        {currentRide.status === 'ARRIVED' && (
                          <button
                            onClick={() => handleUpdateRideStatus('start_ride')}
                            className="w-full py-2 px-3 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                          >
                            Start Ride to Destination
                          </button>
                        )}
                        
                        {currentRide.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleUpdateRideStatus('complete')}
                            className="w-full py-2 px-3 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
                          >
                            Complete Ride
                          </button>
                        )}

                        {/* Cancel Button for any status */}
                        <button
                          onClick={handleCancelRide}
                          disabled={loading}
                          className="w-full py-2 px-3 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Cancelling...' : 'Cancel Ride'}
                        </button>
                      </div>
                    </div>
                  </div>
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