package com.rsrmi.api.events;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class RideEvent {
    private Long rideId;
    private RideEventType type;
    private Double lat;
    private Double lng;
    private String status;
    private Long timestamp;

    public RideEvent() {}

    public RideEvent(Long rideId, RideEventType type) {
        this.rideId = rideId;
        this.type = type;
        this.timestamp = System.currentTimeMillis();
    }

    public Long getRideId() { return rideId; }
    public void setRideId(Long rideId) { this.rideId = rideId; }

    public RideEventType getType() { return type; }
    public void setType(RideEventType type) { this.type = type; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
}
