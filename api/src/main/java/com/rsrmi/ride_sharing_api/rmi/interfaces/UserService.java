package com.rsrmi.ride_sharing_api.rmi.interfaces;

import java.rmi.Remote;
import java.rmi.RemoteException;
import com.rsrmi.ride_sharing_api.rmi.models.User;

public interface UserService extends Remote {
    boolean registerUser(User user) throws RemoteException;
    User loginUser(String phone, String password) throws RemoteException;
    User getUserById(int id) throws RemoteException;
    boolean updateUser(User user) throws RemoteException;
    boolean isUsernameExists(String username) throws RemoteException;
    boolean isPhoneExists(String phone) throws RemoteException;
    boolean ping() throws RemoteException;
}
