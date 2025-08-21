package com.rsrmi.ride_sharing_api.rmi.interfaces;

import java.rmi.Remote;
import java.rmi.RemoteException;
import java.util.List;
import com.rsrmi.ride_sharing_api.rmi.models.UserLocation;
import java.time.LocalDateTime;

public interface LocationService extends Remote {
    
    boolean updateUserLocation(int urserId, UserLocation location) throws RemoteException;

    UserLocation getUserLocation(int userId) throws RemoteException;

    List<UserLocation> findNearbyDrivers(UserLocation riderLocation, double radiusKm) throws RemoteException;
}
