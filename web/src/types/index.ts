export interface User {
  id: number;
  username: string;
  phone: string;
  userType: 'RIDER' | 'DRIVER';
  password?: string | null;
}

export interface Driver extends User {
  vehicleType: string;
  vehicleNumber?: string;
  location?: Location;
  currentLocation?: Location; // Backend returns this field
  isAvailable: boolean;
  rating: number;
  username: string; // Add username for display
  minutesAway?: number;
}

export interface Rider extends User {
  location?: Location;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
  streetName?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface Ride {
  id: string;
  riderId: string;
  driverId?: string;
  pickupLocation: Location;
  destination: Location;
  status: 'pending' | 'accepted' | 'picking_up' | 'in_progress' | 'completed' | 'cancelled';
  fare?: number;
  estimatedTime?: number;
  createdAt: Date;
}

export interface RideRequest {
  pickupLocation: Location;
  destination: Location;
  estimatedFare: number;
}