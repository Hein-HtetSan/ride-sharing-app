package com.rsrmi.ride_sharing_api.rmi.test;

import com.rsrmi.ride_sharing_api.rmi.models.Location;

/**
 * Test class for Location model
 */
public class LocationTest {
    public static void main(String[] args) {
        System.out.println("Testing Location class...");
        
        // Test 1: Default constructor
        Location location1 = new Location();
        location1.setLatitude(40.7128);  // New York City
        location1.setLongitude(-74.0060);
        location1.setAddress("New York City, NY");
        
        System.out.println("Location 1 (using setters): " + location1);
        
        // Test 2: Constructor with parameters
        Location location2 = new Location(34.0522, -118.2437, "Los Angeles, CA");
        System.out.println("Location 2 (using constructor): " + location2);
        
        // Test 3: Distance calculation
        double distance = location1.calculateDistance(location2);
        System.out.println("Distance between NYC and LA: " + distance + " km");
    }
}
