# RMI Implementation Guide
## Distributed Services Architecture for Ride-Sharing System

---

## 🔧 **RMI Services Overview**

### **Core Services Implemented**

**UserService - Authentication & User Management**

The UserService handles all user-related operations in the distributed ride-sharing system. It provides secure user registration with BCrypt password hashing, authentication validation, and profile management. The service supports both rider and driver account types with specialized business logic for each. It enforces data validation rules, prevents duplicate registrations, and maintains user session integrity. The service integrates directly with the PostgreSQL database through JDBC connections, ensuring transactional consistency. All password operations use industry-standard encryption, and user data is validated before persistence. The service is designed for high concurrent access with proper error handling and exception propagation to client applications.

```java
// User Management Service Interface
public interface UserService extends Remote {
    User authenticateUser(String phone, String password) throws RemoteException;
    User createUser(User user) throws RemoteException;
    User getUserById(Long id) throws RemoteException;
}
```

**RideService - Ride Lifecycle Management**

The RideService manages the complete ride workflow from initial request creation to final completion. It handles ride request processing with precise location coordinates, driver acceptance with concurrency control, and status tracking throughout the journey. The service implements database transactions with row-level locking to prevent race conditions during driver assignment. It validates location data, calculates route information, and maintains ride state consistency across the distributed system. The service supports real-time ride discovery for drivers and provides comprehensive ride history. Business rules are enforced at the service layer, including pickup/destination validation and driver availability checks. All operations are atomic and provide immediate consistency guarantees for critical ride operations.

```java
// Ride Management Service Interface
public interface RideService extends Remote {
    Long createRide(RideRequest request) throws RemoteException;
    Ride acceptRide(Long rideId, Long driverId) throws RemoteException;
    List<Ride> getAvailableRides() throws RemoteException;
}
```

**LocationService - Real-Time Location Tracking**

The LocationService provides comprehensive real-time location tracking capabilities for both drivers and riders. It processes high-frequency GPS coordinate updates with timestamp precision, enabling accurate position monitoring throughout ride journeys. The service implements efficient database operations using UPSERT patterns for optimal performance during location updates. It maintains location history for analytics and route reconstruction while providing instant location retrieval for real-time tracking displays. The service handles coordinate validation, address geocoding integration, and location accuracy management. It supports concurrent location updates from multiple users while maintaining data consistency. The service is optimized for high-throughput scenarios with minimal latency, ensuring smooth real-time tracking experiences for all system users.

```java
// Location Tracking Service Interface
public interface LocationService extends Remote {
    void updateUserLocation(Long userId, Location location) throws RemoteException;
    Location getUserLocation(Long userId) throws RemoteException;
}
```

---

## 🏗️ **RMI Registry & Service Discovery**

### **Registry Architecture**

The RMI Registry serves as the central service directory and discovery mechanism for the distributed ride-sharing system. Operating on port 1099, it maintains a comprehensive catalog of all available RMI services, enabling dynamic service lookup and binding. The registry implements a naming service that maps human-readable service names to their corresponding remote object references. It handles service registration during startup, maintains service availability status, and provides transparent service location for client applications. The registry supports concurrent access from multiple clients while ensuring consistent service discovery. It acts as the foundation for the distributed architecture, enabling loose coupling between service providers and consumers. The registry's fault tolerance and availability directly impact the entire system's reliability and service accessibility.


```java
// RMI Registry Setup
Registry registry = LocateRegistry.createRegistry(1099);

// Service Binding
UserServiceImpl userService = new UserServiceImpl();
registry.bind("UserService", userService);

RideServiceImpl rideService = new RideServiceImpl();
registry.bind("RideService", rideService);

LocationServiceImpl locationService = new LocationServiceImpl();
registry.bind("LocationService", locationService);
```

---

## 💻 **Key Implementation Examples**

### **1. Secure User Creation with Database Integration**

