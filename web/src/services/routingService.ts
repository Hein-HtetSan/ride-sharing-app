import { Location } from '../types';

interface RouteResponse {
  coordinates: [number, number][];
  distance: number; // in kilometers
  duration: number; // in seconds
  error?: string;
}

class RoutingService {
  // In-memory simple route cache
  private static _routeCache: Map<string, { ts: number; data: RouteResponse }> | null = null;
  // Using OpenRouteService (free API with 2000 requests/day)
  private static readonly ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;
  private static readonly ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';
  
  // OSRM fallback (free, no API key required)
  private static readonly OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

  // Use same-origin proxies in production to avoid CORS/network blocks
  private static get orsBase(): string {
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('sharelite.site')) {
      return '/routing/ors/v2/directions/driving-car';
    }
    return this.ORS_BASE_URL;
  }

  private static get osrmBase(): string {
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('sharelite.site')) {
      return '/routing/osrm/route/v1/driving';
    }
    return this.OSRM_BASE_URL;
  }

  /**
   * Get route between two points using ONLY OSRM (no fallbacks)
   */
  static async getRoute(start: Location, end: Location): Promise<RouteResponse> {
    console.log('🗺️ Using OSRM routing only (no fallbacks)');
    return await this.getRouteFromOSRM(start, end);
  }

  /**
   * Update location pin on existing route without recalculating the entire route
   * This is used for live tracking to avoid continuous API calls
   */
  static updateLocationOnRoute(
    currentRoute: [number, number][], 
    newLocation: Location
  ): [number, number][] {
    if (!currentRoute || currentRoute.length === 0) {
      return [[newLocation.lat, newLocation.lng]];
    }

    // Find the closest point on the route to the new location
    let closestIndex = 0;
    let minDistance = Number.MAX_VALUE;

    currentRoute.forEach((point, index) => {
      const distance = this.calculateHaversineDistance(
        { lat: point[0], lng: point[1], address: '' },
        newLocation
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Create new route with updated location
    const updatedRoute = [...currentRoute];
    updatedRoute[closestIndex] = [newLocation.lat, newLocation.lng];

    console.log('📍 Updated location pin on existing route without API call');
    return updatedRoute;
  }

  /**
   * OpenRouteService routing
   */
  private static async getRouteFromORS(start: Location, end: Location): Promise<RouteResponse> {
  const url = `${this.orsBase}?api_key=${this.ORS_API_KEY}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
    
    console.log('📡 ORS API Request:', url.replace(this.ORS_API_KEY || '', '[API_KEY]'));
    
    try {
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
          'User-Agent': 'ShareLite/1.0 (https://sharelite.site)',
          'Referer': window.location.hostname.includes('sharelite.site') ? 'https://sharelite.site' : 'http://localhost:5173'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ORS API HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
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
      
      console.log('🎯 ORS Route calculated:', {
        distance: `${result.distance.toFixed(2)} km`,
        duration: `${Math.round(result.duration / 60)} min`,
        points: coordinates.length
      });
      
      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('ORS API request timed out after 25 seconds');
        }
        throw error;
      }
      throw new Error('Unknown error occurred while fetching route from ORS');
    }
  }

  /**
   * OSRM routing (free, no API key required)
   */
  private static async getRouteFromOSRM(start: Location, end: Location): Promise<RouteResponse> {
    // Validate coordinates early
    const isValidCoord = (v: number) => typeof v === 'number' && isFinite(v) && Math.abs(v) > 0.000001;
    if (!isValidCoord(start.lat) || !isValidCoord(start.lng) || !isValidCoord(end.lat) || !isValidCoord(end.lng)) {
      console.warn('⚠️ Invalid coordinates supplied to OSRM. Falling back to straight line.', { start, end });
      return this.getStraightLineRoute(start, end);
    }

    // Deterministic cache key (rounded to 5 decimals to avoid noise)
    const key = `${start.lat.toFixed(5)},${start.lng.toFixed(5)}->${end.lat.toFixed(5)},${end.lng.toFixed(5)}`;
    if (!this._routeCache) this._routeCache = new Map<string, { ts: number; data: RouteResponse }>();
    const CACHE_TTL_MS = 1000 * 60; // 1 minute reuse for identical route
    const cached = this._routeCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      console.log('🗃️ Using cached OSRM route:', key);
      return cached.data;
    }

    const url = `${this.osrmBase}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    console.log('📡 OSRM API Request:', url, 'key:', key);

    const attemptFetch = async (attempt: number): Promise<RouteResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'RideWithUs/1.0' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`HTTP ${response.status} ${response.statusText} body=${body.slice(0,200)}`);
        }
        const data = await response.json();
        if (!data.routes || !data.routes[0]) throw new Error('No route in OSRM response');
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        const result: RouteResponse = {
          coordinates,
          distance: route.distance / 1000,
          duration: route.duration
        };
  // _routeCache guaranteed initialized earlier
  this._routeCache!.set(key, { ts: Date.now(), data: result });
        console.log(`🎯 OSRM Route calculated (attempt ${attempt}):`, {
          distance: `${result.distance.toFixed(2)} km`,
            duration: `${Math.round(result.duration / 60)} min`,
            points: coordinates.length
        });
        return result;
      } catch (e) {
        clearTimeout(timeoutId);
        if (e instanceof Error && e.name === 'AbortError') {
          console.warn(`⏱️ OSRM timeout on attempt ${attempt}`);
        } else {
          console.warn(`⚠️ OSRM fetch failed on attempt ${attempt}:`, e);
        }
        if (attempt < 2) { // total 3 attempts
          const backoff = 300 * attempt; // simple linear backoff
            await new Promise(res => setTimeout(res, backoff));
          return attemptFetch(attempt + 1);
        }
        console.error('❌ OSRM routing failed after retries. Falling back to straight line.');
        return this.getStraightLineRoute(start, end);
      }
    };

    return attemptFetch(1);
  }

  /**
   * Simple straight line route (fallback)
   */
  private static getStraightLineRoute(start: Location, end: Location): RouteResponse {
    console.log('📏 Using straight line fallback routing');
    
    const coordinates: [number, number][] = [
      [start.lat, start.lng],
      [end.lat, end.lng]
    ];

    // Calculate straight-line distance using Haversine formula
    const distance = this.calculateHaversineDistance(start, end);
    const duration = this.estimateDurationFromDistance(distance);

    console.log('📍 Straight line route calculated:', {
      distance: `${distance.toFixed(2)} km`,
      duration: `${Math.round(duration / 60)} min`,
      coordinates: coordinates.length
    });

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

  /**
   * Test connectivity to routing services
   */
  static async testConnectivity(): Promise<{ors: boolean, osrm: boolean}> {
    const testStart: Location = { lat: 52.520008, lng: 13.404954, address: 'Berlin' };
    const testEnd: Location = { lat: 52.520008, lng: 13.414954, address: 'Berlin' };
    
    const results = { ors: false, osrm: false };
    
    // Test ORS
    if (this.ORS_API_KEY) {
      try {
        await this.getRouteFromORS(testStart, testEnd);
        results.ors = true;
        console.log('✅ ORS connectivity test passed');
      } catch (error) {
        console.warn('❌ ORS connectivity test failed:', error);
      }
    }
    
    // Test OSRM
    try {
      await this.getRouteFromOSRM(testStart, testEnd);
      results.osrm = true;
      console.log('✅ OSRM connectivity test passed');
    } catch (error) {
      console.warn('❌ OSRM connectivity test failed:', error);
    }
    
    return results;
  }
}

export { RoutingService };
export type { RouteResponse };
