import { Location } from '../types';

interface RouteResponse {
  coordinates: [number, number][];
  distance: number; // in kilometers
  duration: number; // in seconds
  error?: string;
}

class RoutingService {
  // Using OpenRouteService (free API with 2000 requests/day)
  private static readonly ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;
  private static readonly ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

  // Alternative: Using GraphHopper (free API with 500 requests/day)
  private static readonly GRAPHHOPPER_API_KEY = import.meta.env.VITE_GRAPHHOPPER_API_KEY;
  private static readonly GRAPHHOPPER_BASE_URL = 'https://graphhopper.com/api/1/route';

  /**
   * Get route between two points using OpenRouteService
   */
  static async getRoute(start: Location, end: Location): Promise<RouteResponse> {
    try {
      console.log('🛣️ RoutingService: Getting route from', start.address, 'to', end.address);
      
      // Try OpenRouteService first
      if (this.ORS_API_KEY) {
        console.log('✅ Using OpenRouteService with API key');
        return await this.getRouteFromORS(start, end);
      }
      
      // Fallback to GraphHopper
      if (this.GRAPHHOPPER_API_KEY) {
        console.log('⚠️ Using GraphHopper fallback');
        return await this.getRouteFromGraphHopper(start, end);
      }

      console.warn('⚠️ No API keys available, using straight line');
      // Ultimate fallback: simple straight line
      return this.getStraightLineRoute(start, end);
    } catch (error) {
      console.warn('❌ Routing service failed, using straight line:', error);
      return this.getStraightLineRoute(start, end);
    }
  }

  /**
   * OpenRouteService routing
   */
  private static async getRouteFromORS(start: Location, end: Location): Promise<RouteResponse> {
    const url = `${this.ORS_BASE_URL}?api_key=${this.ORS_API_KEY}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
    
    console.log('🌐 ORS Request URL:', url.replace(this.ORS_API_KEY, '[API_KEY_HIDDEN]'));
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
      }
    });

    if (!response.ok) {
      console.error('❌ ORS API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ ORS Error details:', errorText);
      throw new Error(`ORS API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ ORS API Response received:', data);
    
    if (!data.features || !data.features[0]) {
      throw new Error('No route found in ORS response');
    }
    
    const route = data.features[0];
    const coordinates = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    
    const result = {
      coordinates,
      distance: route.properties.segments[0].distance / 1000, // Convert to km
      duration: route.properties.segments[0].duration, // Already in seconds
    };
    
    console.log('✅ ORS Route calculated:', {
      distance: `${result.distance.toFixed(2)}km`,
      duration: this.formatDuration(result.duration),
      coordinatesCount: coordinates.length
    });
    
    return result;
  }

  /**
   * GraphHopper routing
   */
  private static async getRouteFromGraphHopper(start: Location, end: Location): Promise<RouteResponse> {
    const url = `${this.GRAPHHOPPER_BASE_URL}?point=${start.lat},${start.lng}&point=${end.lat},${end.lng}&vehicle=car&key=${this.GRAPHHOPPER_API_KEY}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`GraphHopper API error: ${response.status}`);
    }

    const data = await response.json();
    const path = data.paths[0];
    
    // Decode the geometry (simplified for demo)
    const coordinates: [number, number][] = path.points.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    
    return {
      coordinates,
      distance: path.distance / 1000, // Convert to km
      duration: path.time / 1000, // Convert to seconds
    };
  }

  /**
   * Simple straight line route (fallback)
   */
  private static getStraightLineRoute(start: Location, end: Location): RouteResponse {
    const coordinates: [number, number][] = [
      [start.lat, start.lng],
      [end.lat, end.lng]
    ];

    // Calculate straight-line distance using Haversine formula
    const distance = this.calculateHaversineDistance(start, end);
    const duration = this.estimateDurationFromDistance(distance);

    return {
      coordinates,
      distance,
      duration,
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateHaversineDistance(start: Location, end: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(end.lat - start.lat);
    const dLng = this.toRadians(end.lng - start.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(start.lat)) * Math.cos(this.toRadians(end.lat)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Estimate travel duration based on distance (realistic city driving)
   */
  private static estimateDurationFromDistance(distance: number): number {
    // More realistic city driving speeds
    let avgSpeedKmh: number;
    
    if (distance < 2) {
      // Short distances: lots of stops, traffic lights, pedestrians
      avgSpeedKmh = 15; // 15 km/h for short city trips
    } else if (distance < 10) {
      // Medium distances: mixed city traffic
      avgSpeedKmh = 25; // 25 km/h for medium city trips
    } else {
      // Longer distances: some highway/main roads
      avgSpeedKmh = 35; // 35 km/h for longer trips
    }
    
    const durationHours = distance / avgSpeedKmh;
    const totalMinutes = Math.round(durationHours * 60);
    
    // Ensure minimum realistic time - at least 2 minutes per km in heavy traffic
    const finalMinutes = Math.max(totalMinutes, Math.round(distance * 2));
    
    console.log(`🕐 Fallback duration: ${distance.toFixed(1)}km at ${avgSpeedKmh}km/h = ${finalMinutes} minutes`);
    
    return finalMinutes * 60; // Convert to seconds
  }

  /**
   * Format duration from seconds to human readable string
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} min`;
    }
  }

  /**
   * Get multiple routes for comparison (if API supports it)
   */
  static async getAlternativeRoutes(start: Location, end: Location): Promise<RouteResponse[]> {
    try {
      // For now, return single route
      const route = await this.getRoute(start, end);
      return [route];
    } catch (error) {
      console.error('Failed to get alternative routes:', error);
      return [this.getStraightLineRoute(start, end)];
    }
  }
}

export { RoutingService };
export type { RouteResponse };
