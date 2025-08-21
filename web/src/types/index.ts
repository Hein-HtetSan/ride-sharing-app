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
  isRiderWaiting?: boolean; // Add flag for waiting riders
}

export interface Ride {
  id: number;
  riderId: number;
  driverId: number;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  pickupAddress?: string;
  destinationAddress?: string;
  riderUsername?: string;
  riderPhone?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DRIVER_EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface RideRequest {
  pickupLocation: Location;
  destination: Location;
  estimatedFare?: number;
}

export interface RideRequestResponse {
  success: boolean;
  message: string;
  status: string;
  data: number; // This is the ride ID
}