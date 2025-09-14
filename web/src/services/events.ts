// Simple SSE helper for ride events
export type RideEvent = {
  rideId: number;
  type: 'DRIVER_LOCATION' | 'RIDER_LOCATION' | 'STATUS' | string;
  lat?: number;
  lng?: number;
  status?: import('../types').Ride['status'];
  timestamp?: number;
};

export function subscribeRideEvents(rideId: number, onEvent: (ev: RideEvent) => void) {
  const base = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}` : 'http://localhost:8080';
  const url = `${base}/api/v1/rides/${rideId}/events`;
  
  console.log('🔌 Subscribing to SSE events for ride:', rideId, 'URL:', url);
  
  // Get auth token from localStorage
  const token = localStorage.getItem('token');
  let es: EventSource;
  
  if (token) {
    // Create EventSource with auth headers (requires server support)
    es = new EventSource(`${url}?token=${encodeURIComponent(token)}`);
  } else {
    es = new EventSource(url);
  }
  
  es.onopen = () => {
    console.log('✅ SSE connection opened for ride:', rideId);
  };
  
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      console.log('📡 SSE event received:', data);
      
      // Skip heartbeat events
      if (data.status === 'HEARTBEAT') {
        return;
      }
      
      onEvent(data);
    } catch (error) {
      console.warn('Failed to parse SSE event:', e.data, error);
    }
  };
  
  es.onerror = (error) => {
    console.error('❌ SSE connection error for ride:', rideId, error);
    // EventSource will auto-retry
  };
  
  return () => {
    console.log('🔌 Closing SSE connection for ride:', rideId);
    es.close();
  };
}
