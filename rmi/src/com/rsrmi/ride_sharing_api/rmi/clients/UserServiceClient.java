package com.rsrmi.ride_sharing_api.rmi.clients;

import com.rsrmi.ride_sharing_api.rmi.interfaces.UserService;
import com.rsrmi.ride_sharing_api.rmi.models.User;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.util.Scanner;

/**
 * Simple console client for testing the UserService
 */
public class UserServiceClient {
    
    private UserService userService;
    private Scanner scanner;

    public UserServiceClient() {
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
            userService = (UserService) registry.lookup("UserService");
            
            System.out.println("✅ Connected to UserService successfully!");
            return true;
            
        } catch (Exception e) {
            System.err.println("Failed to connect to RMI server: " + e.getMessage());
            return false;
        }
    }
    // ...rest of the code...
}
