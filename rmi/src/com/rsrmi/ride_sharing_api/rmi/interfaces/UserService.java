package com.rsrmi.ride_sharing_api.rmi.interfaces;

import java.rmi.Remote;
import java.rmi.RemoteException;
import com.rsrmi.ride_sharing_api.rmi.models.User;

public interface UserService extends Remote {
    
    /**
     * Register a new user
     * @param user The user to register
     * @return true if registration successful, false otherwise
     * @throws RemoteException Required for RMI
     */
    public boolean registerUser(User user) throws RemoteException;
    
    /**
     * Login user with email and password
     * @param email User's email
     * @param password User's password
     * @return User object if login successful, null otherwise
     * @throws RemoteException Required for RMI
     */
    public User loginUser(String email, String password) throws RemoteException;
    
    /**
     * Get user by ID
     * @param id User ID
     * @return User object if found, null otherwise
     * @throws RemoteException Required for RMI
     */
    public User getUserById(int id) throws RemoteException;
    
    /**
     * Update user information
     * @param user Updated user object
     * @return true if update successful, false otherwise
     * @throws RemoteException Required for RMI
     */
    public boolean updateUser(User user) throws RemoteException;
    
    /**
     * Check if username already exists
     * @param username Username to check
     * @return true if username exists, false otherwise
     * @throws RemoteException Required for RMI
     */
    public boolean isUsernameExists(String username) throws RemoteException;
    
    /**
     * Check if email already exists
     * @param email Email to check
     * @return true if email exists, false otherwise
     * @throws RemoteException Required for RMI
     */
    public boolean isEmailExists(String email) throws RemoteException;
}
