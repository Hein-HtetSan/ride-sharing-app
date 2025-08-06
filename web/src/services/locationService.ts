import { Location } from '../types';

// Simple geocoding service using browser's geolocation and fallback data
export class LocationService {
  // Mock locations for Myanmar (Yangon area) for demonstration
  private static mockLocations: Location[] = [
    {
      lat: 16.8661,
      lng: 96.1951,
      address: "Sule Pagoda, Yangon, Myanmar",
      streetName: "Sule Pagoda Road",
      city: "Yangon",
      country: "Myanmar",
      postalCode: "11181"
    },
    {
      lat: 16.8409,
      lng: 96.1735,
      address: "Bogyoke Aung San Market, Yangon, Myanmar",
      streetName: "Bogyoke Aung San Road",
      city: "Yangon",
      country: "Myanmar",
      postalCode: "11182"
    },
    {
      lat: 16.8631,
      lng: 96.1895,
      address: "Yangon Central Railway Station, Myanmar",
      streetName: "Bo Aung Kyaw Street",
      city: "Yangon",
      country: "Myanmar",
      postalCode: "11181"
    },
    {
      lat: 16.8700,
      lng: 96.2000,
      address: "Kandawgyi Lake, Yangon, Myanmar",
      streetName: "Kandawgyi Garden Street",
      city: "Yangon",
      country: "Myanmar",
      postalCode: "11181"
    },
    {
      lat: 16.8500,
      lng: 96.1800,
      address: "Yangon University, Myanmar",
      streetName: "University Avenue Road",
      city: "Yangon",
      country: "Myanmar",
      postalCode: "11041"
    }
  ];

  static async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          
          // Try to get address from reverse geocoding
          try {
            const location = await this.reverseGeocode(lat, lng);
            resolve(location);
          } catch (error) {
            // Fallback to coordinates only
            resolve({
              lat,
              lng,
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              streetName: undefined,
              city: 'Unknown',
              country: 'Unknown',
              postalCode: undefined
            });
          }
        },
        (error) => {
          // Fallback to default location (Yangon)
          resolve(this.mockLocations[0]);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  static async reverseGeocode(lat: number, lng: number): Promise<Location> {
    // Try using a free geocoding service as fallback
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        return {
          lat,
          lng,
          address: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          streetName: data.address?.road || data.address?.street,
          city: data.address?.city || data.address?.town || data.address?.village,
          country: data.address?.country,
          postalCode: data.address?.postcode
        };
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }

    // Fallback to basic location
    return {
      lat,
      lng,
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      streetName: undefined,
      city: undefined,
      country: undefined,
      postalCode: undefined
    };
  }

  static searchLocations(query: string): Location[] {
    if (!query || query.length < 2) return [];
    
    const lowercaseQuery = query.toLowerCase();
    return this.mockLocations.filter(location =>
      location.address.toLowerCase().includes(lowercaseQuery) ||
      location.city?.toLowerCase().includes(lowercaseQuery) ||
      location.streetName?.toLowerCase().includes(lowercaseQuery)
    );
  }

  static calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLng = this.toRadians(loc2.lng - loc1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.lat)) *
      Math.cos(this.toRadians(loc2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static estimateDuration(distanceKm: number): string {
    // Simple estimation: average speed of 30 km/h in city
    const hours = distanceKm / 30;
    const minutes = Math.round(hours * 60);
    
    if (minutes < 60) {
      return `${minutes} min${minutes > 1 ? 's' : ''}`;
    } else {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h ${m > 0 ? m + 'm' : ''}`;
    }
  }
}
