package com.rsrmi.api.controller;

import com.rsrmi.api.events.RideEvent;
import com.rsrmi.api.events.RideEventService;
import com.rsrmi.api.events.RideEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/rides")
public class RideEventController {
    private static final Logger logger = LoggerFactory.getLogger(RideEventController.class);
    private final RideEventService rideEventService;

    public RideEventController(RideEventService rideEventService) {
        this.rideEventService = rideEventService;
    }

    // Client subscribes to updates for a single ride id
    @GetMapping(value = "/{rideId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<RideEvent>> subscribeToRideEvents(
            @PathVariable Long rideId,
            @RequestParam(required = false) String token,
            ServerHttpRequest request) {
        
        // Log the subscription attempt
        logger.info("SSE subscription request for ride {} from {}", rideId, 
            request.getRemoteAddress());
        
        if (token != null) {
            logger.info("SSE subscription with token for ride {}", rideId);
        }
        
        return rideEventService.subscribeToRideEvents(rideId)
                .map(event -> {
                    logger.debug("Sending SSE event for ride {}: {}", rideId, event.getType());
                    return ServerSentEvent.builder(event)
                            .id(String.valueOf(System.currentTimeMillis()))
                            .event(event.getType().toString())
                            .build();
                })
                .doOnSubscribe(subscription -> logger.info("✅ New SSE subscription for ride {}", rideId))
                .doOnCancel(() -> logger.info("🔌 SSE subscription cancelled for ride {}", rideId))
                .doOnError(error -> logger.error("❌ SSE error for ride {}: {}", rideId, error.getMessage()));
    }

    // Publish driver location update
    @PostMapping("/{rideId}/events/driver-location")
    public void driverLocation(@PathVariable("rideId") Long rideId,
                               @RequestParam("lat") double lat,
                               @RequestParam("lng") double lng) {
        RideEvent event = new RideEvent(rideId, RideEventType.DRIVER_LOCATION);
        event.setLat(lat);
        event.setLng(lng);
        rideEventService.publish(event);
    }

    // Publish rider location update
    @PostMapping("/{rideId}/events/rider-location")
    public void riderLocation(@PathVariable("rideId") Long rideId,
                              @RequestParam("lat") double lat,
                              @RequestParam("lng") double lng) {
        RideEvent event = new RideEvent(rideId, RideEventType.RIDER_LOCATION);
        event.setLat(lat);
        event.setLng(lng);
        rideEventService.publish(event);
    }

    // Publish status update (e.g., ACCEPTED, DRIVER_EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED)
    @PostMapping("/{rideId}/events/status")
    public void status(@PathVariable("rideId") Long rideId,
                       @RequestParam("value") String value) {
        RideEvent event = new RideEvent(rideId, RideEventType.STATUS);
        event.setStatus(value);
        rideEventService.publish(event);
    }
}
