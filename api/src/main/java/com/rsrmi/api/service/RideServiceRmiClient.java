package com.rsrmi.api.service;

import com.rsrmi.api.model.Ride;
import com.rsrmi.ride_sharing_api.rmi.interfaces.RideService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.rmi.RemoteException;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RideServiceRmiClient {
    
    @Autowired
    private RideService rideService;

    public int requestRide(int riderId, double pickupLat, double pickupLng, 
                              double destLat, double destLng) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        return rideService.requestRide(riderId, pickupLat, pickupLng, destLat, destLng);
    }

    public List<Ride> getPendingRides(double driverLat, double driverLng, double radius) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        List<com.rsrmi.ride_sharing_api.rmi.models.Ride> rmiRides = 
            rideService.getPendingRides(driverLat, driverLng, radius);
        
        return rmiRides.stream()
                .map(this::convertFromRmiRide)
                .collect(Collectors.toList());
    }

    public int acceptRide(int driverId, int rideId) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        return rideService.acceptRide(driverId, rideId);
    }

    public boolean cancelRide(int rideId) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        return rideService.cancelRide(rideId);
    }

    public boolean startDriveToPickup(int rideId) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        return rideService.startDriveToPickup(rideId);
    }

    public boolean arrivedAtPickup(int rideId) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        return rideService.arrivedAtPickup(rideId);
    }

    public boolean startRideToDestination(int rideId) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        return rideService.startRideToDestination(rideId);
    }

    public boolean completeRide(int rideId) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        return rideService.completeRide(rideId);
    }

    public boolean updateDriverLocation(int driverId, double lat, double lng) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        return rideService.updateDriverLocation(driverId, lat, lng);
    }

    public Ride getCurrentRide(int userId) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        com.rsrmi.ride_sharing_api.rmi.models.Ride rmiRide = rideService.getCurrentRide(userId);
        return rmiRide != null ? convertFromRmiRide(rmiRide) : null;
    }

    public List<Ride> getRideHistory(int userId) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        List<com.rsrmi.ride_sharing_api.rmi.models.Ride> rmiRides = rideService.getRideHistory(userId);
        return rmiRides.stream()
                .map(this::convertFromRmiRide)
                .collect(Collectors.toList());
    }

    public String getRideStatus(int rideId) throws RemoteException {
        if (rideService == null) {
            throw new RemoteException("RMI service not available");
        }
        
        return rideService.getRideStatus(rideId);
    }

    private Ride convertFromRmiRide(com.rsrmi.ride_sharing_api.rmi.models.Ride rmiRide) {
        if (rmiRide == null) return null;
        
        Ride ride = new Ride();
        ride.setId(rmiRide.getId());
        ride.setRiderId(rmiRide.getRiderId());
        ride.setDriverId(rmiRide.getDriverId());
        ride.setPickupLatitude(rmiRide.getPickupLatitude());
        ride.setPickupLongitude(rmiRide.getPickupLongitude());
        ride.setPickupAddress(rmiRide.getPickupAddress());
        ride.setDestinationLatitude(rmiRide.getDestinationLatitude());
        ride.setDestinationLongitude(rmiRide.getDestinationLongitude());
        ride.setDestinationAddress(rmiRide.getDestinationAddress());
        
        // Set rider information
        ride.setRiderUsername(rmiRide.getRiderUsername());
        ride.setRiderPhone(rmiRide.getRiderPhone());
        
        // Convert status
        try {
            ride.setStatus(Ride.Status.valueOf(rmiRide.getStatus().toString()));
        } catch (IllegalArgumentException e) {
            ride.setStatus(Ride.Status.PENDING); // Default fallback
        }
        
        // Convert timestamps - keep as Timestamp
        ride.setCreatedAt(rmiRide.getCreatedAt());
        ride.setUpdatedAt(rmiRide.getUpdatedAt());
        ride.setAcceptedAt(rmiRide.getAcceptedAt());
        ride.setStartedAt(rmiRide.getStartedAt());
        ride.setCompletedAt(rmiRide.getCompletedAt());
        
        return ride;
    }
}
