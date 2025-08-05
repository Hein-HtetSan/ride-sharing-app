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
}
