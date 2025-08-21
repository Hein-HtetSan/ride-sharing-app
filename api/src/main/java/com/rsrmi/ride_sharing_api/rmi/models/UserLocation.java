package com.rsrmi.ride_sharing_api.rmi.models;

import java.time.LocalDateTime;
import java.io.Serializable;

public class UserLocation implements Serializable {
    private static final long serialVersionUID = 1L;
    private int user_id;
    private double latitude;
    private double longitude;
    private String address;
    private boolean is_online;
    private LocalDateTime last_updated;

    public UserLocation() {
        // Default constructor
    }

    public UserLocation(int user_id, double latitude, double longitude, String address, boolean is_online, LocalDateTime last_updated) {
        this.user_id = user_id;
        this.latitude = latitude;
        this.longitude = longitude;
        this.address = address;
        this.is_online = is_online;
        this.last_updated = last_updated;
    }

    public int getUserId() {
        return this.user_id;
    }

    public void setUserId(int user_id) {
        this.user_id = user_id;
    }

    public double getLatitude() {
        return this.latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return this.longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public String getAddress() {
        return this.address;
    }

    public void setAddress(String address) {
        this.address = address; 
    }

    public boolean getIsOnline() {
        return this.is_online;
    }

    public void setIsOnline(boolean is_online) {
        this.is_online = is_online;
    }

    public LocalDateTime getLastUpdated() {
        return this.last_updated;
    }

    public void setLastUpdated(LocalDateTime last_updated) {
        this.last_updated = last_updated;
    }

    @Override
    public String toString() {
        return "Location{" +
                "user_id=" + user_id +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", address=" + address +
                ", is_online=" + is_online +
                ", last_updated='" + last_updated + '\'' +
                '}';
    }

    /**
     * Calculate distance between this location and another location
     * Using Haversine formula to calculate distance in kilometers
     */
    public double calculateDistance(UserLocation other) {
        if (other == null) {
            return Double.MAX_VALUE;
        }
        
        final int EARTH_RADIUS = 6371; // Earth's radius in kilometers
        
        double lat1Rad = Math.toRadians(this.latitude);
        double lat2Rad = Math.toRadians(other.latitude);
        double deltaLatRad = Math.toRadians(other.latitude - this.latitude);
        double deltaLonRad = Math.toRadians(other.longitude - this.longitude);
        
        double a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
                   Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                   Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS * c; // Distance in kilometers
    }
}
