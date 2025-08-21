package com.rsrmi.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import com.rsrmi.ride_sharing_api.rmi.interfaces.UserService;
import com.rsrmi.ride_sharing_api.rmi.interfaces.LocationService;
import com.rsrmi.ride_sharing_api.rmi.interfaces.RideService;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

@Configuration
public class RmiClientConfig {
    @Value("${RMI_HOST:rmi-server}")
    private String rmiHost;

    @Value("${RMI_PORT:1099}")
    private int rmiPort;

    @Bean
    public UserService userService() throws Exception {
        Registry registry = LocateRegistry.getRegistry(rmiHost, rmiPort); // or use @Value for host/port
        return (UserService) registry.lookup("UserService");
    }

    @Bean
    public LocationService locationService() throws Exception {
        Registry registry = LocateRegistry.getRegistry(rmiHost, rmiPort);
        return (LocationService) registry.lookup("LocationService");
    }

    @Bean
    public RideService rideService() throws Exception {
        Registry registry = LocateRegistry.getRegistry(rmiHost, rmiPort);
        return (RideService) registry.lookup("RideService");
    }
}
