package com.rsrmi.api.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import com.rsrmi.api.dto.ApiResponse;
import com.rsrmi.api.model.User;
import com.rsrmi.api.service.UserServiceRmiClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;

@SecurityScheme(
    name = "bearerAuth",
    type = io.swagger.v3.oas.annotations.enums.SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT"
)
@RestController
@RequestMapping("/api/v1/drivers")
@Tag(name = "Driver", description = "Driver endpoints")
public class DriverController {

    @Autowired
    private UserServiceRmiClient userServiceRmiClient;

    // Register a user via RMI
    @PostMapping("/register")
    @Operation(summary = "Register a new driver via RMI", description = "Registers a driver using the RMI microservice.")
    public Mono<ResponseEntity<ApiResponse>> registerUser(@org.springframework.web.bind.annotation.RequestBody User user) {
        return Mono.fromCallable(() -> {
            try {
                user.setUserType(User.UserType.DRIVER);
                boolean success = userServiceRmiClient.registerUser(user);
                if (success) {
                    return ResponseEntity.ok(new ApiResponse(true, "Driver registered successfully via RMI"));
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

    // Login driver
    @PostMapping("/login")
    @Operation(summary = "Login driver via RMI", description = "Login a driver using the RMI microservice and receive a JWT token.")
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
        summary = "Get driver by id", 
        description = "Get driver object by driver id via RMI (JWT protected)",
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
        summary = "Update driver by id",
        description = "Update driver object by driver id via RMI (JWT protected)",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public Mono<ResponseEntity<ApiResponse>> updateUser(
        @RequestParam int id,
        @RequestParam String username,
        @RequestParam String phone
    ) {
        return Mono.fromCallable(() -> {
            try {
                // Check if driver exists
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

    
}
