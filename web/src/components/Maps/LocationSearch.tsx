import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { Location } from '../../types';

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void;
  placeholder?: string;
  className?: string;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  onLocationSelect,
  placeholder = "Search for a location...",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number>();

  // Search function using Nominatim (OpenStreetMap geocoding)
  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      // Use Nominatim for geocoding (OpenStreetMap's free geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RideSharingApp/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const locations: Location[] = data.map((place: {
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
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon),
          address: place.display_name,
          streetName: place.address?.road,
          city: place.address?.city || place.address?.town || place.address?.village,
          country: place.address?.country,
          postalCode: place.address?.postcode
        }));
        setSuggestions(locations);
      } else {
        console.error('Nominatim API response error:', response.status);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Nominatim search failed:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(value);
    }, 300);
  };

  // Handle location selection
  const handleLocationSelect = (location: Location) => {
    setQuery(location.address);
    setShowSuggestions(false);
    onLocationSelect(location);
    inputRef.current?.blur();
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
        
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="map-overlay-suggestions w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Searching locations...
              </div>
            </div>
          ) : query.length < 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              <div className="text-center">
                <p>Type at least 2 characters to search</p>
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((location, index) => (
              <button
                key={index}
                onClick={() => handleLocationSelect(location)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b last:border-b-0 border-gray-100"
              >
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {location.address}
                    </p>
                    {location.city && (
                      <p className="text-xs text-gray-500 mt-1">
                        {location.city}{location.country && `, ${location.country}`}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              <div className="text-center">
                <p className="mb-1">No locations found for "{query}"</p>
                <p className="text-xs">Try searching for a city, address, or landmark</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
