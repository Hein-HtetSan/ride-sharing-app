import axios from 'axios';
import { User, Driver, Rider, Ride, RideRequest, Location } from '../types';

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: async (phone: string, password: string) => {
    const response = await api.post(`/users/login?phone=${encodeURIComponent(phone)}&password=${encodeURIComponent(password)}`);
    return response.data;
  },

  register: async (userData: {
    username: string;
    phone: string;
    password: string;
    userType: 'RIDER' | 'DRIVER';
  }) => {
    const response = await api.post('/users/register', userData);
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
};

export const rideAPI = {
  requestRide: async (rideRequest: RideRequest) => {
    const response = await api.post('/rides/request', rideRequest);
    return response.data;
  },

  getNearbyDrivers: async (location: Location, radius: number = 5) => {
    const response = await api.get(`/drivers/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radius}`);
    return response.data;
  },

  acceptRide: async (rideId: string) => {
    const response = await api.post(`/rides/${rideId}/accept`);
    return response.data;
  },

  updateRideStatus: async (rideId: string, status: string) => {
    const response = await api.put(`/rides/${rideId}/status`, { status });
    return response.data;
  },

  getRideHistory: async () => {
    const response = await api.get('/rides/history');
    return response.data;
  },

  getCurrentRide: async () => {
    const response = await api.get('/rides/current');
    return response.data;
  },
};

export const locationAPI = {
  updateLocation: async (location: Location) => {
    const response = await api.put('/users/location', location);
    return response.data;
  },

  getRealTimeLocation: async (userId: string) => {
    const response = await api.get(`/users/${userId}/location`);
    return response.data;
  },
};

export default api;