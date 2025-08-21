import axios from 'axios';
import { RideRequest, Location, Ride, RideRequestResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : 'http://localhost:8080/api/v1';

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

// Add response interceptor to log errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    return Promise.reject(error);
  }
);

// Helper function to get user data from localStorage
const getUserData = () => {
  const user = localStorage.getItem('user');
  if (!user) {
    throw new Error('User not logged in');
  }
  return JSON.parse(user);
};

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
    carType?: string | null;
    licenseNumber?: string | null;
  }) => {
    // If not a driver, ensure carType and licenseNumber are null
    const payload = { ...userData };
    if (userData.userType !== 'DRIVER') {
      payload.carType = null;
      payload.licenseNumber = null;
    }
    const response = await api.post('/users/register', payload);
    return response.data.success;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
};

export const rideAPI = {
  requestRide: async (rideRequest: RideRequest): Promise<RideRequestResponse> => {
    const userData = getUserData();
    
    // Transform the frontend RideRequest format to match backend API format
    const apiPayload = {
      riderId: userData.id,
      pickupLat: rideRequest.pickupLocation.lat,
      pickupLng: rideRequest.pickupLocation.lng,
      destLat: rideRequest.destination.lat,
      destLng: rideRequest.destination.lng
    };
    
    console.log('🔄 Sending ride request:', apiPayload);
    console.log('📍 Coordinates check:', {
      pickup: `${apiPayload.pickupLat}, ${apiPayload.pickupLng}`,
      destination: `${apiPayload.destLat}, ${apiPayload.destLng}`,
      riderId: apiPayload.riderId
    });
    
    const response = await api.post('/rides/request', apiPayload);
    return response.data;
  },

  getNearbyDrivers: async (location: Location, radius: number = 5) => {
    const response = await api.get(`/drivers/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radius}`);
    return response.data;
  },

  acceptRide: async (rideId: string | number) => {
    const userData = getUserData();
    
    // Check if user is a driver
    if (userData.userType !== 'DRIVER') {
      throw new Error('Only drivers can accept rides');
    }
    
    // Convert rideId to number if it's a string
    const rideIdNum = typeof rideId === 'string' ? parseInt(rideId, 10) : rideId;
    
    const response = await api.post(`/rides/${rideIdNum}/accept`, { driverId: userData.id });
    return response.data;
  },

  updateRideStatus: async (rideId: string | number, action: string) => {
    // Convert rideId to number if it's a string
    const rideIdNum = typeof rideId === 'string' ? parseInt(rideId, 10) : rideId;
    
    const response = await api.put(`/rides/${rideIdNum}/status`, { action });
    return response.data;
  },

  getRideHistory: async (): Promise<Ride[]> => {
    const userData = getUserData();
    
    const response = await api.get(`/rides/history?userId=${userData.id}`);
    return response.data; // Return raw backend format
  },

  getCurrentRide: async (): Promise<Ride | null> => {
    const userData = getUserData();
    
    const response = await api.get(`/rides/current?userId=${userData.id}`);
    return response.data; // Return raw backend format
  },

  getPendingRides: async (location: Location, radius: number = 4): Promise<Ride[]> => {
    const response = await api.get(`/rides/pending?driverLat=${location.lat}&driverLng=${location.lng}&radius=${radius}`);
    return response.data; // Return raw backend format
  },

  updateDriverLocation: async (location: Location) => {
    const userData = getUserData();
    
    // Check if user is a driver
    if (userData.userType !== 'DRIVER') {
      throw new Error('Only drivers can update driver location');
    }
    
    const payload = {
      latitude: location.lat,
      longitude: location.lng
    };
    
    const response = await api.post(`/rides/driver/${userData.id}/location`, payload);
    return response.data;
  },

  cancelRide: async (rideId: string | number) => {
    // Convert rideId to number if it's a string
    const rideIdNum = typeof rideId === 'string' ? parseInt(rideId, 10) : rideId;
    
    console.log(`🔄 Cancelling ride ${rideIdNum} via POST /rides/${rideIdNum}/cancel`);
    const response = await api.post(`/rides/${rideIdNum}/cancel`);
    console.log('✅ Cancel ride response:', response.data);
    return response.data;
  },

  getRideStatus: async (rideId: string | number) => {
    // Convert rideId to number if it's a string
    const rideIdNum = typeof rideId === 'string' ? parseInt(rideId, 10) : rideId;
    
    const response = await api.get(`/rides/${rideIdNum}/status`);
    return response.data;
  },
};

export const locationAPI = {
  updateLocation: async (location: Location & { userId: number }) => {
    const payload = {
      latitude: location.lat,  // Map lat to latitude
      longitude: location.lng, // Map lng to longitude
      address: location.address || '',
      is_online: true
      // Don't send user_id or last_updated as they are handled by the backend
    };
    
    const response = await api.put(`/users/update/location?userId=${location.userId}`, payload);
    return response.data;
  },

  getRealTimeLocation: async (userId: string) => {
    const response = await api.get(`/users/${userId}/get/location`);
    return response.data;
  },
};

export const userAPI = {
  getUserById: async (userId: number) => {
    const response = await api.get(`/users/get?id=${userId}`);
    return response.data; // Returns ApiResponse with user data
  },
};

export default api;