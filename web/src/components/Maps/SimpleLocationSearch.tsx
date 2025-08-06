import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';
import { Location } from '../../types';
import { LocationService } from '../../services/locationService';

interface SimpleLocationSearchProps {
  placeholder: string;
  onLocationSelect: (location: Location) => void;
  icon?: 'pickup' | 'destination';
  value?: string;
  disabled?: boolean;
}

const SimpleLocationSearch: React.FC<SimpleLocationSearchProps> = ({
  placeholder,
  onLocationSelect,
  icon,
  value,
  disabled
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);

    if (query.length > 1) {
      // Check if it's coordinates (lat,lng format)
      const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          const location: Location = {
            lat,
            lng,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            streetName: undefined,
            city: undefined,
            country: undefined,
            postalCode: undefined
          };
          setSuggestions([location]);
          setShowSuggestions(true);
          return;
        }
      }

      // Search locations
      const results = LocationService.searchLocations(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (location: Location) => {
    setInputValue(location.address);
    setShowSuggestions(false);
    onLocationSelect(location);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const IconComponent = icon === 'pickup' ? MapPin : Navigation;
  const iconColor = icon === 'pickup' ? 'text-green-600' : 'text-red-600';

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-sm"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <IconComponent className={`absolute left-2.5 top-2.5 h-4 w-4 ${iconColor}`} />
        <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((location, index) => (
            <div
              key={index}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionClick(location)}
            >
              <div className="flex items-start space-x-2">
                <MapPin className="h-3 w-3 text-gray-500 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {location.address}
                  </p>
                  {(location.city || location.country) && (
                    <p className="text-xs text-gray-500 truncate">
                      {[location.city, location.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {inputValue.length > 1 && !inputValue.includes(',') && (
            <div className="p-2 bg-gray-50 border-t">
              <p className="text-xs text-gray-600">
                💡 Try coordinates like "16.8661, 96.1951"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleLocationSearch;
