package com.rsrmi.api.controller;

import com.rsrmi.api.service.UserServiceRmiClient;
import com.rsrmi.api.service.LocationServiceRmiClient;
import com.rsrmi.api.model.User;
import com.rsrmi.api.model.UserLocation;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import reactor.core.publisher.Mono;

import com.rsrmi.api.dto.ApiResponse;

@SecurityScheme(
    name = "bearerAuth",
    type = io.swagger.v3.oas.annotations.enums.SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT"
)
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User", description = "User endpoints")
public class UserController {
    @Autowired
    private UserServiceRmiClient userServiceRmiClient;

    @Autowired
    private LocationServiceRmiClient locationServiceRmiClient;

    // Register a user via RMI
    @PostMapping("/register")
    @Operation(summary = "Register a new user via RMI", description = "Registers a user using the RMI microservice.")
    public Mono<ResponseEntity<ApiResponse>> registerUser(@org.springframework.web.bind.annotation.RequestBody User user) {
        return Mono.fromCallable(() -> {
            try {
                if (user.getUserType() != null && user.getUserType() != User.UserType.DRIVER) {
                    user.setCarType(null);
                    user.setLicenseNumber(null);
                }
                boolean success = userServiceRmiClient.registerUser(user);
                if (success) {
                    return ResponseEntity.ok(new ApiResponse(true, "User registered successfully via RMI"));
                } else {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse(false, "Registration failed"));
                }
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse(false, "Error: " + e.getMessage()));
            }
        });
    }

    // Login user
    @PostMapping("/login")
    @Operation(summary = "Login user via RMI", description = "Login a user using the RMI microservice and receive a JWT token.")
    public Mono<ResponseEntity<ApiResponse>> loginUser(
        @RequestParam String phone,
        @RequestParam String password
    ) {
        return Mono.fromCallable(() -> {
            try {
                User user = userServiceRmiClient.loginUser(phone, password);
                if (user != null) {
                    // Generate JWT
                    String token = com.rsrmi.api.util.JwtUtil.generateToken(user.getId(), user.getPhone(), user.getUserType() != null ? user.getUserType().name() : "");
                    // Return token and user info
                    java.util.Map<String, Object> data = new java.util.HashMap<>();
                    data.put("user", user);
                    data.put("token", token);
                    return ResponseEntity.ok(new ApiResponse(true, "Login successful", data));
                } else {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(new ApiResponse(false, "Invalid phone or password"));
                }
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse(false, "Error: " + e.getMessage()));
            }
        });
    }

    @GetMapping("/get")
    @Operation(
        summary = "Get user by id", 
        description = "Get user object by user id via RMI (JWT protected)",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public Mono<ResponseEntity<ApiResponse>> getById(@RequestParam int id) {
        return Mono.fromCallable(() -> {
            try {
                User user = userServiceRmiClient.getById(id);
                if (user != null) {
                    return ResponseEntity.ok(new ApiResponse(true, "User is existed", user));
                } else {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse(false, "User doesn't exist"));
                }
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse(false, "Error: " + e.getMessage()));
            }
        });
    }

    @PutMapping("/update")
    @Operation(
        summary = "Update user by id",
        description = "Update user object by user id via RMI (JWT protected)",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public Mono<ResponseEntity<ApiResponse>> updateUser(
        @RequestParam int id,
        @RequestParam String username,
        @RequestParam String phone
    ) {
        return Mono.fromCallable(() -> {
            try {
                // Check if user exists
                User existing = userServiceRmiClient.getById(id);
                if (existing == null) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse(false, "User doesn't exist"));
                }
                // Only update allowed fields
                existing.setUsername(username);
                existing.setPhone(phone);
                User updated = userServiceRmiClient.updateUser(id, existing);
                if (updated != null) {
                    return ResponseEntity.ok(new ApiResponse(true, "User updated successfully", updated));
                } else {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(new ApiResponse(false, "Failed to update user"));
                }
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse(false, "Error: " + e.getMessage()));
            }
        });
    }

    @PutMapping("/update/location")
    @Operation(
        summary = "Update user location",
        description = "Update user's current location (JWT protected)",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public Mono<ResponseEntity<ApiResponse>> updateLocation(
        @RequestParam int userId,
        @org.springframework.web.bind.annotation.RequestBody UserLocation userLocation
    ) {
        return Mono.fromCallable(() -> {
            try {
                // Set the current time if not provided
                if (userLocation.getLastUpdated() == null) {
                    userLocation.setLastUpdated(LocalDateTime.now());
                }
                
                // Ensure userId is set correctly
                userLocation.setUserId(userId);
                
                boolean isUserLocationUpdated = locationServiceRmiClient.updateUserLocation(
                    userId,
                    userLocation
                );
                if (isUserLocationUpdated) {
                    return ResponseEntity.ok(new ApiResponse(true, "Location updated successfully"));
                } else {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse(false, "Failed to update location"));
                }
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse(false, "Error: " + e.getMessage()));
            }
        });
    }

    @GetMapping("/{userId}/get/location")
    @Operation(
        summary = "Get user location",
        description = "Get user's current location (JWT protected)",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public Mono<ResponseEntity<ApiResponse>> getUserLocation(@PathVariable int userId) {
        return Mono.fromCallable(() -> {
            try {
                UserLocation userLocation = locationServiceRmiClient.getUserLocation(userId);
                if (userLocation != null) {
                    return ResponseEntity.ok(new ApiResponse(true, "Location retrieved successfully", userLocation));
                } else {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(new ApiResponse(false, "User location not found"));
                }
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse(false, "Error: " + e.getMessage()));
            }
        });
    }
}
