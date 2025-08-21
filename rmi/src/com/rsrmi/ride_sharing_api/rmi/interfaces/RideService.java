package com.rsrmi.ride_sharing_api.rmi.interfaces;

import java.rmi.Remote;
import java.util.List;
import java.rmi.RemoteException;
import com.rsrmi.ride_sharing_api.rmi.models.Ride;

public interface RideService extends Remote {
    
    // 1. RIDE REQUEST & MATCHING
    int requestRide(int riderId, double pickupLat, double pickupLng, double destLat, double destLng) throws RemoteException;
    
    List<Ride> getPendingRides(double driverLat, double driverLng, double radius) throws RemoteException; // Driver gets nearby ride requests
    
    // 2. RIDE ACCEPTANCE & STATUS
    int acceptRide(int driverId, int rideId) throws RemoteException; // Driver accepts specific ride
    
    boolean cancelRide(int rideId) throws RemoteException;
    
    // 3. RIDE STATUS UPDATES
    boolean startDriveToPickup(int rideId) throws RemoteException; // Driver starts driving to pickup
    
    boolean arrivedAtPickup(int rideId) throws RemoteException; // Driver arrived at pickup location
    
    boolean startRideToDestination(int rideId) throws RemoteException; // Driver picked up rider, going to destination
    
    boolean completeRide(int rideId) throws RemoteException; // Ride completed successfully
    
    // 4. REAL-TIME TRACKING
    boolean updateDriverLocation(int driverId, double lat, double lng) throws RemoteException; // Driver location updates
    
    // 5. RIDE INFORMATION
    Ride getCurrentRide(int userId) throws RemoteException; // Get in_progress ride
    
    List<Ride> getRideHistory(int userId) throws RemoteException;
    
    // 6. RIDE STATUS CHECKING
    String getRideStatus(int rideId) throws RemoteException; // Get current status: PENDING, ACCEPTED, DRIVER_EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED
}
