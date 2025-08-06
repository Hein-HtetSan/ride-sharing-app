package com.rsrmi.ride_sharing_api.rmi.test;

import com.rsrmi.ride_sharing_api.rmi.models.User;

/**
 * Simple test class to verify User model works correctly
 */
public class UserTest {
    public static void main(String[] args) {
        System.out.println("Testing User class...");
        
        // Test 1: Default constructor
        User user1 = new User();
        user1.setId(1);
        user1.setUsername("john_doe");
        user1.setPassword("password123");
        user1.setPhone("555-1234");
        user1.setUserType(User.UserType.RIDER);
        System.out.println("User 1: " + user1);
    }
}
