// Server-Sent Events (SSE) Service for Real-time Updates
import { Ride, Location } from '../types';

interface DriverEventCallbacks {
  onRideRequest?: (ride: Ride) => void;
  onRideUpdate?: (ride: Ride) => void;
  onRideCancelled?: (rideId: number) => void;
  onError?: (error: Event) => void;
}

interface RiderEventCallbacks {
  onDriverLocation?: (location: Location) => void;
  onRideUpdate?: (ride: Ride) => void;
  onDriverArrived?: () => void;
  onError?: (error: Event) => void;
}

export class SSEService {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Connect to driver events stream
  connectDriverEvents(driverId: number, callbacks: DriverEventCallbacks) {
    this.disconnect();
    
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/sse/driver/${driverId}`;
    
    try {
      this.eventSource = new EventSource(url);
      
      // Handle new ride requests
      this.eventSource.addEventListener('ride-request', (event) => {
        const ride = JSON.parse(event.data);
        console.log('🔔 New ride request received via SSE:', ride);
        callbacks.onRideRequest?.(ride);
      });
      
      // Handle ride updates
      this.eventSource.addEventListener('ride-update', (event) => {
        const ride = JSON.parse(event.data);
        console.log('📱 Ride update received via SSE:', ride);
        callbacks.onRideUpdate?.(ride);
      });
      
      // Handle ride cancellations
      this.eventSource.addEventListener('ride-cancelled', (event) => {
        const rideId = JSON.parse(event.data);
        console.log('❌ Ride cancelled via SSE:', rideId);
        callbacks.onRideCancelled?.(rideId);
      });
      
      // Handle connection events
      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        this.reconnectAttempts = 0;
      };
      
      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        callbacks.onError?.(error);
        this.handleReconnect(driverId, callbacks);
      };
      
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      callbacks.onError?.(error as Event);
    }
  }
  
  // Connect to rider events stream
  connectRiderEvents(riderId: number, callbacks: RiderEventCallbacks) {
    this.disconnect();
    
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/sse/rider/${riderId}`;
    
    try {
      this.eventSource = new EventSource(url);
      
      // Handle driver location updates
      this.eventSource.addEventListener('driver-location', (event) => {
        const location = JSON.parse(event.data);
        console.log('📍 Driver location update via SSE:', location);
        callbacks.onDriverLocation?.(location);
      });
      
      // Handle ride updates
      this.eventSource.addEventListener('ride-update', (event) => {
        const ride = JSON.parse(event.data);
        console.log('📱 Ride update received via SSE:', ride);
        callbacks.onRideUpdate?.(ride);
      });
      
      // Handle driver arrival
      this.eventSource.addEventListener('driver-arrived', () => {
        console.log('🚗 Driver arrived via SSE');
        callbacks.onDriverArrived?.();
      });
      
      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established for rider');
        this.reconnectAttempts = 0;
      };
      
      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        callbacks.onError?.(error);
        this.handleReconnect(riderId, callbacks);
      };
      
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      callbacks.onError?.(error as Event);
    }
  }
  
  private handleReconnect(userId: number, callbacks: DriverEventCallbacks | RiderEventCallbacks) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect SSE (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        // Determine if this is a driver or rider reconnection based on callbacks
        if ('onRideRequest' in callbacks) {
          this.connectDriverEvents(userId, callbacks as DriverEventCallbacks);
        } else {
          this.connectRiderEvents(userId, callbacks as RiderEventCallbacks);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max SSE reconnection attempts reached');
    }
  }
  
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('🛑 SSE connection closed');
    }
    this.reconnectAttempts = 0;
  }
  
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

export const sseService = new SSEService();
