export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  userType: 'rider' | 'driver';
  isActive?: boolean;
}

export interface Driver extends User {
  vehicleType: string;
  vehicleNumber: string;
  location: Location;
  isAvailable: boolean;
  rating: number;
}

export interface Rider extends User {
  location?: Location;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
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