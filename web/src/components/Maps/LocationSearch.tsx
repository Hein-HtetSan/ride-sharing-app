import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Search, X } from 'lucide-react';
import { Location } from '../../types';

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void;
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean; // Add disabled prop
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  onLocationSelect,
  placeholder = "Search for a location...",
  className = "",
  value,
  onChange,
  disabled = false
}) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number>();

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 768; // md breakpoint
      
      let top;
      if (isMobile) {
        // On mobile: position above the search field
        top = rect.top + window.scrollY - 8;
      } else {
        // On desktop: position below the search field
        top = rect.bottom + window.scrollY + 8;
      }
      
      setDropdownPosition({
        top,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Update position when showing suggestions
  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      updateDropdownPosition();
    }
  }, [showSuggestions]);

  // Update internal query when external value changes
  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

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
            'User-Agent': 'RideWithUs/1.0'
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
    if (disabled) return; // Don't allow changes when disabled
    
    const value = e.target.value;
    setQuery(value);
    onChange?.(value); // Call external onChange if provided
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
    onChange?.(location.address); // Call external onChange if provided
    setShowSuggestions(false);
    onLocationSelect(location);
    inputRef.current?.blur();
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    onChange?.(''); // Call external onChange if provided
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
    
    // Clear the selected location by calling onLocationSelect with null-like location
    onLocationSelect({
      lat: 0,
      lng: 0,
      address: ''
    });
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't close if clicking on the input or suggestions
      if (inputRef.current && 
          (inputRef.current.contains(target) || 
           target.closest('.suggestions-dropdown'))) {
        return;
      }
      
      setShowSuggestions(false);
    };

    const handleResize = () => {
      if (showSuggestions) {
        updateDropdownPosition();
      }
    };

    const handleScroll = () => {
      if (showSuggestions) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true); // Use capture to handle all scroll events
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [showSuggestions]);

  return (
    <div className={`relative ${className}`} style={{ overflow: 'visible' }}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => !disabled && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`block w-full pl-10 pr-12 py-3 border-0 focus:ring-0 focus:outline-none text-sm bg-transparent placeholder-gray-500 font-medium ${
            disabled 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-900'
          }`}
          autoComplete="off"
        />
        
        {query && !isLoading && !disabled && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-xl transition-colors duration-200"
            type="button"
            title="Clear search"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
        
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Suggestions dropdown - rendered in portal to avoid overflow issues */}
      {showSuggestions && !disabled && createPortal(
        <div 
          className="suggestions-dropdown bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto" 
          style={{ 
            position: 'fixed',
            zIndex: 999999,
            left: dropdownPosition.left,
            top: dropdownPosition.top,
            width: dropdownPosition.width,
            maxHeight: '200px',
            backgroundColor: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflowY: 'auto'
          }}
        >
          {isLoading ? (
            <div className="px-4 py-4 text-sm text-gray-600">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="font-medium">Searching locations...</span>
              </div>
            </div>
          ) : query.length < 2 ? (
            <div className="px-4 py-4 text-sm text-gray-600">
              <div className="text-center">
                <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="font-bold text-gray-800">Start typing to search</p>
                <p className="text-xs mt-1 text-gray-500">Enter at least 2 characters</p>
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((location, index) => (
              <button
                key={index}
                onClick={() => handleLocationSelect(location)}
                onMouseDown={(e) => {
                  // Prevent the input from losing focus before the click is processed
                  e.preventDefault();
                  handleLocationSelect(location);
                }}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b last:border-b-0 border-gray-200 cursor-pointer transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl"
                style={{ pointerEvents: 'auto' }}
              >
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {location.address}
                    </p>
                    {location.city && (
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        📍 {location.city}{location.country && `, ${location.country}`}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-4 text-sm text-gray-600">
              <div className="text-center">
                <div className="text-gray-400 text-2xl mb-2">🔍</div>
                <p className="font-bold text-gray-800 mb-1">No locations found</p>
                <p className="text-xs text-gray-500">Try searching for a city, address, or landmark</p>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default LocationSearch;
