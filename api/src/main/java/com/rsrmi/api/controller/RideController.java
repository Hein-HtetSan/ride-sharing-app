package com.rsrmi.api.controller;

import com.rsrmi.api.model.Ride;
import com.rsrmi.api.service.RideServiceRmiClient;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.rmi.RemoteException;
import java.util.*;

@SecurityScheme(
    name = "bearerAuth",
    type = io.swagger.v3.oas.annotations.enums.SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT"
)
@RestController
@RequestMapping("/api/v1/rides")
@Tag(name = "Ride Controller", description = "Ride API endpoints")
public class RideController {

    @Autowired
    private RideServiceRmiClient rideServiceRmiClient;

    @Operation(
        summary = "Get Current Active Ride",
        description = "Retrieves the current active ride for a specific user (rider or driver). " +
                     "Returns the ride that is not yet completed or cancelled. " +
                     "Used by both riders to check their current trip status and drivers to see their active assignment.",
        tags = {"Ride Management"},
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Current ride retrieved successfully",
                    content = @Content(mediaType = "application/json", 
                    schema = @Schema(implementation = Ride.class))),
        @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content(mediaType = "application/json"))
    })
    @GetMapping("/current")
    public Mono<ResponseEntity<?>> getCurrentRide(
            @Parameter(description = "User ID (rider or driver)", required = true, example = "123")
            @RequestParam int userId) {
        try {
            Ride currentRide = rideServiceRmiClient.getCurrentRide(userId);
            return Mono.just(ResponseEntity.ok(currentRide));
        } catch (RemoteException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to get current ride: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error));
        }
    }

    @Operation(
        summary = "Request a New Ride",
        description = "Creates a new ride request from a rider. The ride will be created with PENDING status " +
                     "and made available to nearby drivers. Requires pickup and destination coordinates.",
        tags = {"Ride Management"},
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Ride requested successfully",
                    content = @Content(mediaType = "application/json",
                    examples = @ExampleObject(value = "{\"success\": true, \"message\": \"Ride requested successfully\", \"status\": \"PENDING\"}"))),
        @ApiResponse(responseCode = "400", description = "Invalid request parameters"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/request")
    public Mono<ResponseEntity<?>> requestRide(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Ride request details including rider ID and location coordinates",
                required = true,
                content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = "{\n" +
                    "  \"riderId\": 123,\n" +
                    "  \"pickupLat\": 40.7128,\n" +
                    "  \"pickupLng\": -74.0060,\n" +
                    "  \"destLat\": 40.7589,\n" +
                    "  \"destLng\": -73.9851\n" +
                    "}"))
            )
            @RequestBody Map<String, Object> rideRequest) {
        try {
            int riderId = (Integer) rideRequest.get("riderId");
            double pickupLat = ((Number) rideRequest.get("pickupLat")).doubleValue();
            double pickupLng = ((Number) rideRequest.get("pickupLng")).doubleValue();
            double destLat = ((Number) rideRequest.get("destLat")).doubleValue();
            double destLng = ((Number) rideRequest.get("destLng")).doubleValue();
            
            int rideId = rideServiceRmiClient.requestRide(riderId, pickupLat, pickupLng, destLat, destLng);
            
            if (rideId > 0) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Ride requested successfully");
                response.put("status", "PENDING");
                response.put("data", rideId);
                return Mono.just(ResponseEntity.status(HttpStatus.CREATED).body(response));
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Failed to request ride");
                return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
            }
        } catch (RemoteException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to request ride: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Invalid request parameters: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
        }
    }

    @Operation(
        summary = "Accept a Ride Request",
        description = "Allows a driver to accept a pending ride request. Changes the ride status from PENDING to ACCEPTED " +
                     "and assigns the driver to the ride. Only pending rides can be accepted.",
        tags = {"Ride Management"},
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Ride accepted successfully",
                    content = @Content(mediaType = "application/json",
                    examples = @ExampleObject(value = "{\"rideId\": 456, \"driverId\": 789, \"status\": \"ACCEPTED\", \"message\": \"Ride accepted successfully\"}"))),
        @ApiResponse(responseCode = "400", description = "Ride not available or invalid parameters"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/{rideId}/accept")
    public Mono<ResponseEntity<?>> acceptRide(
            @Parameter(description = "Unique identifier of the ride to accept", required = true, example = "456")
            @PathVariable int rideId, 
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Driver information for accepting the ride",
                required = true,
                content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = "{\"driverId\": 789}"))
            )
            @RequestBody Map<String, Object> request) {
        try {
            int driverId = (Integer) request.get("driverId");
            int result = rideServiceRmiClient.acceptRide(driverId, rideId);
            
            if (result > 0) {
                Map<String, Object> response = new HashMap<>();
                response.put("rideId", rideId);
                response.put("driverId", driverId);
                response.put("status", "ACCEPTED");
                response.put("message", "Ride accepted successfully");
                return Mono.just(ResponseEntity.ok(response));
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Failed to accept ride - ride may not be available");
                return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
            }
        } catch (RemoteException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to accept ride: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Invalid request parameters: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
        }
    }

    @Operation(
        summary = "Update Ride Status",
        description = "Updates the status of an existing ride through various actions during the ride lifecycle. " +
                     "Supports status transitions: start_drive_to_pickup, arrived_at_pickup, start_ride, complete, cancel. " +
                     "Each action validates the current status before applying the change.",
        tags = {"Ride Management"},
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Ride status updated successfully",
                    content = @Content(mediaType = "application/json",
                    examples = @ExampleObject(value = "{\"rideId\": 456, \"action\": \"start_drive_to_pickup\", \"success\": true, \"updatedAt\": \"2025-08-08T10:30:00Z\"}"))),
        @ApiResponse(responseCode = "400", description = "Invalid action or ride status transition"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PutMapping("/{rideId}/status")
    public Mono<ResponseEntity<?>> updateRideStatus(
            @Parameter(description = "Unique identifier of the ride to update", required = true, example = "456")
            @PathVariable int rideId, 
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Action to perform on the ride. Valid actions: start_drive_to_pickup, arrived_at_pickup, start_ride, complete, cancel",
                required = true,
                content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = "{\"action\": \"start_drive_to_pickup\"}"))
            )
            @RequestBody Map<String, String> statusUpdate) {
        try {
            String action = statusUpdate.get("action");
            boolean success = false;
            
            switch (action.toLowerCase()) {
                case "start_drive_to_pickup":
                    success = rideServiceRmiClient.startDriveToPickup(rideId);
                    break;
                case "arrived_at_pickup":
                    success = rideServiceRmiClient.arrivedAtPickup(rideId);
                    break;
                case "start_ride":
                    success = rideServiceRmiClient.startRideToDestination(rideId);
                    break;
                case "complete":
                    success = rideServiceRmiClient.completeRide(rideId);
                    break;
                case "cancel":
                    success = rideServiceRmiClient.cancelRide(rideId);
                    break;
                default:
                    Map<String, String> error = new HashMap<>();
                    error.put("error", "Invalid action: " + action);
                    return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
            }
            
            if (success) {
                Map<String, Object> response = new HashMap<>();
                response.put("rideId", rideId);
                response.put("action", action);
                response.put("success", true);
                response.put("updatedAt", new Date());
                return Mono.just(ResponseEntity.ok(response));
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Failed to update ride status");
                return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
            }
        } catch (RemoteException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update ride status: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Invalid request parameters: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
        }
    }

    @Operation(
        summary = "Get User's Ride History",
        description = "Retrieves the complete ride history for a specific user (rider or driver). " +
                     "Returns all rides associated with the user, ordered by creation date (most recent first). " +
                     "Includes rides in all statuses: completed, cancelled, and ongoing.",
        tags = {"Ride Information"},
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Ride history retrieved successfully",
                    content = @Content(mediaType = "application/json", 
                    schema = @Schema(type = "array", implementation = Ride.class))),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/history")
    public Mono<ResponseEntity<?>> getRideHistory(
            @Parameter(description = "User ID to get ride history for", required = true, example = "123")
            @RequestParam int userId) {
        try {
            List<Ride> rideHistory = rideServiceRmiClient.getRideHistory(userId);
            return Mono.just(ResponseEntity.ok(rideHistory));
        } catch (RemoteException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to get ride history: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error));
        }
    }

    @Operation(
        summary = "Get Pending Rides Near Driver",
        description = "Retrieves all pending ride requests within a specified radius of the driver's current location. " +
                     "Used by drivers to find nearby ride requests they can accept. " +
                     "Distance calculation is performed using geographic coordinates and radius in kilometers.",
        tags = {"Driver Operations"},
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Pending rides retrieved successfully",
                    content = @Content(mediaType = "application/json", 
                    schema = @Schema(type = "array", implementation = Ride.class))),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/pending")
    public Mono<ResponseEntity<?>> getPendingRides(
            @Parameter(description = "Driver's current latitude", required = true, example = "40.7128")
            @RequestParam double driverLat, 
            @Parameter(description = "Driver's current longitude", required = true, example = "-74.0060")
            @RequestParam double driverLng,
            @Parameter(description = "Search radius in kilometers", required = false, example = "10.0")
            @RequestParam(defaultValue = "10.0") double radius) {
        try {
            List<Ride> pendingRides = rideServiceRmiClient.getPendingRides(driverLat, driverLng, radius);
            return Mono.just(ResponseEntity.ok(pendingRides));
        } catch (RemoteException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to get pending rides: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error));
        }
    }

    @Operation(
        summary = "Get Ride Status",
        description = "Retrieves the current status of a specific ride by its ID. " +
                     "Returns one of the following statuses: PENDING, ACCEPTED, DRIVER_EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED. " +
                     "Used for real-time status tracking and updates.",
        tags = {"Ride Information"},
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Ride status retrieved successfully",
                    content = @Content(mediaType = "application/json",
                    examples = @ExampleObject(value = "{\"rideId\": 456, \"status\": \"IN_PROGRESS\"}"))),
        @ApiResponse(responseCode = "404", description = "Ride not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/{rideId}/status")
    public Mono<ResponseEntity<?>> getRideStatus(
            @Parameter(description = "Unique identifier of the ride", required = true, example = "456")
            @PathVariable int rideId) {
        try {
            String status = rideServiceRmiClient.getRideStatus(rideId);
            Map<String, Object> response = new HashMap<>();
            response.put("rideId", rideId);
            response.put("status", status);
            return Mono.just(ResponseEntity.ok(response));
        } catch (RemoteException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to get ride status: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error));
        }
    }

    @Operation(
        summary = "Cancel a Ride",
        description = "Cancels an existing ride that is not yet completed. " +
                     "Can be called by either rider or driver to cancel a ride in any status except COMPLETED. " +
                     "Once cancelled, the ride status becomes CANCELLED and cannot be reversed.",
        tags = {"Ride Management"},
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Ride cancelled successfully",
                    content = @Content(mediaType = "application/json",
                    examples = @ExampleObject(value = "{\"rideId\": 456, \"status\": \"CANCELLED\", \"message\": \"Ride cancelled successfully\"}"))),
        @ApiResponse(responseCode = "400", description = "Ride cannot be cancelled (already completed)"),
        @ApiResponse(responseCode = "404", description = "Ride not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/{rideId}/cancel")
    public Mono<ResponseEntity<?>> cancelRide(
            @Parameter(description = "Unique identifier of the ride to cancel", required = true, example = "456")
            @PathVariable int rideId) {
        try {
            boolean success = rideServiceRmiClient.cancelRide(rideId);
            if (success) {
                Map<String, Object> response = new HashMap<>();
                response.put("rideId", rideId);
                response.put("status", "CANCELLED");
                response.put("message", "Ride cancelled successfully");
                return Mono.just(ResponseEntity.ok(response));
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Failed to cancel ride");
                return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
            }
        } catch (RemoteException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to cancel ride: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error));
        }
    }

    @Operation(
        summary = "Update Driver Location",
        description = "Updates the real-time location of a driver for tracking purposes. " +
                     "Used during active rides to provide live location updates to riders. " +
                     "Location data is stored and can be used for ETA calculations and route optimization.",
        tags = {"Driver Operations", "Location Tracking"},
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Driver location updated successfully",
                    content = @Content(mediaType = "application/json",
                    examples = @ExampleObject(value = "{\"driverId\": 789, \"latitude\": 40.7500, \"longitude\": -73.9500, \"updatedAt\": \"2025-08-08T10:30:00Z\"}"))),
        @ApiResponse(responseCode = "400", description = "Invalid location parameters"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/driver/{driverId}/location")
    public Mono<ResponseEntity<?>> updateDriverLocation(
            @Parameter(description = "Unique identifier of the driver", required = true, example = "789")
            @PathVariable int driverId, 
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "New location coordinates for the driver",
                required = true,
                content = @Content(mediaType = "application/json",
                examples = @ExampleObject(value = "{\n" +
                    "  \"latitude\": 40.7500,\n" +
                    "  \"longitude\": -73.9500\n" +
                    "}"))
            )
            @RequestBody Map<String, Object> locationUpdate) {
        try {
            double lat = ((Number) locationUpdate.get("latitude")).doubleValue();
            double lng = ((Number) locationUpdate.get("longitude")).doubleValue();
            
            boolean success = rideServiceRmiClient.updateDriverLocation(driverId, lat, lng);
            if (success) {
                Map<String, Object> response = new HashMap<>();
                response.put("driverId", driverId);
                response.put("latitude", lat);
                response.put("longitude", lng);
                response.put("updatedAt", new Date());
                return Mono.just(ResponseEntity.ok(response));
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Failed to update driver location");
                return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
            }
        } catch (RemoteException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update driver location: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Invalid location parameters: " + e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
        }
    }
}
