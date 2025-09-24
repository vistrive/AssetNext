import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Globe, Flag, Building2 } from "lucide-react";
import { authenticatedRequest } from "@/lib/auth";

interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
}

interface State {
  id: number;
  name: string;
  country_id: number;
  iso2: string;
}

interface City {
  id: string;
  name: string;
  state_id: string;
}

interface LocationSelectorProps {
  country?: string;
  state?: string;
  city?: string;
  onLocationChange: (location: { country?: string; state?: string; city?: string }) => void;
  dataTestId?: string;
}

export function LocationSelector({ 
  country, 
  state, 
  city, 
  onLocationChange,
  dataTestId = "location-selector"
}: LocationSelectorProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setIsLoadingCountries(true);
        const response = await authenticatedRequest('GET', '/api/geographic/countries');
        const countriesData = await response.json();
        setCountries(countriesData);
        
        // If there's a pre-selected country, find and set it
        if (country) {
          const foundCountry = countriesData.find((c: Country) => c.name === country);
          if (foundCountry) {
            setSelectedCountry(foundCountry);
          }
        }
      } catch (error) {
        console.error('Failed to load countries:', error);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    loadCountries();
  }, [country]);

  // Load states when country changes
  useEffect(() => {
    const loadStates = async () => {
      if (!selectedCountry) {
        setStates([]);
        return;
      }

      try {
        setIsLoadingStates(true);
        const response = await authenticatedRequest('GET', `/api/geographic/states?countryId=${selectedCountry.id}`);
        const countryStates = await response.json();
        setStates(countryStates);
      } catch (error) {
        console.error('Failed to load states:', error);
        setStates([]);
      } finally {
        setIsLoadingStates(false);
      }
    };

    loadStates();
  }, [selectedCountry]);

  // Load cities when state changes
  useEffect(() => {
    const loadCities = async () => {
      if (!selectedState) {
        setCities([]);
        return;
      }

      try {
        setIsLoadingCities(true);
        const response = await authenticatedRequest('GET', `/api/geographic/cities?stateId=${selectedState.id}`);
        const stateCities = await response.json();
        setCities(stateCities);
      } catch (error) {
        console.error('Failed to load cities:', error);
        setCities([]);
      } finally {
        setIsLoadingCities(false);
      }
    };

    loadCities();
  }, [selectedState]);

  // Initialize selected state from props
  useEffect(() => {
    if (state && states.length > 0) {
      const foundState = states.find(s => s.name === state);
      if (foundState) {
        setSelectedState(foundState);
      }
    }
  }, [state, states]);

  const handleCountryChange = (countryName: string) => {
    const foundCountry = countries.find(c => c.name === countryName);
    setSelectedCountry(foundCountry || null);
    setSelectedState(null); // Reset state selection
    
    // Reset state and city when country changes
    onLocationChange({
      country: countryName,
      state: undefined,
      city: undefined
    });
  };

  const handleStateChange = (stateName: string) => {
    const foundState = states.find(s => s.name === stateName);
    setSelectedState(foundState || null);
    
    // Reset city when state changes
    onLocationChange({
      country: selectedCountry?.name,
      state: stateName,
      city: undefined
    });
  };

  const handleCityChange = (cityName: string) => {
    onLocationChange({
      country: selectedCountry?.name,
      state: selectedState?.name,
      city: cityName
    });
  };

  const clearLocation = () => {
    setSelectedCountry(null);
    setSelectedState(null);
    setCities([]);
    onLocationChange({
      country: undefined,
      state: undefined,
      city: undefined
    });
  };

  return (
    <div className="space-y-4" data-testid={dataTestId}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        {(country || state || city) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearLocation}
            data-testid="button-clear-location"
          >
            Clear
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          {/* Country Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-sm text-muted-foreground">
              <Globe className="h-3 w-3" />
              Country
            </Label>
            <Select 
              value={country || ""} 
              onValueChange={handleCountryChange}
              disabled={isLoadingCountries}
            >
              <SelectTrigger data-testid="select-country">
                <SelectValue placeholder={isLoadingCountries ? "Loading countries..." : "Select country"} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    <div className="flex items-center gap-2">
                      <Flag className="h-3 w-3" />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State Selection */}
          {selectedCountry && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-3 w-3" />
                State/Province
              </Label>
              <Select 
                value={state || ""} 
                onValueChange={handleStateChange}
                disabled={isLoadingStates || states.length === 0}
              >
                <SelectTrigger data-testid="select-state">
                  <SelectValue placeholder={
                    isLoadingStates ? "Loading states..." : 
                    states.length === 0 ? "No states available" :
                    "Select state/province"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* City Selection - Predefined dropdown cascading from state */}
          {selectedState && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                City/Location
              </Label>
              <Select 
                value={city || ""} 
                onValueChange={handleCityChange}
                disabled={isLoadingCities || cities.length === 0}
              >
                <SelectTrigger data-testid="select-city">
                  <SelectValue placeholder={
                    isLoadingCities ? "Loading cities..." : 
                    cities.length === 0 ? "No cities available" :
                    "Select city"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Display Current Selection */}
          {(country || state || city) && (
            <div className="mt-3 p-2 bg-muted rounded text-sm">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <MapPin className="h-3 w-3" />
                Selected Location:
              </div>
              <div className="font-medium">
                {[city, state, country].filter(Boolean).join(', ') || 'None selected'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}