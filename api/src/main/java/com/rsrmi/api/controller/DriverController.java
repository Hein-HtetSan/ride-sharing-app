package com.rsrmi.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.*;

@RestController
@RequestMapping("/api/v1/drivers")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class DriverController {

    @GetMapping("/nearby")
    public Mono<ResponseEntity<?>> getNearbyDrivers(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5") int radius) {
        
        // Mock nearby drivers data
        List<Map<String, Object>> drivers = Arrays.asList(
            createMockDriver("1", "John Doe", "Toyota Camry", 4.8, 2),
            createMockDriver("2", "Jane Smith", "Honda Civic", 4.9, 3),
            createMockDriver("3", "Mike Johnson", "Nissan Altima", 4.7, 5)
        );
        
        return Mono.just(ResponseEntity.ok(drivers));
    }

    private Map<String, Object> createMockDriver(String id, String username, String vehicleType, double rating, int minutesAway) {
        Map<String, Object> driver = new HashMap<>();
        driver.put("id", id);
        driver.put("username", username);
        driver.put("vehicleType", vehicleType);
        driver.put("rating", rating);
        driver.put("minutesAway", minutesAway);
        driver.put("isAvailable", true);
        
        // Mock location near the requested location
        Map<String, Object> location = new HashMap<>();
        location.put("lat", 16.8661 + (Math.random() - 0.5) * 0.01); // Slightly randomize around Yangon
        location.put("lng", 96.1951 + (Math.random() - 0.5) * 0.01);
        location.put("address", "Near your location");
        driver.put("currentLocation", location);
        
        return driver;
    }
}
