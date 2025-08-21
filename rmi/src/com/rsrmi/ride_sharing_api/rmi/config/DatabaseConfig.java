package com.rsrmi.ride_sharing_api.rmi.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Database configuration and connection management
 */
public class DatabaseConfig {
    
    private static DatabaseConfig instance;
    private final HikariDataSource dataSource;
    
    private DatabaseConfig() {
        HikariConfig config = new HikariConfig();
        
        // Get database configuration from environment variables or use defaults
        String dbHost = System.getenv("DB_HOST") != null ? System.getenv("DB_HOST") : "localhost";
        String dbPort = System.getenv("DB_PORT") != null ? System.getenv("DB_PORT") : "5432";
        String dbName = System.getenv("DB_NAME") != null ? System.getenv("DB_NAME") : "ride_sharing";
        String dbUser = System.getenv("DB_USER") != null ? System.getenv("DB_USER") : "postgres";
        String dbPassword = System.getenv("DB_PASSWORD") != null ? System.getenv("DB_PASSWORD") : "ykpt22270";
        
        config.setJdbcUrl("jdbc:postgresql://" + dbHost + ":" + dbPort + "/" + dbName);
        config.setUsername(dbUser);
        config.setPassword(dbPassword);
        config.setDriverClassName("org.postgresql.Driver");
        
        // Connection pool settings
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);
        
        this.dataSource = new HikariDataSource(config);
        
        // Initialize database tables
        initializeDatabase();
    }
    
    public static synchronized DatabaseConfig getInstance() {
        if (instance == null) {
            instance = new DatabaseConfig();
        }
        return instance;
    }
    
    public DataSource getDataSource() {
        return dataSource;
    }
    
    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }
    
    private void initializeDatabase() {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            
            System.out.println("Initializing database tables...");

            // drop all the table
            stmt.executeUpdate("DROP TABLE IF EXISTS rides CASCADE");
            stmt.executeUpdate("DROP TABLE IF EXISTS user_locations CASCADE");
            stmt.executeUpdate("DROP TABLE IF EXISTS users CASCADE");
            
            // Create users table
            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    phone VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('RIDER', 'DRIVER')),
                    car_type VARCHAR(100),
                    license_number VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """);
            
            // Create user_locations table
            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS user_locations (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    latitude DOUBLE PRECISION NOT NULL,
                    longitude DOUBLE PRECISION NOT NULL,
                    address VARCHAR(255),
                    is_online BOOLEAN DEFAULT true,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """);
            
            // Create rides table
            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS rides (
                    id SERIAL PRIMARY KEY,
                    rider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    driver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    pickup_latitude DOUBLE PRECISION NOT NULL,
                    pickup_longitude DOUBLE PRECISION NOT NULL,
                    pickup_address VARCHAR(500),
                    destination_latitude DOUBLE PRECISION,
                    destination_longitude DOUBLE PRECISION,
                    destination_address VARCHAR(500),
                    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    accepted_at TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP
                )
            """);
            
            // Create ride_tracking table for real-time driver location during rides
            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS ride_tracking (
                    id SERIAL PRIMARY KEY,
                    ride_id INTEGER REFERENCES rides(id) ON DELETE CASCADE,
                    driver_latitude DOUBLE PRECISION NOT NULL,
                    driver_longitude DOUBLE PRECISION NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """);
            
            // Create indexes for better performance
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_rides_rider_id ON rides(rider_id)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_ride_tracking_ride_id ON ride_tracking(ride_id)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_ride_tracking_timestamp ON ride_tracking(timestamp)");
            
            System.out.println("Database tables initialized successfully!");

            // create rider and driver
            stmt.executeUpdate("""
                INSERT INTO users (username, phone, password, user_type, car_type, license_number)
                VALUES 
                    ('rider', '09761349721', 'rider', 'RIDER', NULL, NULL),
                    ('driver', '0900112233', 'driver', 'DRIVER', 'Sedan', 'LIC12345')
                ON CONFLICT (username) DO NOTHING
            """);
            
        } catch (SQLException e) {
            System.err.println("Error initializing database: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to initialize database", e);
        }
    }
    
    public void close() {
        if (dataSource != null) {
            dataSource.close();
        }
    }
}
