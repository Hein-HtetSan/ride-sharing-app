package com.rsrmi.ride_sharing_api.rmi.implementations;

import com.rsrmi.ride_sharing_api.rmi.interfaces.LocationService;
import com.rsrmi.ride_sharing_api.rmi.models.UserLocation;
import com.rsrmi.ride_sharing_api.rmi.models.User;
import java.rmi.RemoteException;
import java.rmi.server.UnicastRemoteObject;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.ArrayList;
import com.rsrmi.ride_sharing_api.rmi.config.DatabaseConfig;

public class LocationServiceImpl extends UnicastRemoteObject implements LocationService {
    private final DatabaseConfig dbConfig;

    public LocationServiceImpl() throws RemoteException {
        super();
        this.dbConfig = DatabaseConfig.getInstance();
    }

    // Update a user's location, timestamp, and availability
    @Override
    public boolean updateUserLocation(int userId, UserLocation location, long timestamp, boolean isAvailable) throws RemoteException {
        String sql = "INSERT INTO user_locations (user_id, latitude, longitude, address, last_updated, is_online) " +
                "VALUES (?, ?, ?, ?, ?, ?) " +
                "ON CONFLICT (user_id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, address = EXCLUDED.address, last_updated = EXCLUDED.last_updated, is_available = EXCLUDED.is_available";
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            stmt.setDouble(2, location.getLatitude());
            stmt.setDouble(3, location.getLongitude());
            stmt.setString(4, location.getAddress());
            stmt.setLong(5, timestamp);
            stmt.setBoolean(6, isAvailable);
            int affected = stmt.executeUpdate();
            return affected > 0;
        } catch (SQLException e) {
            System.err.println("updateUserLocation: SQL error: " + e.getMessage());
            return false;
        }
    }

    // Get the current location for a user
    @Override
    public UserLocation getUserLocation(int userId) throws RemoteException {
        String sql = "SELECT latitude, longitude, address, is_online, last_updated FROM user_locations WHERE user_id = ?";
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    double lat = rs.getDouble("latitude");
                    double lon = rs.getDouble("longitude");
                    String address = rs.getString("address");
                    boolean is_online = rs.getBoolean("is_online");
                    String last_updated = rs.getString("last_updated");
                    return new UserLocation(userId, lat, lon, address, is_online, last_updated);
                }
            }
        } catch (SQLException e) {
            System.err.println("getUserLocation: SQL error: " + e.getMessage());
        }
        return null;
    }

    // Find nearby drivers within a radius
    @Override
    public List<UserLocation> findNearbyDrivers(UserLocation riderLocation, double radiusKm) throws RemoteException {
        List<UserLocation> result = new ArrayList<>();
        if (riderLocation == null) return result;
        String sql = "SELECT ul.user_id, ul.latitude, ul.longitude, ul.address, ul.is_online, ul.last_updated " +
                "FROM user_locations ul " +
                "JOIN users u ON ul.user_id = u.id " +
                "WHERE u.user_type = 'DRIVER' AND ul.is_online = TRUE";
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                double lat = rs.getDouble("latitude");
                double lon = rs.getDouble("longitude");
                double distance = haversine(
                        riderLocation.getLatitude(), riderLocation.getLongitude(),
                        lat, lon);
                if (distance <= radiusKm) {
                    int userId = rs.getInt("user_id");
                    String address = rs.getString("address");
                    boolean isOnline = rs.getBoolean("is_online");
                    String lastUpdated = rs.getString("last_updated");
                    UserLocation driverLoc = new UserLocation(userId, lat, lon, address, isOnline, lastUpdated);
                    result.add(driverLoc);
                }
            }
        } catch (SQLException e) {
            System.err.println("findNearbyDrivers: SQL error: " + e.getMessage());
        }
        return result;
    }

    public static double haversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // Radius of the earth in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
