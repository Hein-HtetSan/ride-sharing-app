import { Location } from '../types';

// Real-time geocoding service using browser's geolocation and Nominatim API
export class LocationService {
  static async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('LocationService: Geolocation not supported by this browser');
        reject(new Error('Geolocation not supported by this browser'));
        return;
      }

      console.log('LocationService: Requesting FRESH geolocation with high accuracy...');
      console.log('LocationService: Geolocation options:', {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('LocationService: Raw geolocation success:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            timestampFormatted: new Date(position.timestamp).toLocaleString(),
            heading: position.coords.heading,
            speed: position.coords.speed,
            altitudeAccuracy: position.coords.altitudeAccuracy
          });
          
          // Check if this is a stale/cached reading
          const locationAge = Date.now() - position.timestamp;
          console.log(`LocationService: GPS reading age: ${locationAge}ms (${Math.round(locationAge/1000)}s)`);
          
          if (locationAge > 60000) { // More than 1 minute old
            console.warn('LocationService: GPS reading is older than 1 minute - this might be cached data!');
          }
          
          const { latitude: lat, longitude: lng } = position.coords;
          
          // Validate coordinates
          if (lat === 0 && lng === 0) {
            console.error('LocationService: Invalid coordinates (0,0) received');
            reject(new Error('Invalid location coordinates received'));
            return;
          }
          
          // Try to get address from reverse geocoding
          try {
            console.log(`LocationService: Attempting reverse geocoding for ${lat}, ${lng}`);
            const location = await this.reverseGeocode(lat, lng);
            console.log('LocationService: Reverse geocoding success:', location);
            resolve(location);
          } catch (error) {
            console.warn('LocationService: Reverse geocoding failed, using coordinates only:', error);
            // Fallback to coordinates only
            const coordLocation = {
              lat,
              lng,
              address: `${lat}, ${lng}`,
              streetName: undefined,
              city: 'Unknown',
              country: 'Unknown',
              postalCode: undefined
            };
            console.log('LocationService: Resolving with coordinate-only location:', coordLocation);
            resolve(coordLocation);
          }
        },
        (error) => {
          console.warn('LocationService: Geolocation failed:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.code === 1,
            POSITION_UNAVAILABLE: error.code === 2,
            TIMEOUT: error.code === 3
          });
          
          let errorMessage = 'Unknown geolocation error';
          
          if (error.code === 1) {
            errorMessage = 'Location permission denied. Please enable location access in your browser.';
            console.log('LocationService: Permission denied - please allow location access in browser settings');
          } else if (error.code === 2) {
            errorMessage = 'Location unavailable. Please check your GPS/internet connection.';
            console.log('LocationService: Position unavailable - check GPS/internet connection');
          } else if (error.code === 3) {
            errorMessage = 'Location request timeout. Please try again.';
            console.log('LocationService: Location request timeout');
          }
          
          console.error('LocationService: Unable to get location');
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // 15 seconds timeout
          maximumAge: 0 // FORCE FRESH GPS - no cached data
        }
      );
    });
  }

  static async reverseGeocode(lat: number, lng: number): Promise<Location> {
    try {
      // Use Nominatim reverse geocoding (OpenStreetMap's free service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RideSharingApp/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.display_name) {
          return {
            lat,
            lng,
            address: data.display_name,
            streetName: data.address?.road,
            city: data.address?.city || data.address?.town || data.address?.village,
            country: data.address?.country,
            postalCode: data.address?.postcode
          };
        }
      }
      
      console.warn('Nominatim reverse geocoding failed');
      
      // Fallback to coordinates
      return {
        lat,
        lng,
        address: `${lat}, ${lng}`,
        streetName: undefined,
        city: undefined,
        country: undefined,
        postalCode: undefined
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      
      // Fallback to coordinates
      return {
        lat,
        lng,
        address: `${lat}, ${lng}`,
        streetName: undefined,
        city: undefined,
        country: undefined,
        postalCode: undefined
      };
    }
  }

  static async searchLocations(query: string): Promise<Location[]> {
    if (!query || query.length < 2) return [];
    
    try {
      // Use Nominatim search API for real-time location search
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RideSharingApp/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        return data.map((result: {
          lat: string;
          lon: string;
          display_name: string;
          address?: {
            road?: string;
            city?: string;
            town?: string;
            village?: string;
            country?: string;
            postcode?: string;
          };
        }) => ({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          address: result.display_name,
          streetName: result.address?.road,
          city: result.address?.city || result.address?.town || result.address?.village,
          country: result.address?.country,
          postalCode: result.address?.postcode
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Location search error:', error);
      return [];
    }
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
