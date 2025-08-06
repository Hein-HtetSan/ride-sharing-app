package com.rsrmi.ride_sharing_api.rmi.interfaces;

import java.rmi.Remote;
import java.rmi.RemoteException;
import com.rsrmi.ride_sharing_api.rmi.models.User;

public interface UserService extends Remote {

    public boolean ping() throws RemoteException;
    
    public boolean registerUser(User user) throws RemoteException;
    
    public User loginUser(String email, String password) throws RemoteException;

    public User getUserById(int id) throws RemoteException;
    
    public User updateUser(int id, User user) throws RemoteException;
    
    public boolean isUsernameExists(String username) throws RemoteException;
    
    public boolean isPhoneExists(String email) throws RemoteException;

    public boolean deleteUser(int id) throws RemoteException;
}
