package com.rsrmi.api.service;

import com.rsrmi.api.model.User;
import com.rsrmi.ride_sharing_api.rmi.interfaces.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserServiceRmiClient {
    
    @Autowired
    private UserService userService;

    public boolean registerUser(User user) throws Exception {
        // Map API User to RMI User
        com.rsrmi.ride_sharing_api.rmi.models.User rmiUser = new com.rsrmi.ride_sharing_api.rmi.models.User();
        rmiUser.setId(user.getId());
        rmiUser.setUsername(user.getUsername());
        rmiUser.setPassword(user.getPassword());
        rmiUser.setPhone(user.getPhone());
        if (user.getUserType() != null) {
            rmiUser.setUserType(com.rsrmi.ride_sharing_api.rmi.models.User.UserType.valueOf(user.getUserType().name()));
        }
        return userService.registerUser(rmiUser);
    }

    public User loginUser(String phone, String password) throws Exception {
        com.rsrmi.ride_sharing_api.rmi.models.User rmiResult = userService.loginUser(phone, password);
        if (rmiResult == null) return null;
        User apiUser = new User();
        apiUser.setId(rmiResult.getId());
        apiUser.setUsername(rmiResult.getUsername());
        apiUser.setPhone(rmiResult.getPhone());
        if (rmiResult.getUserType() != null) {
            apiUser.setUserType(User.UserType.valueOf(rmiResult.getUserType().name()));
        }
        return apiUser;
    }

    public User getById(int id) throws Exception {
        com.rsrmi.ride_sharing_api.rmi.models.User rmiResult = userService.getUserById(id);
        if (rmiResult == null) return null;
        User apiUser = new User();
        apiUser.setId(rmiResult.getId());
        apiUser.setUsername(rmiResult.getUsername());
        apiUser.setPhone(rmiResult.getPhone());
        if (rmiResult.getUserType() != null) {
            apiUser.setUserType(User.UserType.valueOf(rmiResult.getUserType().name()));
        }
        return apiUser;
    }

    public User updateUser(int id, User user) throws Exception {
        // setter
        com.rsrmi.ride_sharing_api.rmi.models.User rmiUser = new com.rsrmi.ride_sharing_api.rmi.models.User();
        rmiUser.setId(user.getId());
        rmiUser.setUsername(user.getUsername());
        rmiUser.setPhone(user.getPhone());
        if (user.getUserType() != null) {
            rmiUser.setUserType(com.rsrmi.ride_sharing_api.rmi.models.User.UserType.valueOf(user.getUserType().name()));
        }
        // update
        com.rsrmi.ride_sharing_api.rmi.models.User updatedRmiUser = userService.updateUser(id, rmiUser);
        if (updatedRmiUser == null) return null;
        User apiUser = new User();
        apiUser.setId(updatedRmiUser.getId());
        apiUser.setUsername(updatedRmiUser.getUsername());
        apiUser.setPhone(updatedRmiUser.getPhone());
        if (updatedRmiUser.getUserType() != null) {
            apiUser.setUserType(User.UserType.valueOf(updatedRmiUser.getUserType().name()));
        }
        return apiUser;
    }
}
