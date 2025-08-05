package com.rsrmi.api.controller;

import com.rsrmi.api.service.UserServiceRmiClient;
import com.rsrmi.api.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import com.rsrmi.api.dto.ApiResponse;

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
}
