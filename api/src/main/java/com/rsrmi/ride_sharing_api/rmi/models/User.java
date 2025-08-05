package com.rsrmi.ride_sharing_api.rmi.models;

import java.io.Serializable;

public class User implements Serializable {
    private static final long serialVersionUID = 1L;
    private int id;
    private String username;
    private String password;
    private String phone;
    private UserType userType;

    public enum UserType {
        RIDER, DRIVER, ADMIN
    }

    public User() {}

    public User(int id, String username, String password, String phone, UserType userType) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.phone = phone;
        this.userType = userType;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public UserType getUserType() { return userType; }
    public void setUserType(UserType userType) { this.userType = userType; }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", phone='" + phone + '\'' +
                ", userType=" + userType +
                '}';
    }

}
