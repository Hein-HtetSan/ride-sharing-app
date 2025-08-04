package com.rsrmi.ride_sharing_api.rmi.models;

import java.io.Serializable;

public class DriverLocationInfo implements Serializable {
    private static final long serialVersionUID = 1L;
    private User driver;
    private Location location;
    private double distance;
    private long lastUpdated;

    public DriverLocationInfo() {
        // default constructor
    }

    public DriverLocationInfo(User driver, Location location, double distance, long lastUpdated) {
        this.driver = driver;
        this.location = location;
        this.distance = distance;
        this.lastUpdated = lastUpdated;
    }

    // getters and setters
    public User getDriver() {
        return this.driver;
    }

    public void setDriver(User driver) {
        this.driver = driver;
    }

    public Location getLocation() {
        return this.location;
    }

    public void setLocation(Location location) {
        this.location = location;
    }

    public double getDistance() {
        return this.distance;
    }

    public void setDistance(double distance) {
        this.distance = distance;
    }

    public long getLastUpdated() {
        return this.lastUpdated;
    }

    public void setLastUpdated(long lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    @Override
    public String toString() {
        return "DriverLocationInfo{" +
                "driver=" + driver +
                ", location=" + location +
                ", distance='" + distance +
                ", lastUpdated='" + lastUpdated + '\'' +
                '}';
    }

}
