package com.rsrmi.ride_sharing_api.rmi.implementations;

import com.rsrmi.ride_sharing_api.rmi.interfaces.UserService;
import com.rsrmi.ride_sharing_api.rmi.models.User;
import com.rsrmi.ride_sharing_api.rmi.config.DatabaseConfig;
import java.rmi.RemoteException;
import java.rmi.server.UnicastRemoteObject;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Implementation of UserService interface using DB
 */
public class UserServiceImpl extends UnicastRemoteObject implements UserService {
    /**
     * Constructor - must call super() and handle RemoteException
     * @throws RemoteException Required for RMI
     */
    public UserServiceImpl() throws RemoteException {
        super();
        // DB tables are initialized by DatabaseConfig singleton
        DatabaseConfig.getInstance();
        
        System.out.println("UserService implementation initialized successfully");
    }

    @Override
    public boolean registerUser(User user) throws RemoteException {
        String sql = "INSERT INTO users (username, phone, password, user_type) VALUES (?, ?, ?, 'RIDER')";
        try (Connection conn = DatabaseConfig.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, user.getUsername());
            stmt.setString(2, user.getPhone());
            stmt.setString(3, user.getPassword());
            stmt.executeUpdate();
            System.out.println("✅ User registered successfully: " + user.getUsername());
            return true;
        } catch (SQLException e) {
            System.err.println("Registration failed: " + e.getMessage());
            return false;
        }
    }

    @Override
    public User loginUser(String phone, String password) throws RemoteException {
        String sql = "SELECT id, username, phone, user_type FROM users WHERE phone = ? AND password = ?";
        try (Connection conn = DatabaseConfig.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, phone);
            stmt.setString(2, password);
            ResultSet rs = stmt.executeQuery();
            System.out.println("phone is " + phone + " password is " + password);
            if (rs.next()) {
                User user = new User();
                user.setId(rs.getInt("id"));
                user.setUsername(rs.getString("username"));
                user.setPhone(rs.getString("phone"));
                user.setUserType(User.UserType.valueOf(rs.getString("user_type")));
                System.out.println("✅ Login successful: " + phone);
                return user;
            }
            System.out.println("Login failed: Invalid phone or password");
            return null;
        } catch (SQLException e) {
            System.err.println("Login failed: " + e.getMessage());
            return null;
        }
    }

    @Override
    public User updateUser(int id, User user) throws RemoteException {
        String sql = "UPDATE users SET username = ?, phone = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, user.getUsername());
            stmt.setString(2, user.getPhone());
            stmt.setInt(3, id);
            int rows = stmt.executeUpdate();
            if (rows > 0) {
                return getUserById(user.getId());
            } else {
                return null;
            }
        } catch (SQLException e) {
            System.err.println("Update failed: " + e.getMessage());
            return null;
        }
    }

    @Override
    public boolean isPhoneExists(String phone) throws RemoteException {
        String sql = "SELECT 1 FROM users WHERE phone = ?";
        try (Connection conn = DatabaseConfig.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, phone);
            ResultSet rs = stmt.executeQuery();
            return rs.next();
        } catch (SQLException e) {
            System.err.println("Phone existence check failed: " + e.getMessage());
            return false;
        }
    }

    @Override
    public boolean isUsernameExists(String username) throws RemoteException {
        String sql = "SELECT 1 FROM users WHERE username = ?";
        try (Connection conn = DatabaseConfig.getInstance().getConnection();
            PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, username);
            ResultSet rs = stmt.executeQuery();
            return rs.next();
        } catch (SQLException e) {
            System.err.println("Username existence check failed: " + e.getMessage());
            return false;
        }
    }

    @Override
    public User getUserById(int id) throws RemoteException {
        String sql = "SELECT id, username, phone, password, user_type FROM users WHERE id = ?";
        try (Connection conn = DatabaseConfig.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                User user = new User();
                user.setId(rs.getInt("id"));
                user.setUsername(rs.getString("username"));
                user.setPhone(rs.getString("phone"));
                user.setPassword(rs.getString("password"));
                user.setUserType(User.UserType.valueOf(rs.getString("user_type")));
                return user;
            }
            return null;
        } catch (SQLException e) {
            System.err.println("getUserById failed: " + e.getMessage());
            return null;
        }
    }

    @Override
    public boolean ping() throws RemoteException {
        return true;
    }

    // Implement other methods as needed, or throw UnsupportedOperationException
}
