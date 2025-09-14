import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isDriver: boolean;
  isRider: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    console.log('🔍 AuthContext: Checking stored authentication...');
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token'); // Also check for 'token' key
    const storedAuthToken = localStorage.getItem('authToken');
    
    console.log('📦 Stored user:', storedUser);
    console.log('🔑 Stored token:', storedToken ? 'Token exists' : 'No token');
    console.log('🔑 Stored authToken:', storedAuthToken ? 'AuthToken exists' : 'No authToken');
    
    const actualToken = storedToken || storedAuthToken;
    
    if (storedUser && actualToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('✅ Restoring user from localStorage:', parsedUser);
        console.log('👤 User ID being used:', parsedUser.id);
        console.log('👤 User details:', {
          id: parsedUser.id,
          username: parsedUser.username,
          phone: parsedUser.phone,
          userType: parsedUser.userType
        });
        setUser(parsedUser);
      } catch (error) {
        console.error('❌ Error parsing stored user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
      }
    } else {
      console.log('❌ No valid stored authentication found');
    }
  }, []);

  const login = (userData: User, token: string) => {
    console.log('🚀 AuthContext: Logging in user:', userData);
    console.log('🔑 AuthContext: Storing token:', token ? 'Token provided' : 'No token');
    
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('authToken', token);
    
    console.log('✅ AuthContext: User and token stored successfully');
  };

  const logout = () => {
    console.log('🚪 AuthContext: Logging out user');
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    console.log('✅ AuthContext: User logged out successfully');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isDriver: user?.userType === 'DRIVER',
    isRider: user?.userType === 'RIDER',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};