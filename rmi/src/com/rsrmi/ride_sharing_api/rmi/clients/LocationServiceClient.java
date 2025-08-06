package com.rsrmi.ride_sharing_api.rmi.clients;

import com.rsrmi.ride_sharing_api.rmi.interfaces.LocationService;
import com.rsrmi.ride_sharing_api.rmi.models.UserLocation;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.util.Scanner;

public class LocationServiceClient {

    private LocationService locationService;
    private Scanner scanner;

    public LocationServiceClient() {
        this.scanner = new Scanner(System.in);
    }

    /**
     * Connect to the RMI server
     */
    public boolean connect() {
        try {
            System.out.println("🔗 Connecting to RMI server...");
            
            // Locate the registry
            Registry registry = LocateRegistry.getRegistry("localhost", 1099);
            
            // Look up the UserService
            locationService = (LocationService) registry.lookup("LocationService");
            
            System.out.println("✅ Connected to LocationService successfully!");
            return true;
            
        } catch (Exception e) {
            System.err.println("Failed to connect to RMI server: " + e.getMessage());
            return false;
        }
    }
    // ...rest of the code...
}
