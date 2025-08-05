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

    public static void main(String[] args) {
        UserServiceClient client = new UserServiceClient();
        if (!client.connect()) {
            System.out.println("Could not connect to RMI server. Exiting.");
            return;
        }
        Scanner scanner = new Scanner(System.in);
        while (true) {
            System.out.println("\nChoose an action:");
            System.out.println("1. Test loginUser");
            System.out.println("0. Exit");
            System.out.print("Enter choice: ");
            String choice = scanner.nextLine();
            if ("1".equals(choice)) {
                client.testLoginUser();
            } else if ("0".equals(choice)) {
                System.out.println("Exiting.");
                break;
            } else {
                System.out.println("Invalid choice.");
            }
        }
        scanner.close();
    }

    public void testLoginUser() {
        if (userService == null) {
            System.out.println("Not connected to RMI server. Call connect() first.");
            return;
        }
        System.out.print("Enter phone: ");
        String phone = scanner.nextLine();
        System.out.print("Enter password: ");
        String password = scanner.nextLine();
        try {
            User user = userService.loginUser(phone, password);
            if (user != null) {
                System.out.println("✅ Login successful! User info:");
                System.out.println("ID: " + user.getId());
                System.out.println("Username: " + user.getUsername());
                System.out.println("Phone: " + user.getPhone());
                System.out.println("UserType: " + user.getUserType());
            } else {
                System.out.println("❌ Login failed: Invalid phone or password.");
            }
        } catch (Exception e) {
            System.err.println("Error during login: " + e.getMessage());
        }
    }
}
