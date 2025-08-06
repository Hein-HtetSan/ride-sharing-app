import React, { useRef, useEffect, useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import { MapPin, Navigation } from 'lucide-react';
import { Location } from '../../types';

interface LocationSearchProps {
  placeholder: string;
  onLocationSelect: (location: Location) => void;
  icon?: 'pickup' | 'destination';
  value?: string;
  disabled?: boolean;
}

const AutocompleteInput: React.FC<{
  placeholder: string;
  onLocationSelect: (location: Location) => void;
  icon?: 'pickup' | 'destination';
  value?: string;
  disabled?: boolean;
}> = ({ placeholder, onLocationSelect, icon, value, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    if (inputRef.current && window.google?.maps?.places) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'mm' }, // Myanmar - change as needed
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          const addressComponents = place.address_components || [];
          const location: Location = {
            lat,
            lng,
            address: place.formatted_address || '',
            streetName: addressComponents.find(c => c.types.includes('route'))?.long_name,
            city: addressComponents.find(c => c.types.includes('locality'))?.long_name,
            country: addressComponents.find(c => c.types.includes('country'))?.long_name,
            postalCode: addressComponents.find(c => c.types.includes('postal_code'))?.long_name
          };
          
          onLocationSelect(location);
          setInputValue(location.address);
        }
      });
    }
  }, [onLocationSelect]);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const IconComponent = icon === 'pickup' ? MapPin : Navigation;
  const iconColor = icon === 'pickup' ? 'text-green-600' : 'text-red-600';

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={disabled}
      />
      <IconComponent className={`absolute left-3 top-3.5 h-5 w-5 ${iconColor}`} />
    </div>
  );
};

const LocationSearch: React.FC<LocationSearchProps> = ({
  placeholder,
  onLocationSelect,
  icon,
  value,
  disabled
}) => {
  const apiKey = import.meta.env.VITE_REACT_APP_GOOGLE_MAPS_API_KEY;
  const [hasError, setHasError] = useState(false);
  
  if (!apiKey || hasError) {
    const IconComponent = icon === 'pickup' ? MapPin : Navigation;
    const iconColor = icon === 'pickup' ? 'text-green-400' : 'text-red-400';
    
    return (
      <div className="relative">
        <input
          type="text"
          placeholder={`${placeholder} (Enter manually)`}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={value || ''}
          onChange={(e) => {
            // Simple manual location entry
            if (e.target.value.includes(',')) {
              const coords = e.target.value.split(',').map(s => s.trim());
              if (coords.length === 2) {
                const lat = parseFloat(coords[0]);
                const lng = parseFloat(coords[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                  onLocationSelect({
                    lat,
                    lng,
                    address: e.target.value,
                    streetName: undefined,
                    city: undefined,
                    country: undefined,
                    postalCode: undefined
                  });
                }
              }
            }
          }}
          disabled={disabled}
        />
        <IconComponent className={`absolute left-3 top-3.5 h-5 w-5 ${iconColor}`} />
      </div>
    );
  }

  return (
    <Wrapper 
      apiKey={apiKey} 
      libraries={['places']}
      render={(status) => {
        if (status === 'FAILURE') {
          setHasError(true);
          return (
            <div className="relative">
              <input
                type="text"
                placeholder={`${placeholder} (Enter manually)`}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled
              />
              <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            </div>
          );
        }
        return (
          <AutocompleteInput
            placeholder={placeholder}
            onLocationSelect={onLocationSelect}
            icon={icon}
            value={value}
            disabled={disabled}
          />
        );
      }}
    />
  );
};

export default LocationSearch;
