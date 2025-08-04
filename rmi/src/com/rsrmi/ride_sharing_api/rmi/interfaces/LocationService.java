package com.rsrmi.ride_sharing_api.rmi.interfaces;

import java.rmi.Remote;
import java.rmi.RemoteException;
import java.util.List;
import com.rsrmi.ride_sharing_api.rmi.models.Location;
import com.rsrmi.ride_sharing_api.rmi.models.DriverLocationInfo;

/**
 * Remote interface for location-related services in the ride-sharing system.
 */
public interface LocationService extends Remote {
    /**
     * Update a user's location, timestamp, and availability status.
     * @param userId The user's ID
     * @param location The user's current location
     * @param timestamp The time of the update (epoch ms)
     * @param isAvailable Whether the user (driver) is available
     * @return true if update is successful, false otherwise
     * @throws RemoteException for RMI errors
     */
    boolean updateUserLocation(int userId, Location location, long timestamp, boolean isAvailable) throws RemoteException;

    /**
     * Get the current location of a user.
     * @param userId The user's ID
     * @return The user's current location, or null if not found
     * @throws RemoteException for RMI errors
     */
    Location getUserLocation(int userId) throws RemoteException;

    /**
     * Find available drivers within a given radius of a rider's location.
     * @param riderLocation The rider's current location
     * @param radiusKm The search radius in kilometers
     * @return List of DriverLocationInfo for nearby drivers
     * @throws RemoteException for RMI errors
     */
    List<DriverLocationInfo> findNearbyDrivers(Location riderLocation, double radiusKm) throws RemoteException;

    /**
     * Remove a user location when they go offline or log out.
     * @param userId The user's ID
     */
    boolean removeUserLocation(int userId) throws RemoteException;

    /**
     * For real-time tracking of a specific driver
     * @param driverId The driver's ID
     */
    Location getDriverLocation(int driverId) throws RemoteException;

    /**
     * For real-time tracking of a specific rider
     * @param riderId The rider's ID
     */
    Location getRiderLocation(int riderId) throws RemoteException;
    
}
