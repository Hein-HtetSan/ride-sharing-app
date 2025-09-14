package com.rsrmi.api.events;

import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RideEventService {
    private final Map<Long, Sinks.Many<RideEvent>> sinksByRide = new ConcurrentHashMap<>();

    private Sinks.Many<RideEvent> getSink(Long rideId) {
        return sinksByRide.computeIfAbsent(rideId, id ->
            Sinks.many().multicast().onBackpressureBuffer(256, false)
        );
    }

    public void publish(RideEvent event) {
        if (event == null || event.getRideId() == null) return;
        getSink(event.getRideId()).tryEmitNext(event);
    }

    public Flux<RideEvent> subscribeToRideEvents(Long rideId) {
        // Heartbeat to keep connections alive across proxies
        Flux<RideEvent> heartbeat = Flux.interval(Duration.ofSeconds(15))
            .map(i -> {
                RideEvent hb = new RideEvent(rideId, RideEventType.STATUS);
                hb.setStatus("HEARTBEAT");
                return hb;
            });
        return getSink(rideId).asFlux().mergeWith(heartbeat);
    }
}
