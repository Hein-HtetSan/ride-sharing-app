package com.rsrmi.ride_sharing_api.rmi.test;

import com.rsrmi.ride_sharing_api.rmi.models.User;

/**
 * Test class for Driver-specific features
 */
public class DriverTest {
    public static void main(String[] args) {
        System.out.println("Testing Driver functionality...");
        
        // Test 1: Create a rider (no car details needed)
        User rider = new User();
        rider.setUsername("john_rider");
        rider.setPhone("+1234567890");
        rider.setPassword("password123");
        rider.setUserType(User.UserType.RIDER);
        
        System.out.println("Rider: " + rider);
        
        // Test 2: Create a driver using basic constructor then set car details
        User driver1 = new User();
        driver1.setUsername("mike_driver");
        driver1.setPhone("+1987654321");
        driver1.setPassword("driverpass");
        driver1.setUserType(User.UserType.DRIVER);
        driver1.setCarType("Toyota Camry");
        driver1.setLicenseNumber("DL12345678");
        
        System.out.println("Driver 1 (using setters): " + driver1);
        
        // Test 3: Create a driver using full constructor
        User driver2 = new User(
            2, 
            "sarah_driver", 
            "password456", 
            "+1555123456", 
            User.UserType.DRIVER, 
            "Honda Civic", 
            "DL87654321"
        );
        
        System.out.println("Driver 2 (using full constructor): " + driver2);
        
        // Test 4: Show that toString displays car details only for drivers
        System.out.println("\n--- User Display Comparison ---");
        System.out.println("Rider toString: " + rider);
        System.out.println("Driver toString: " + driver1);
    }
}
