package com.rsrmi.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.*;

@RestController
@RequestMapping("/api/v1/rides")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class RideController {

    @GetMapping("/current")
    public Mono<ResponseEntity<?>> getCurrentRide() {
        // For now, return null to indicate no active ride
        // This will be implemented with actual database logic later
        return Mono.just(ResponseEntity.ok(null));
    }

    @PostMapping("/request")
    public Mono<ResponseEntity<?>> requestRide(@RequestBody Map<String, Object> rideRequest) {
        // Mock ride creation response
        Map<String, Object> ride = new HashMap<>();
        ride.put("id", UUID.randomUUID().toString());
        ride.put("status", "requested");
        ride.put("pickupLocation", rideRequest.get("pickupLocation"));
        ride.put("destination", rideRequest.get("destination"));
        ride.put("estimatedFare", rideRequest.get("estimatedFare"));
        ride.put("createdAt", new Date());
        
        return Mono.just(ResponseEntity.status(HttpStatus.CREATED).body(ride));
    }

    @PostMapping("/{rideId}/accept")
    public Mono<ResponseEntity<?>> acceptRide(@PathVariable String rideId) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", rideId);
        response.put("status", "accepted");
        response.put("message", "Ride accepted successfully");
        
        return Mono.just(ResponseEntity.ok(response));
    }

    @PutMapping("/{rideId}/status")
    public Mono<ResponseEntity<?>> updateRideStatus(
            @PathVariable String rideId, 
            @RequestBody Map<String, String> statusUpdate) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", rideId);
        response.put("status", statusUpdate.get("status"));
        response.put("updatedAt", new Date());
        
        return Mono.just(ResponseEntity.ok(response));
    }

    @GetMapping("/history")
    public Mono<ResponseEntity<?>> getRideHistory() {
        // Return empty history for now
        return Mono.just(ResponseEntity.ok(Collections.emptyList()));
    }
}
