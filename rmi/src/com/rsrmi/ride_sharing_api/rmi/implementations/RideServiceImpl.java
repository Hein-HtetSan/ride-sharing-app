package com.rsrmi.ride_sharing_api.rmi.implementations;

import com.rsrmi.ride_sharing_api.rmi.interfaces.RideService;
import com.rsrmi.ride_sharing_api.rmi.models.Ride;
import java.rmi.RemoteException;
import java.rmi.server.UnicastRemoteObject;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.ArrayList;
import com.rsrmi.ride_sharing_api.rmi.config.DatabaseConfig;

public class RideServiceImpl extends UnicastRemoteObject implements RideService {
    private final DatabaseConfig dbConfig;

    public RideServiceImpl() throws RemoteException {
        super();
        this.dbConfig = DatabaseConfig.getInstance();
        System.out.println("✅ RideService implementation initialized successfully");
    }

    // Ride request and matching
    @Override
    public int requestRide(
        int riderId,
        double pickupLat, double pickupLng,
        double destLat, double destLng
    ) throws RemoteException {
        System.out.println("🚗 requestRide called - RiderID: " + riderId + 
                          ", Pickup: (" + pickupLat + ", " + pickupLng + ")" +
                          ", Destination: (" + destLat + ", " + destLng + ")");
        
        String sql = "INSERT INTO rides (rider_id, pickup_latitude, pickup_longitude, " +
                    "destination_latitude, destination_longitude, status, created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, 'PENDING', NOW(), NOW()) RETURNING id";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, riderId);
            pstmt.setDouble(2, pickupLat);
            pstmt.setDouble(3, pickupLng);
            pstmt.setDouble(4, destLat);
            pstmt.setDouble(5, destLng);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    int rideId = rs.getInt("id");
                    System.out.println("✅ Ride request successful for rider " + riderId + ", ride ID: " + rideId);
                    return rideId;
                } else {
                    System.out.println("❌ No ride ID returned from INSERT");
                    return 0;
                }
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to request ride for rider " + riderId + ": " + e.getMessage());
            throw new RemoteException("Failed to request ride: " + e.getMessage(), e);
        }
    }

    @Override
    public List<Ride> getPendingRides(
        double driverLat, double driverLng, double radius
    ) throws RemoteException {
        System.out.println("📍 getPendingRides called - Driver location: (" + driverLat + ", " + driverLng + "), Radius: " + radius + "km");
        
        String sql = "SELECT r.*, u.username as rider_username, u.phone as rider_phone " +
                    "FROM rides r " +
                    "JOIN users u ON r.rider_id = u.id " +
                    "WHERE r.status = 'PENDING' " +
                    "AND SQRT(POWER(r.pickup_latitude - ?, 2) + POWER(r.pickup_longitude - ?, 2)) <= ?";

        List<Ride> pendingRides = new ArrayList<>();
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setDouble(1, driverLat);
            pstmt.setDouble(2, driverLng);
            pstmt.setDouble(3, radius);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    pendingRides.add(mapResultSetToRide(rs));
                }
            }
            
            System.out.println("✅ Found " + pendingRides.size() + " pending rides within " + radius + "km radius");
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to get pending rides: " + e.getMessage());
            throw new RemoteException("Failed to get pending rides: " + e.getMessage(), e);
        }
        
        return pendingRides;
    }

    // ride accept and status
    @Override
    public int acceptRide(int driverId, int rideId) throws RemoteException {
        System.out.println("🤝 acceptRide called - DriverID: " + driverId + ", RideID: " + rideId);
        
        String sql = "UPDATE rides SET driver_id = ?, status = 'ACCEPTED', " +
                    "accepted_at = NOW(), updated_at = NOW() " +
                    "WHERE id = ? AND status = 'PENDING'";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, driverId);
            pstmt.setInt(2, rideId);
            
            int result = pstmt.executeUpdate();
            boolean success = result > 0;
            
            if (success) {
                System.out.println("✅ Ride " + rideId + " accepted successfully by driver " + driverId);
                return rideId;
            } else {
                System.out.println("❌ Failed to accept ride " + rideId + " - ride may not be pending or not exist");
                return 0;
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to accept ride " + rideId + ": " + e.getMessage());
            throw new RemoteException("Failed to accept ride: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean cancelRide(int rideId) throws RemoteException {
        System.out.println("❌ cancelRide called - RideID: " + rideId);
        
        String sql = "UPDATE rides SET status = 'CANCELLED', updated_at = NOW() " +
                    "WHERE id = ? AND status NOT IN ('COMPLETED', 'CANCELLED')";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, rideId);
            
            int result = pstmt.executeUpdate();
            boolean success = result > 0;
            
            System.out.println("✅ Ride " + rideId + " " + (success ? "cancelled successfully" : "cancellation failed - may be already completed/cancelled"));
            return success;
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to cancel ride " + rideId + ": " + e.getMessage());
            throw new RemoteException("Failed to cancel ride: " + e.getMessage(), e);
        }
    }

    // ride status updates
    @Override
    public boolean startDriveToPickup(int rideId) throws RemoteException {
        System.out.println("🚗➡️ startDriveToPickup called - RideID: " + rideId);
        
        String sql = "UPDATE rides SET status = 'DRIVER_EN_ROUTE', updated_at = NOW() " +
                    "WHERE id = ? AND status = 'ACCEPTED'";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, rideId);
            
            int result = pstmt.executeUpdate();
            boolean success = result > 0;
            
            System.out.println("✅ Ride " + rideId + " " + (success ? "driver started driving to pickup" : "failed to start drive - ride may not be accepted"));
            return success;
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to start drive to pickup for ride " + rideId + ": " + e.getMessage());
            throw new RemoteException("Failed to start drive to pickup: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean arrivedAtPickup(int rideId) throws RemoteException {
        System.out.println("📍 arrivedAtPickup called - RideID: " + rideId);
        
        String sql = "UPDATE rides SET status = 'ARRIVED', updated_at = NOW() " +
                    "WHERE id = ? AND status = 'DRIVER_EN_ROUTE'";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, rideId);
            
            int result = pstmt.executeUpdate();
            boolean success = result > 0;
            
            System.out.println("✅ Ride " + rideId + " " + (success ? "driver arrived at pickup" : "failed to update arrival - driver may not be en route"));
            return success;
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to update arrival at pickup for ride " + rideId + ": " + e.getMessage());
            throw new RemoteException("Failed to update arrival at pickup: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean startRideToDestination(int rideId) throws RemoteException {
        System.out.println("🚗🎯 startRideToDestination called - RideID: " + rideId);
        
        String sql = "UPDATE rides SET status = 'IN_PROGRESS', started_at = NOW(), updated_at = NOW() " +
                    "WHERE id = ? AND status = 'ARRIVED'";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, rideId);
            
            int result = pstmt.executeUpdate();
            boolean success = result > 0;
            
            System.out.println("✅ Ride " + rideId + " " + (success ? "started journey to destination" : "failed to start ride - driver may not have arrived"));
            return success;
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to start ride to destination for ride " + rideId + ": " + e.getMessage());
            throw new RemoteException("Failed to start ride to destination: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean completeRide(int rideId) throws RemoteException {
        System.out.println("🏁 completeRide called - RideID: " + rideId);
        
        String sql = "UPDATE rides SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() " +
                    "WHERE id = ? AND status = 'IN_PROGRESS'";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, rideId);
            
            int result = pstmt.executeUpdate();
            boolean success = result > 0;
            
            System.out.println("✅ Ride " + rideId + " " + (success ? "completed successfully!" : "failed to complete - ride may not be in progress"));
            return success;
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to complete ride " + rideId + ": " + e.getMessage());
            throw new RemoteException("Failed to complete ride: " + e.getMessage(), e);
        }
    }

    // real-time tracking
    @Override
    public boolean updateDriverLocation(int driverId, double lat, double lng) throws RemoteException {
        System.out.println("📍 updateDriverLocation called with driverId=" + driverId + ", lat=" + lat + ", lng=" + lng);
        
        // First verify the user is a driver
        String userCheckSql = "SELECT user_type FROM users WHERE id = ?";
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement userCheckPstmt = conn.prepareStatement(userCheckSql)) {
            
            userCheckPstmt.setInt(1, driverId);
            ResultSet rs = userCheckPstmt.executeQuery();
            
            if (!rs.next()) {
                System.err.println("❌ User with ID " + driverId + " not found");
                return false;
            }
            
            String userType = rs.getString("user_type");
            if (!"DRIVER".equals(userType)) {
                System.err.println("❌ User " + driverId + " is not a driver (type: " + userType + ")");
                return false;
            }
        } catch (SQLException e) {
            System.err.println("❌ Failed to verify user type for driver " + driverId + ": " + e.getMessage());
            throw new RemoteException("Failed to verify user type: " + e.getMessage(), e);
        }
        
        // Update location and set driver as online
        String sql = "UPDATE user_locations SET latitude = ?, longitude = ?, is_online = true, last_updated = NOW() " +
                    "WHERE user_id = ?";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setDouble(1, lat);
            pstmt.setDouble(2, lng);
            pstmt.setInt(3, driverId);
            
            int result = pstmt.executeUpdate();
            
            // If no record exists, insert a new one
            if (result == 0) {
                System.out.println("📍 No existing location record found for driver " + driverId + ", creating new one");
                String insertSql = "INSERT INTO user_locations (user_id, latitude, longitude, is_online, last_updated) " +
                                  "VALUES (?, ?, ?, true, NOW())";
                try (PreparedStatement insertPstmt = conn.prepareStatement(insertSql)) {
                    insertPstmt.setInt(1, driverId);
                    insertPstmt.setDouble(2, lat);
                    insertPstmt.setDouble(3, lng);
                    result = insertPstmt.executeUpdate();
                }
            }
            
            boolean success = result > 0;
            System.out.println("📍 Driver location update " + (success ? "successful" : "failed") + " for driver " + driverId);
            return success;
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to update driver location for driver " + driverId + ": " + e.getMessage());
            throw new RemoteException("Failed to update driver location: " + e.getMessage(), e);
        }
    }

    // ride information
    @Override
    public Ride getCurrentRide(int userId) throws RemoteException {
        System.out.println("ℹ️ getCurrentRide called for user " + userId);
        
        String sql = "SELECT r.*, u.username as rider_username, u.phone as rider_phone " +
                    "FROM rides r " +
                    "LEFT JOIN users u ON r.rider_id = u.id " +
                    "WHERE (r.rider_id = ? OR r.driver_id = ?) " +
                    "AND r.status NOT IN ('COMPLETED', 'CANCELLED') " +
                    "ORDER BY r.created_at DESC LIMIT 1";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, userId);
            pstmt.setInt(2, userId);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    Ride currentRide = mapResultSetToRide(rs);
                    System.out.println("ℹ️ Current ride found for user " + userId + ": ride ID " + currentRide.getId() + ", status " + currentRide.getStatus());
                    return currentRide;
                } else {
                    System.out.println("ℹ️ No current ride found for user " + userId);
                }
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to get current ride for user " + userId + ": " + e.getMessage());
            throw new RemoteException("Failed to get current ride: " + e.getMessage(), e);
        }
        
        return null;
    }

    @Override
    public List<Ride> getRideHistory(int userId) throws RemoteException {
        System.out.println("📜 getRideHistory called for user " + userId);
        
        String sql = "SELECT r.*, u.username as rider_username, u.phone as rider_phone " +
                    "FROM rides r " +
                    "LEFT JOIN users u ON r.rider_id = u.id " +
                    "WHERE (r.rider_id = ? OR r.driver_id = ?) " +
                    "ORDER BY r.created_at DESC";

        List<Ride> rideHistory = new ArrayList<>();
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, userId);
            pstmt.setInt(2, userId);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    rideHistory.add(mapResultSetToRide(rs));
                }
            }
            
            System.out.println("📜 Retrieved " + rideHistory.size() + " rides from history for user " + userId);
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to get ride history for user " + userId + ": " + e.getMessage());
            throw new RemoteException("Failed to get ride history: " + e.getMessage(), e);
        }
        
        return rideHistory;
    }

    // ride status checking
    @Override
    public String getRideStatus(int rideId) throws RemoteException {
        System.out.println("🔍 getRideStatus called for ride " + rideId);
        
        String sql = "SELECT status FROM rides WHERE id = ?";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, rideId);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    String status = rs.getString("status");
                    System.out.println("🔍 Status for ride " + rideId + ": " + status);
                    return status;
                } else {
                    System.out.println("🔍 Ride " + rideId + " not found");
                }
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Failed to get ride status for ride " + rideId + ": " + e.getMessage());
            throw new RemoteException("Failed to get ride status: " + e.getMessage(), e);
        }
        
        return null;
    }

    // Helper method to map ResultSet to Ride object
    private Ride mapResultSetToRide(ResultSet rs) throws SQLException {
        System.out.println("🔧 mapResultSetToRide called - mapping database row to Ride object");
        
        Ride ride = new Ride();
        ride.setId(rs.getInt("id"));
        ride.setRiderId(rs.getInt("rider_id"));
        ride.setDriverId(rs.getInt("driver_id"));
        ride.setPickupLatitude(rs.getDouble("pickup_latitude"));
        ride.setPickupLongitude(rs.getDouble("pickup_longitude"));
        ride.setDestinationLatitude(rs.getDouble("destination_latitude"));
        ride.setDestinationLongitude(rs.getDouble("destination_longitude"));
        ride.setPickupAddress(rs.getString("pickup_address"));
        ride.setDestinationAddress(rs.getString("destination_address"));
        
        // Set rider information if available (from JOIN query)
        try {
            ride.setRiderUsername(rs.getString("rider_username"));
            ride.setRiderPhone(rs.getString("rider_phone"));
        } catch (SQLException e) {
            // These fields might not be available in all queries, so ignore if not found
            System.out.println("ℹ️ Rider username/phone not available in this query result");
        }
        
        // Convert status string to enum
        String statusStr = rs.getString("status");
        if (statusStr != null) {
            try {
                ride.setStatus(Ride.Status.valueOf(statusStr));
            } catch (IllegalArgumentException e) {
                System.err.println("⚠️ Invalid ride status found: " + statusStr + ", defaulting to PENDING");
                ride.setStatus(Ride.Status.PENDING); // Default fallback
            }
        }
        
        ride.setCreatedAt(rs.getTimestamp("created_at"));
        ride.setUpdatedAt(rs.getTimestamp("updated_at"));
        ride.setAcceptedAt(rs.getTimestamp("accepted_at"));
        ride.setStartedAt(rs.getTimestamp("started_at"));
        ride.setCompletedAt(rs.getTimestamp("completed_at"));
        
        System.out.println("🔧 Successfully mapped ride ID " + ride.getId() + " with status " + ride.getStatus());
        return ride;
    }
}
