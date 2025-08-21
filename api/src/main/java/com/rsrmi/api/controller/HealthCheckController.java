package com.rsrmi.api.controller;

import com.rsrmi.ride_sharing_api.rmi.interfaces.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import reactor.core.publisher.Mono;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Health", description = "Health Check endpoints")
public class HealthCheckController {

    @Autowired
    private UserService userService;

    @GetMapping("/health")
    public Mono<String> health() {
        return Mono.just("OK");
    }

    @GetMapping("/rmi/health")
    @Operation(summary = "RMI health-check", description = "Check RMI is running or not.")
    public Mono<String> rmiHealth() {
        try {
            boolean ok = userService.ping();
            return Mono.just(ok ? "RMI OK" : "RMI NOT OK");
        } catch (Exception e) {
            return Mono.just("RMI ERROR: " + e.getMessage());
        }
    }
    @GetMapping("/cors-test")
    @Operation(summary = "CORS test endpoint", description = "Simple endpoint to test CORS headers")
    public Mono<ResponseEntity<String>> corsTest() {
        return Mono.just(ResponseEntity.ok("CORS is working!"));
    }
    
}
