package com.rsrmi.ride_sharing_api.rmi.interfaces;

import java.rmi.Remote;
import java.rmi.RemoteException;
import java.util.List;
import com.rsrmi.ride_sharing_api.rmi.models.UserLocation;

/**
 * Remote interface for location-related services in the ride-sharing system.
 */
public interface LocationService extends Remote {

    boolean updateUserLocation(int userId, UserLocation location, long timestamp, boolean isAvailable) throws RemoteException;

    UserLocation getUserLocation(int userId) throws RemoteException;

    List<UserLocation> findNearbyDrivers(UserLocation riderLocation, double radiusKm) throws RemoteException;
    
}
