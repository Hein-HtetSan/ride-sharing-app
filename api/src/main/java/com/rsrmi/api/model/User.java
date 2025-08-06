package com.rsrmi.api.model;

import java.io.Serializable;

public class User implements Serializable {
    private static final long serialVersionUID = 1L;
    private int id;
    private String username;
    private String password;
    private String phone;
    private UserType userType;
    // Driver-specific fields
    private String carType;
    private String licenseNumber;

    public enum UserType {
        RIDER, DRIVER, ADMIN
    }

    public User() {
        // Default constructor
    }

    public User(int id, String username, String password, String phone, UserType userType) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.phone = phone;
        this.userType = userType;
    }

    // Constructor for drivers with car details
    public User(int id, String username, String password, String phone, UserType userType, String carType, String licenseNumber) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.phone = phone;
        this.userType = userType;
        this.carType = carType;
        this.licenseNumber = licenseNumber;
    }

    // Getters and Setters
    public int getId() {
        return this.id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getUsername() {
        return this.username;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPassword() {
        return this.password;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPhone() {
        return this.phone;
    }

    public void setUserType(UserType userType) {
        this.userType = userType;
    }

    public UserType getUserType() {
        return this.userType;
    }

    public String getCarType() {
        return this.carType;
    }

    public void setCarType(String carType) {
        this.carType = carType;
    }

    public String getLicenseNumber() {
        return this.licenseNumber;
    }

    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", phone='" + phone + '\'' +
                ", userType=" + userType +
                (userType == UserType.DRIVER ?
                    ", carType='" + carType + '\'' +
                    ", licenseNumber='" + licenseNumber + '\'' : "") +
                '}';
    }
}