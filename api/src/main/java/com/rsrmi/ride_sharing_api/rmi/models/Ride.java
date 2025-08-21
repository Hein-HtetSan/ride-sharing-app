package com.rsrmi.ride_sharing_api.rmi.models;

import java.io.Serializable;

public class Ride implements Serializable {
    
    private static final long serialVersionUID = 1L;
    private int id;
    private int rider_id;
    private int driver_id;
    private double pickup_latitude;
    private double pickup_longitude;
    private double destination_latitude;
    private double destination_longitude;
    private Status status;
    private String pickup_address;
    private String destination_address;
    private String riderUsername;
    private String riderPhone;
    private java.sql.Timestamp created_at;
    private java.sql.Timestamp updated_at;
    private java.sql.Timestamp accepted_at;
    private java.sql.Timestamp started_at;
    private java.sql.Timestamp completed_at;

    public enum Status {
        PENDING,           // Ride requested, waiting for driver
        ACCEPTED,          // Driver accepted the ride
        DRIVER_EN_ROUTE,   // Driver is driving to pickup location
        ARRIVED,           // Driver arrived at pickup location
        IN_PROGRESS,       // Rider picked up, going to destination
        COMPLETED,         // Ride completed successfully
        CANCELLED          // Ride cancelled (by rider or driver)
    }

    public Ride() {
        // default constructor
    }

    public Ride(
        int id, int rider_id, int driver_id,
        double pickup_latitude, double pickup_longitude,
        double destination_latitude, double destination_longitude,
        Status status
    ) {
        this.id = id;
        this.rider_id = rider_id;
        this.driver_id = driver_id;
        this.pickup_latitude = pickup_latitude;
        this.pickup_longitude = pickup_longitude;
        this.destination_latitude = destination_latitude;
        this.destination_longitude = destination_longitude;
        this.status = status;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getRiderId() {
        return rider_id;
    }

    public void setRiderId(int rider_id) {
        this.rider_id = rider_id;
    }

    public int getDriverId() {
        return driver_id;
    }

    public void setDriverId(int driver_id) {
        this.driver_id = driver_id;
    }

    public double getPickupLatitude() {
        return pickup_latitude;
    }

    public void setPickupLatitude(double pickup_latitude) {
        this.pickup_latitude = pickup_latitude;
    }

    public double getPickupLongitude() {
        return pickup_longitude;
    }

    public void setPickupLongitude(double pickup_longitude) {
        this.pickup_longitude = pickup_longitude;
    }

    public double getDestinationLatitude() {
        return destination_latitude;
    }

    public void setDestinationLatitude(double destination_latitude) {
        this.destination_latitude = destination_latitude;
    }

    public double getDestinationLongitude() {
        return destination_longitude;
    }

    public void setDestinationLongitude(double destination_longitude) {
        this.destination_longitude = destination_longitude;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public String getPickupAddress() {
        return pickup_address;
    }

    public void setPickupAddress(String pickup_address) {
        this.pickup_address = pickup_address;
    }

    public String getDestinationAddress() {
        return destination_address;
    }

    public void setDestinationAddress(String destination_address) {
        this.destination_address = destination_address;
    }

    public String getRiderUsername() {
        return riderUsername;
    }

    public void setRiderUsername(String riderUsername) {
        this.riderUsername = riderUsername;
    }

    public String getRiderPhone() {
        return riderPhone;
    }

    public void setRiderPhone(String riderPhone) {
        this.riderPhone = riderPhone;
    }

    public java.sql.Timestamp getCreatedAt() {
        return created_at;
    }

    public void setCreatedAt(java.sql.Timestamp created_at) {
        this.created_at = created_at;
    }

    public java.sql.Timestamp getUpdatedAt() {
        return updated_at;
    }

    public void setUpdatedAt(java.sql.Timestamp updated_at) {
        this.updated_at = updated_at;
    }

    public java.sql.Timestamp getAcceptedAt() {
        return accepted_at;
    }

    public void setAcceptedAt(java.sql.Timestamp accepted_at) {
        this.accepted_at = accepted_at;
    }

    public java.sql.Timestamp getStartedAt() {
        return started_at;
    }

    public void setStartedAt(java.sql.Timestamp started_at) {
        this.started_at = started_at;
    }

    public java.sql.Timestamp getCompletedAt() {
        return completed_at;
    }

    public void setCompletedAt(java.sql.Timestamp completed_at) {
        this.completed_at = completed_at;
    }

    @Override
    public String toString() {
        return "Ride{" +
                "id=" + id +
                ", rider_id=" + rider_id +
                ", driver_id=" + driver_id +
                ", pickup_latitude=" + pickup_latitude +
                ", pickup_longitude=" + pickup_longitude +
                ", destination_latitude=" + destination_latitude +
                ", destination_longitude=" + destination_longitude +
                ", status=" + status +
                '}';
    }
}