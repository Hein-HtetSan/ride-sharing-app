package com.rsrmi.api.service;

import com.rsrmi.api.model.UserLocation;
import com.rsrmi.ride_sharing_api.rmi.interfaces.LocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class LocationServiceRmiClient {

    @Autowired
    private LocationService locationService;

    public boolean updateUserLocation(
        int userId,
        UserLocation location
    ) throws Exception {
        com.rsrmi.ride_sharing_api.rmi.models.UserLocation rmiUserLocation = new com.rsrmi.ride_sharing_api.rmi.models.UserLocation();
        rmiUserLocation.setUserId(userId);
        rmiUserLocation.setLatitude(location.getLatitude());
        rmiUserLocation.setLongitude(location.getLongitude());
        rmiUserLocation.setAddress(location.getAddress());
        rmiUserLocation.setLastUpdated(location.getLastUpdated());
        rmiUserLocation.setIsOnline(location.getIsOnline());
        return locationService.updateUserLocation(userId, rmiUserLocation);
    }

    public UserLocation getUserLocation(int userId) throws Exception {
        com.rsrmi.ride_sharing_api.rmi.models.UserLocation rmiResult = locationService.getUserLocation(userId);
        if (rmiResult == null) return null;
        UserLocation apiUserLocation = new UserLocation();
        apiUserLocation.setUserId(rmiResult.getUserId());
        apiUserLocation.setLatitude(rmiResult.getLatitude());
        apiUserLocation.setLongitude(rmiResult.getLongitude());
        apiUserLocation.setAddress(rmiResult.getAddress());
        apiUserLocation.setLastUpdated(rmiResult.getLastUpdated());
        apiUserLocation.setIsOnline(rmiResult.getIsOnline());
        return apiUserLocation;
    }

    public List<UserLocation> findNearbyDrivers(
        com.rsrmi.ride_sharing_api.rmi.models.UserLocation riderLocation, 
        double radiusKm
    ) throws Exception {
        List<com.rsrmi.ride_sharing_api.rmi.models.UserLocation> rmiResults = locationService.findNearbyDrivers(riderLocation, radiusKm);
        List<UserLocation> apiResults = new ArrayList<>();
        if (rmiResults != null) {
            for (com.rsrmi.ride_sharing_api.rmi.models.UserLocation rmiLoc : rmiResults) {
                UserLocation apiLoc = new UserLocation();
                apiLoc.setUserId(rmiLoc.getUserId());
                apiLoc.setLatitude(rmiLoc.getLatitude());
                apiLoc.setLongitude(rmiLoc.getLongitude());
                apiLoc.setAddress(rmiLoc.getAddress());
                apiLoc.setLastUpdated(rmiLoc.getLastUpdated());
                apiLoc.setIsOnline(rmiLoc.getIsOnline());
                apiResults.add(apiLoc);
            }   
        }
        return apiResults;
    }
    
}
