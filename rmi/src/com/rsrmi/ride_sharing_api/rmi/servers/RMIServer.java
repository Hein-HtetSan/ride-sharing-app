package com.rsrmi.ride_sharing_api.rmi.servers;

import com.rsrmi.ride_sharing_api.rmi.implementations.UserServiceImpl;
import com.rsrmi.ride_sharing_api.rmi.implementations.LocationServiceImpl;
import com.rsrmi.ride_sharing_api.rmi.interfaces.UserService;
import com.rsrmi.ride_sharing_api.rmi.interfaces.LocationService;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

/**
 * RMI Server that starts the registry and binds the UserService
 */
public class RMIServer {
    
    public static void main(String[] args) {
        try {
            System.out.println("Starting RMI Server...");

            // Step 1: Create RMI Registry on port 1099
            System.out.println("Creating RMI Registry on port 1099...");
            Registry registry = LocateRegistry.createRegistry(1099);

            // Step 2: Create UserService implementation
            System.out.println("Creating UserService implementation...");
            UserServiceImpl userServiceImpl = new UserServiceImpl();
            UserService userService = userServiceImpl;
            // Create LocationService implementation
            LocationService locationService = new LocationServiceImpl();

            // Step 3: Bind the service to the registry
            System.out.println("Binding UserService to registry...");
            registry.bind("UserService", userService);
            registry.bind("LocationService", locationService);

            // Get RMI hostname for Docker networking
            String rmiHost = System.getenv().getOrDefault("RMI_HOSTNAME", "localhost");

            System.out.println("RMI Server started successfully!");
            System.out.println("UserService is available at: rmi://" + rmiHost + ":1099/UserService");
            System.out.println("LocationService is available at: rmi://" + rmiHost + ":1099/LocationService");
            System.out.println("Server is ready to accept client connections...");

            // Keep the server alive
            while (true) {
                Thread.sleep(1000);
            }

        } catch (Exception e) {
            System.err.println("Error starting RMI Server: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
