// Simple address service using OpenStreetMap Nominatim for reverse geocoding
export class AddressService {
  private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

  /**
   * Convert coordinates to a readable address using reverse geocoding
   */
  static async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RideSharingApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();
      
      if (data && data.display_name) {
        // Extract meaningful parts of the address
        const address = data.address || {};
        const parts = [];
        
        // Add house number and road
        if (address.house_number && address.road) {
          parts.push(`${address.house_number} ${address.road}`);
        } else if (address.road) {
          parts.push(address.road);
        }
        
        // Add neighborhood or suburb
        if (address.neighbourhood || address.suburb) {
          parts.push(address.neighbourhood || address.suburb);
        }
        
        // Add city or town
        if (address.city || address.town) {
          parts.push(address.city || address.town);
        }

        const formattedAddress = parts.length > 0 ? parts.join(', ') : data.display_name;
        
        // Limit address length for UI display
        return formattedAddress.length > 50 
          ? formattedAddress.substring(0, 47) + '...'
          : formattedAddress;
      }
      
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.warn('Address lookup failed:', error);
      // Return coordinates as fallback
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  /**
   * Cache for storing address lookups to avoid repeated API calls
   */
  private static addressCache = new Map<string, string>();

  /**
   * Get address with caching to improve performance
   */
  static async getCachedAddress(lat: number, lng: number): Promise<string> {
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    if (this.addressCache.has(key)) {
      return this.addressCache.get(key)!;
    }

    const address = await this.getAddressFromCoordinates(lat, lng);
    this.addressCache.set(key, address);
    
    return address;
  }
}
