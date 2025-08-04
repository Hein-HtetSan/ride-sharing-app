package com.rsrmi.api.service;

// TODO: Add RMI project as dependency or copy interfaces
// import com.rsrmi.ride_sharing_api.rmi.interfaces.UserService;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
// TODO: Uncomment imports when RMI interfaces are available
// import java.rmi.registry.LocateRegistry;
// import java.rmi.registry.Registry;

@Service
public class UserServiceRmiClient {
    // TODO: Uncomment when RMI interfaces are available
    // private UserService userService;

    @PostConstruct
    public void init() {
        try {
            // TODO: Uncomment when RMI interfaces are available
            // Registry registry = LocateRegistry.getRegistry("localhost", 1099);
            // userService = (UserService) registry.lookup("UserService");
        } catch (Exception e) {
            throw new RuntimeException("Failed to connect to RMI server", e);
        }
    }

    // TODO: Uncomment when RMI interfaces are available
    /*
    public UserService getUserService() {
        return userService;
    }
    */
}
