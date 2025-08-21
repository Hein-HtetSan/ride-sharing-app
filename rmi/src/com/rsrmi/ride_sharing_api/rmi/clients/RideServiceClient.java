package com.rsrmi.ride_sharing_api.rmi.clients;

import com.rsrmi.ride_sharing_api.rmi.interfaces.RideService;
import com.rsrmi.ride_sharing_api.rmi.models.Ride;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.util.List;

public class RideServiceClient {
    
    public static void main(String[] args) {
        try {
            System.out.println("Connecting to RMI Registry...");
            
            // Connect to RMI registry
            Registry registry = LocateRegistry.getRegistry("localhost", 1099);
            RideService rideService = (RideService) registry.lookup("RideService");
            
            System.out.println("Connected to RideService successfully!");
            
            // Test 1: Request a ride
            System.out.println("\n=== Testing Ride Request ===");
            int rideRequested = rideService.requestRide(1, 40.7128, -74.0060, 40.7589, -73.9851);
            System.out.println("Ride requested: " + rideRequested);
            
            // Test 2: Get pending rides
            System.out.println("\n=== Testing Get Pending Rides ===");
            List<Ride> pendingRides = rideService.getPendingRides(40.7128, -74.0060, 10.0);
            System.out.println("Found " + pendingRides.size() + " pending rides");
            
            if (!pendingRides.isEmpty()) {
                Ride firstRide = pendingRides.get(0);
                System.out.println("First pending ride: " + firstRide);
                
                // Test 3: Accept the ride
                System.out.println("\n=== Testing Ride Acceptance ===");
                int acceptResult = rideService.acceptRide(2, firstRide.getId());
                System.out.println("Ride acceptance result: " + acceptResult);
                
                if (acceptResult > 0) {
                    // Test 4: Update ride status
                    System.out.println("\n=== Testing Ride Status Updates ===");
                    
                    boolean driveStarted = rideService.startDriveToPickup(firstRide.getId());
                    System.out.println("Drive to pickup started: " + driveStarted);
                    
                    boolean arrived = rideService.arrivedAtPickup(firstRide.getId());
                    System.out.println("Arrived at pickup: " + arrived);
                    
                    boolean rideStarted = rideService.startRideToDestination(firstRide.getId());
                    System.out.println("Ride to destination started: " + rideStarted);
                    
                    // Test 5: Check ride status
                    System.out.println("\n=== Testing Get Ride Status ===");
                    String status = rideService.getRideStatus(firstRide.getId());
                    System.out.println("Current ride status: " + status);
                    
                    // Test 6: Complete the ride
                    boolean completed = rideService.completeRide(firstRide.getId());
                    System.out.println("Ride completed: " + completed);
                }
            }
            
            // Test 7: Update driver location
            System.out.println("\n=== Testing Driver Location Update ===");
            boolean locationUpdated = rideService.updateDriverLocation(2, 40.7500, -73.9500);
            System.out.println("Driver location updated: " + locationUpdated);
            
            // Test 8: Get current ride
            System.out.println("\n=== Testing Get Current Ride ===");
            Ride currentRide = rideService.getCurrentRide(1);
            System.out.println("Current ride for user 1: " + currentRide);
            
            // Test 9: Get ride history
            System.out.println("\n=== Testing Get Ride History ===");
            List<Ride> rideHistory = rideService.getRideHistory(1);
            System.out.println("Ride history for user 1: " + rideHistory.size() + " rides");
            
            System.out.println("\n=== All tests completed successfully! ===");
            
        } catch (Exception e) {
            System.err.println("Error testing RideService: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
