package com.rsrmi.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.rsrmi.ride_sharing_api.rmi.interfaces.UserService;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

@Configuration
public class RmiClientConfig {
    @Bean
    public UserService userService() throws Exception {
        Registry registry = LocateRegistry.getRegistry("localhost", 1099); // or use @Value for host/port
        return (UserService) registry.lookup("UserService");
    }
}
