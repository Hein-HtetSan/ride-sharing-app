package com.rsrmi.api.controller;

import com.rsrmi.api.service.UserServiceRmiClient;
import com.rsrmi.api.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

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

    // Register a user via RMI
    @PostMapping("/register")
    @Operation(summary = "Register a new user via RMI", description = "Registers a user using the RMI microservice.")
    public ResponseEntity<ApiResponse> registerUser(@org.springframework.web.bind.annotation.RequestBody User user) {
        try {
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
    }

    // Login user
    @PostMapping("/login")
    @Operation(summary = "Login user via RMI", description = "Login a user using the RMI microservice and receive a JWT token.")
    public ResponseEntity<ApiResponse> loginUser(
        @RequestParam String phone,
        @RequestParam String password
    ) {
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
    }

    @GetMapping("/get")
    @Operation(
        summary = "Get user by id", 
        description = "Get user object by user id via RMI (JWT protected)",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<ApiResponse> getById(@RequestParam int id) {
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
    }

    @PostMapping("/update")
    @Operation(
        summary = "Update user by id",
        description = "Update user object by user id via RMI (JWT protected)",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<ApiResponse> updateUser(
        @RequestParam int id,
        @RequestParam String username,
        @RequestParam String phone
    ) {
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
    }

    @PutMapping("/location")
    @Operation(
        summary = "Update user location",
        description = "Update user's current location (JWT protected)",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<ApiResponse> updateLocation(@org.springframework.web.bind.annotation.RequestBody java.util.Map<String, Object> locationData) {
        try {
            // For now, just return success - this will be implemented with actual database logic later
            return ResponseEntity.ok(new ApiResponse(true, "Location updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Error: " + e.getMessage()));
        }
    }

    @GetMapping("/{userId}/location")
    @Operation(
        summary = "Get user location",
        description = "Get user's current location (JWT protected)",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<ApiResponse> getUserLocation(@PathVariable String userId) {
        try {
            // Mock location data
            java.util.Map<String, Object> location = new java.util.HashMap<>();
            location.put("lat", 16.8661);
            location.put("lng", 96.1951);
            location.put("address", "Yangon, Myanmar");
            location.put("updatedAt", new java.util.Date());
            
            return ResponseEntity.ok(new ApiResponse(true, "Location retrieved successfully", location));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Error: " + e.getMessage()));
        }
    }
}