This implementation demonstrates comprehensive user registration with security measures, database transactions, and error handling. The method validates input parameters, applies BCrypt password hashing for security, and performs atomic database operations with proper exception handling.

```java
@Override
public User createUser(User user) throws RemoteException {
    try (Connection conn = DatabaseConfig.getConnection()) {
        // Validate user data
        if (user.getPhone() == null || user.getPassword() == null) {
            throw new RemoteException("Phone and password required");
        }
        
        // Hash password for security
        String hashedPassword = BCrypt.hashpw(user.getPassword(), BCrypt.gensalt());
        user.setPassword(hashedPassword);
        
        // Insert into database
        String sql = "INSERT INTO users (username, phone, password, user_type, created_at) " +
                    "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)";
        PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
        stmt.setString(1, user.getUsername());
        stmt.setString(2, user.getPhone());
        stmt.setString(3, user.getPassword());
        stmt.setString(4, user.getUserType());
        
        stmt.executeUpdate();
        
        // Get generated ID
        ResultSet rs = stmt.getGeneratedKeys();
        if (rs.next()) {
            user.setId(rs.getLong(1));
        }
        
        return user;
    } catch (SQLException e) {
        throw new RemoteException("Database error: " + e.getMessage());
    }
}
```

### **2. Concurrent Ride Acceptance with Transaction Control**

This implementation showcases advanced concurrency control using database row-level locking to prevent race conditions when multiple drivers attempt to accept the same ride simultaneously. It ensures atomic operations and data consistency.

```java
@Override
public Ride acceptRide(Long rideId, Long driverId) throws RemoteException {
    try (Connection conn = DatabaseConfig.getConnection()) {
        conn.setAutoCommit(false);
        
        // Check if ride is still available with row lock
        String checkSql = "SELECT status FROM rides WHERE id = ? FOR UPDATE";
        PreparedStatement checkStmt = conn.prepareStatement(checkSql);
        checkStmt.setLong(1, rideId);
        ResultSet rs = checkStmt.executeQuery();
        
        if (!rs.next() || !"PENDING".equals(rs.getString("status"))) {
            conn.rollback();
            throw new RemoteException("Ride no longer available");
        }
        
        // Accept the ride
        String updateSql = "UPDATE rides SET driver_id = ?, status = 'ACCEPTED', " +
                          "accepted_at = CURRENT_TIMESTAMP WHERE id = ?";
        PreparedStatement updateStmt = conn.prepareStatement(updateSql);
        updateStmt.setLong(1, driverId);
        updateStmt.setLong(2, rideId);
        updateStmt.executeUpdate();
        
        conn.commit();
        return getRideById(rideId);
    } catch (SQLException e) {
        throw new RemoteException("Database error: " + e.getMessage());
    }
}
```

### **3. Real-Time Location Updates with UPSERT Operations**

This implementation demonstrates efficient location tracking with database UPSERT operations, enabling high-frequency GPS updates while maintaining optimal performance. It handles both new location insertions and existing location updates atomically.

```java
@Override
public void updateUserLocation(Long userId, Location location) throws RemoteException {
    try (Connection conn = DatabaseConfig.getConnection()) {
        String sql = "INSERT INTO user_locations (user_id, latitude, longitude, address, last_updated) " +
                    "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) " +
                    "ON CONFLICT (user_id) DO UPDATE SET " +
                    "latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, " +
                    "address = EXCLUDED.address, last_updated = EXCLUDED.last_updated";
        
        PreparedStatement stmt = conn.prepareStatement(sql);
        stmt.setLong(1, userId);
        stmt.setDouble(2, location.getLatitude());
        stmt.setDouble(3, location.getLongitude());
        stmt.setString(4, location.getAddress());
        
        stmt.executeUpdate();
    } catch (SQLException e) {
        throw new RemoteException("Failed to update location: " + e.getMessage());
    }
}
```

This implementation demonstrates how traditional RMI technology integrates effectively into modern distributed systems, providing type-safe remote method invocation while supporting contemporary development practices and scalability requirements.