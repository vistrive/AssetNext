import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import { authenticatedRequest } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Package, Navigation, Eye, Calendar, DollarSign, User, Building, X } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in React Leaflet
let DefaultIcon = L.divIcon({
  html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  className: 'custom-div-icon'
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AssetLocationData {
  country: string;
  asset_count: number;
  coordinates?: [number, number];
}

interface LocationCoordinates {
  [key: string]: {
    lat: number;
    lng: number;
    type: 'country' | 'state' | 'city';
  };
}

interface LocalityData {
  name: string;
  asset_count: number;
  coordinates?: [number, number];
}

interface CityData {
  name: string;
  asset_count: number;
  coordinates?: [number, number];
  localities: LocalityData[];
}

interface StateData {
  name: string;
  asset_count: number;
  coordinates?: [number, number];
  cities: CityData[];
}

interface CountryData {
  name: string;
  asset_count: number;
  coordinates?: [number, number];
  states: StateData[];
}

interface HierarchicalLocationData {
  countries: CountryData[];
}

// Function to get color based on asset count
const getMarkerColor = (count: number): string => {
  if (count >= 10) return '#dc2626'; // red-600
  if (count >= 5) return '#ea580c';  // orange-600
  if (count >= 3) return '#ca8a04';  // yellow-600
  if (count >= 2) return '#16a34a';  // green-600
  return '#3b82f6'; // blue-600
};

// Custom marker component
const createCustomMarker = (count: number) => {
  const color = getMarkerColor(count);
  const size = Math.max(32, Math.min(52, 32 + count * 2));
  const fontSize = count > 99 ? '11px' : count > 9 ? '13px' : '15px';
  
  return L.divIcon({
    html: `<div class="marker-inner" style="
      background-color: ${color}; 
      width: ${size}px; 
      height: ${size}px; 
      border-radius: 50%; 
      border: 3px solid white; 
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${fontSize};
      line-height: 1;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    className: 'custom-marker-icon'
  });
};

// Component to handle map interactions
function MapController({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  
  return null;
}

export function WorldMap() {
  const [, setLocation] = useLocation();
  const [locationData, setLocationData] = useState<AssetLocationData[]>([]);
  const [hierarchicalData, setHierarchicalData] = useState<HierarchicalLocationData>({ countries: [] });
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [availableCoordinates, setAvailableCoordinates] = useState<LocationCoordinates>({});
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryAssets, setCountryAssets] = useState<any[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [initialViewSet, setInitialViewSet] = useState(false);

  // Function to navigate to user profile by user ID, email, or employee ID
  const navigateToUserProfile = async (email?: string, employeeId?: string, userId?: string) => {
    try {
      // If we have an employee ID (numeric User ID), use it directly
      if (employeeId) {
        setLocation(`/users/${employeeId}`);
        return;
      }

      // If we have email, look up the user to get their numeric User ID
      if (email) {
        const queryParam = `email=${encodeURIComponent(email)}`;
        const response = await authenticatedRequest('GET', `/api/users/find?${queryParam}`);
        if (response.ok) {
          const user = await response.json();
          // Use numeric User ID if available, otherwise fall back to UUID
          const userIdentifier = user.userID || user.id;
          setLocation(`/users/${userIdentifier}`);
        } else if (response.status === 404) {
          alert('User profile not found. This user may not have been created in the system yet.');
        } else {
          alert('Unable to load user profile. Please try again.');
        }
        return;
      }

      // If we only have UUID (legacy), look up the user to get their numeric ID
      if (userId) {
        const response = await authenticatedRequest('GET', `/api/users/${userId}`);
        if (response.ok) {
          const user = await response.json();
          // Use numeric User ID if available, otherwise fall back to UUID
          const userIdentifier = user.userID || user.id;
          setLocation(`/users/${userIdentifier}`);
        } else if (response.status === 404) {
          alert('User profile not found.');
        } else {
          alert('Unable to load user profile. Please try again.');
        }
        return;
      }

      alert('No user information available to navigate to profile.');
    } catch (error) {
      console.error('Error navigating to user profile:', error);
      alert('Unable to load user profile. Please try again.');
    }
  };

  // Fetch assets and aggregate by location
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['/api/assets'],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/assets");
      return response.json();
    },
    enabled: true,
  });

  // Fetch available coordinates from geographic data
  const { data: coordinatesData, isLoading: isLoadingCoordinates } = useQuery({
    queryKey: ['/api/geographic/coordinates'],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/geographic/coordinates");
      return response.json();
    },
    enabled: true,
  });

  useEffect(() => {
    if (coordinatesData) {
      setAvailableCoordinates(coordinatesData);
    }
  }, [coordinatesData]);

  useEffect(() => {
    // Handle both array and object formats for assets data
    let assets: any[] = [];
    if (assetsData?.assets && Array.isArray(assetsData.assets)) {
      assets = assetsData.assets;
    } else if (assetsData && typeof assetsData === 'object') {
      // Convert object with numeric keys to array
      assets = Object.values(assetsData);
    }
    
    console.log(`WorldMap: Processing ${assets.length} total assets with ${Object.keys(availableCoordinates).length} coordinate entries`);
    console.log('All assets:', assets.map((a: any) => ({ 
      name: a.name, 
      type: a.type, 
      country: a.country, 
      assignedUser: a.assignedUserName || a.assignedUserEmail 
    })));
    
    // Build asset location mapping including software assigned to hardware/users
    const assetsWithLocation: any[] = [];
    const hardwareAssets = assets.filter((a: any) => a.type === 'Hardware' || a.type === 'hardware');
    console.log(`Found ${hardwareAssets.length} hardware assets`);
    
    assets.forEach((asset: any) => {
      let locationData = null;
      
      if (asset.country) {
        // Asset has direct location data
        locationData = {
          country: asset.country,
          state: asset.state || 'Unknown State',
          city: asset.city || 'Unknown City',
          location: asset.location || asset.city || 'Unknown City'
        };
      } else if (asset.type === 'Software' || asset.type === 'software') {
        // Software without location - get location from the device/hardware it's installed on
        console.log(`Processing software: "${asset.name}"`);
        
        // STRATEGY: All software in same location as any hardware device
        // Assumption: Software licenses are available at locations where we have devices
        // Find any hardware with location and group all software there
        if (hardwareAssets.length > 0) {
          const anyHardwareWithLocation = hardwareAssets.find((hw: any) => hw.country);
          if (anyHardwareWithLocation?.country) {
            locationData = {
              country: anyHardwareWithLocation.country,
              state: anyHardwareWithLocation.state || 'Unknown State',
              city: anyHardwareWithLocation.city || 'Unknown City',
              location: anyHardwareWithLocation.location || anyHardwareWithLocation.city || 'Unknown City'
            };
            console.log(`  ✓ Software "${asset.name}" mapped to location: ${locationData.city}, ${locationData.country}`);
          } else {
            console.log(`  ✗ Software "${asset.name}" could not be mapped - no hardware found with location`);
          }
        }
      }
      
      if (locationData) {
        assetsWithLocation.push({
          ...asset,
          ...locationData
        });
      }
    });
    
    console.log(`WorldMap: ${assetsWithLocation.length} assets have location data (${assets.length - assetsWithLocation.length} assets without location skipped)`);
    
    if (assetsWithLocation.length > 0 && availableCoordinates && Object.keys(availableCoordinates).length > 0) {
      // Build hierarchical structure: Country → State → City → Locality
      const countryMap = new Map<string, CountryData>();
      
      assetsWithLocation.forEach((asset: any) => {
        const country = asset.country;
        const state = asset.state || 'Unknown State';
        const city = asset.city || 'Unknown City';
        const locality = asset.location || city; // Use location field as locality, fallback to city
        
        // Get or create country
        if (!countryMap.has(country)) {
          const coordData = availableCoordinates[country];
          countryMap.set(country, {
            name: country,
            asset_count: 0,
            coordinates: coordData ? [coordData.lat, coordData.lng] : undefined,
            states: []
          });
        }
        const countryData = countryMap.get(country)!;
        countryData.asset_count += 1;
        
        // Get or create state
        let stateData = countryData.states.find(s => s.name === state);
        if (!stateData) {
          const stateKey = `${country},${state}`;
          const coordData = availableCoordinates[stateKey];
          stateData = {
            name: state,
            asset_count: 0,
            coordinates: coordData ? [coordData.lat, coordData.lng] : undefined,
            cities: []
          };
          countryData.states.push(stateData);
        }
        stateData.asset_count += 1;
        
        // Get or create city
        let cityData = stateData.cities.find(c => c.name === city);
        if (!cityData) {
          const cityKey = `${country},${state},${city}`;
          const coordData = availableCoordinates[cityKey];
          cityData = {
            name: city,
            asset_count: 0,
            coordinates: coordData ? [coordData.lat, coordData.lng] : undefined,
            localities: []
          };
          stateData.cities.push(cityData);
        }
        cityData.asset_count += 1;
        
        // Get or create locality (only if different from city)
        if (locality && locality !== city) {
          let localityData = cityData.localities.find(l => l.name === locality);
          if (!localityData) {
            localityData = {
              name: locality,
              asset_count: 0,
              coordinates: cityData.coordinates // Localities share city coordinates
            };
            cityData.localities.push(localityData);
          }
          localityData.asset_count += 1;
        }
      });

      // Convert to array and sort
      const countries = Array.from(countryMap.values())
        .sort((a, b) => b.asset_count - a.asset_count);
      
      countries.forEach(country => {
        country.states.sort((a, b) => b.asset_count - a.asset_count);
        country.states.forEach(state => {
          state.cities.sort((a, b) => b.asset_count - a.asset_count);
          state.cities.forEach(city => {
            city.localities.sort((a, b) => b.asset_count - a.asset_count);
          });
        });
      });
      
      setHierarchicalData({ countries });
      
      // Count total cities with coordinates for debugging
      let citiesWithCoords = 0;
      let citiesWithoutCoords = 0;
      countries.forEach(country => {
        country.states.forEach(state => {
          state.cities.forEach(city => {
            if (city.coordinates) citiesWithCoords++;
            else citiesWithoutCoords++;
          });
        });
      });
      console.log(`WorldMap: ${countries.length} countries, ${citiesWithCoords} cities with coordinates, ${citiesWithoutCoords} cities without coordinates`);
      
      // Also maintain flat country list for map markers
      const locationData = countries.map(c => ({
        country: c.name,
        asset_count: c.asset_count,
        coordinates: c.coordinates
      }));
      setLocationData(locationData);
    }
  }, [assetsData, availableCoordinates]);

  // Set initial map view to country with most assets
  useEffect(() => {
    if (mapInstance && hierarchicalData.countries.length > 0 && !initialViewSet) {
      const topCountry = hierarchicalData.countries[0];
      if (topCountry.coordinates) {
        console.log(`Setting initial view to ${topCountry.name} with ${topCountry.asset_count} assets`);
        mapInstance.setView(topCountry.coordinates, 5, {
          animate: true,
          duration: 1.5
        });
        setInitialViewSet(true);
      }
    }
  }, [mapInstance, hierarchicalData, initialViewSet]);

  // Function to zoom to a specific country
  const zoomToCountry = (countryData: CountryData) => {
    if (mapInstance && countryData.coordinates) {
      console.log(`Zooming to country: ${countryData.name}`);
      mapInstance.flyTo(countryData.coordinates, 5, {
        animate: true,
        duration: 1.5
      });
    }
  };

  // Function to zoom to a specific state
  const zoomToState = (stateData: StateData) => {
    if (mapInstance && stateData.coordinates) {
      console.log(`Zooming to state: ${stateData.name}`);
      mapInstance.flyTo(stateData.coordinates, 7, {
        animate: true,
        duration: 1.5
      });
    }
  };

  // Function to zoom to a specific city
  const zoomToCity = (cityData: CityData) => {
    if (mapInstance && cityData.coordinates) {
      console.log(`Zooming to city: ${cityData.name}`);
      mapInstance.flyTo(cityData.coordinates, 12, {
        animate: true,
        duration: 1.5
      });
    } else if (!cityData.coordinates) {
      console.warn(`City ${cityData.name} has no coordinates`);
    }
  };

  // Function to zoom to a specific locality
  const zoomToLocality = (localityData: LocalityData) => {
    if (mapInstance && localityData.coordinates) {
      console.log(`Zooming to locality: ${localityData.name}`);
      mapInstance.flyTo(localityData.coordinates, 14, {
        animate: true,
        duration: 1.5
      });
    }
  };

  // Toggle expansion functions
  const toggleCountry = (countryName: string) => {
    setExpandedCountries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(countryName)) {
        newSet.delete(countryName);
      } else {
        newSet.add(countryName);
      }
      return newSet;
    });
  };

  const toggleState = (stateName: string) => {
    setExpandedStates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stateName)) {
        newSet.delete(stateName);
      } else {
        newSet.add(stateName);
      }
      return newSet;
    });
  };

  const toggleCity = (cityName: string) => {
    setExpandedCities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cityName)) {
        newSet.delete(cityName);
      } else {
        newSet.add(cityName);
      }
      return newSet;
    });
  };

  // Function to get assets for a specific country
  const getAssetsForCountry = (country: string) => {
    let assets: any[] = [];
    if (assetsData?.assets && Array.isArray(assetsData.assets)) {
      assets = assetsData.assets;
    } else if (assetsData && typeof assetsData === 'object') {
      assets = Object.values(assetsData);
    }
    
    return assets.filter((asset: any) => asset.country === country);
  };

  // Function to show asset details for a country
  const showCountryAssets = (country: string) => {
    const assets = getAssetsForCountry(country);
    setSelectedCountry(country);
    setCountryAssets(assets);
    setShowAssetModal(true);
    
    // Close any open popups when modal opens
    if (mapInstance) {
      mapInstance.closePopup();
    }
  };

  // Function to format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  // Function to format currency
  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined || amount === '') return 'N/A';
    try {
      const num = Number(amount);
      if (isNaN(num)) return 'N/A';
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(num);
    } catch {
      return 'N/A';
    }
  };

  if (isLoading || isLoadingCoordinates) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Asset Distribution Map</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center">
            <div className="text-muted-foreground">Loading map...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2" data-testid="heading-world-map">
          <MapPin className="h-5 w-5" />
          <span>Global Asset Distribution</span>
        </CardTitle>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>{locationData.reduce((sum, loc) => sum + loc.asset_count, 0)} assets across {locationData.length} locations</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 h-[400px]">
          {/* Hierarchical Location Navigator */}
          <div className="w-72 flex-shrink-0">
            <div className="h-full border rounded-lg bg-muted/30">
              <div className="p-3 border-b">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Locations with Assets
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Click to navigate on map
                </p>
              </div>
              <ScrollArea className="h-[340px] p-2">
                <div className="space-y-1">
                  {hierarchicalData.countries.length > 0 ? (
                    // Flatten the hierarchy into a list with full paths
                    hierarchicalData.countries.flatMap((country) =>
                      country.states.flatMap((state) =>
                        state.cities.map((city) => ({
                          country,
                          state,
                          city,
                          fullPath: `${country.name} › ${state.name} › ${city.name}`,
                          key: `${country.name}-${state.name}-${city.name}`
                        }))
                      )
                    ).map(({ country, state, city, fullPath, key }) => (
                      <Button
                        key={key}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-auto p-2 text-left hover:bg-muted"
                        onClick={() => city.coordinates && zoomToCity(city)}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MapPin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                          <span className="text-xs truncate" title={fullPath}>
                            {fullPath}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            ({city.asset_count})
                          </span>
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: getMarkerColor(city.asset_count) }}
                          />
                        </div>
                      </Button>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground text-xs p-4">
                      No locations with assets found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          {/* Map Container */}
          <div className="flex-1 rounded-lg overflow-hidden border relative z-[1000]" data-testid="map-container">
            <MapContainer
              center={[30, 20]}
              zoom={3}
              style={{ height: '100%', width: '100%', zIndex: 1000 }}
              data-testid="leaflet-map"
            >
              <MapController onMapReady={setMapInstance} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Render markers - prioritize city coordinates, fallback to state coordinates */}
              {(() => {
                const markers: JSX.Element[] = [];
                
                hierarchicalData.countries.forEach(country => {
                  country.states.forEach(state => {
                    // Check if any cities in this state have coordinates
                    const citiesWithCoords = state.cities.filter(c => c.coordinates);
                    
                    if (citiesWithCoords.length > 0) {
                      // Render city-level markers
                      citiesWithCoords.forEach((city, cityIndex) => {
                        console.log(`Creating city marker: ${city.name} (${city.asset_count} assets) at [${city.coordinates![0]}, ${city.coordinates![1]}]`);
                        
                        markers.push(
                          <Marker
                            key={`city-${country.name}-${state.name}-${city.name}-${cityIndex}`}
                            position={city.coordinates!}
                            icon={createCustomMarker(city.asset_count)}
                            data-testid={`marker-${city.name.toLowerCase().replace(/\s+/g, '-')}`}
                            eventHandlers={{
                              click: () => {
                                console.log(`City marker clicked: ${city.name}`);
                                zoomToCity(city);
                              }
                            }}
                          >
                        <Popup>
                          <div className="p-2 min-w-[220px]">
                            <h3 className="font-semibold text-base mb-1">
                              {city.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-2">
                              {state.name}, {country.name}
                            </p>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm">Assets in City:</span>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                {city.asset_count} {city.asset_count === 1 ? 'asset' : 'assets'}
                              </Badge>
                            </div>
                            {city.localities.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs font-medium mb-1">Localities:</p>
                                <div className="space-y-1">
                                  {city.localities.map((locality, localityIndex) => (
                                    <div key={localityIndex} className="flex justify-between text-xs">
                                      <span className="truncate text-muted-foreground">{locality.name}</span>
                                      <span className="text-muted-foreground ml-2">({locality.asset_count})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <Button 
                              size="sm" 
                              onClick={() => showCountryAssets(country.name)}
                              className="w-full mt-3"
                              data-testid={`view-assets-${city.name.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View All Assets
                            </Button>
                          </div>
                        </Popup>
                      </Marker>
                        );
                      });
                    } else if (state.coordinates && state.asset_count > 0) {
                      // Fallback: render state-level marker if cities don't have coordinates
                      console.log(`Creating state marker: ${state.name} (${state.asset_count} assets) at [${state.coordinates[0]}, ${state.coordinates[1]}]`);
                      
                      markers.push(
                        <Marker
                          key={`state-${country.name}-${state.name}`}
                          position={state.coordinates}
                          icon={createCustomMarker(state.asset_count)}
                          data-testid={`marker-${state.name.toLowerCase().replace(/\s+/g, '-')}`}
                          eventHandlers={{
                            click: () => {
                              console.log(`State marker clicked: ${state.name}`);
                              zoomToState(state);
                            }
                          }}
                        >
                          <Popup>
                            <div className="p-2 min-w-[220px]">
                              <h3 className="font-semibold text-base mb-1">
                                {state.name}
                              </h3>
                              <p className="text-xs text-muted-foreground mb-2">
                                {country.name}
                              </p>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm">Assets in State:</span>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                  {state.asset_count} {state.asset_count === 1 ? 'asset' : 'assets'}
                                </Badge>
                              </div>
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs font-medium mb-1">Cities:</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {state.cities.map((city, cityIndex) => (
                                    <div key={cityIndex} className="flex justify-between text-xs">
                                      <span className="truncate text-muted-foreground">{city.name}</span>
                                      <span className="text-muted-foreground ml-2">({city.asset_count})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => showCountryAssets(country.name)}
                                className="w-full mt-3"
                                data-testid={`view-assets-state-${state.name.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View All Assets
                              </Button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    }
                  });
                });
                
                console.log(`WorldMap: Rendering ${markers.length} markers`);
                return markers;
              })()}
            </MapContainer>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Asset Count Legend</h4>
          <div className="flex flex-wrap items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
              <span>1 asset</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#16a34a' }}></div>
              <span>2 assets</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ca8a04' }}></div>
              <span>3-4 assets</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ea580c' }}></div>
              <span>5-9 assets</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#dc2626' }}></div>
              <span>10+ assets</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Asset Details Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4" onClick={() => setShowAssetModal(false)}>
          <div 
            className="max-w-5xl w-[90vw] max-h-[90vh] overflow-hidden bg-background border shadow-lg rounded-lg z-[2001] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <Building className="h-6 w-6" />
                    Assets in {selectedCountry}
                  </h2>
                  <p className="text-base text-muted-foreground mt-1">
                    Detailed information for {countryAssets.length} {countryAssets.length === 1 ? 'asset' : 'assets'} located in {selectedCountry}
                  </p>
                </div>
                <button 
                  onClick={() => setShowAssetModal(false)}
                  className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  data-testid="button-close-modal"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="h-[70vh] overflow-hidden">
              <div className="h-full overflow-auto">
                {countryAssets.length > 0 ? (
                  <Table className="min-w-[1600px] w-auto">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Asset Name</TableHead>
                          <TableHead className="min-w-[120px]">Serial Number</TableHead>
                          <TableHead className="min-w-[120px]">Model</TableHead>
                          <TableHead className="min-w-[130px]">Manufacturer</TableHead>
                          <TableHead className="min-w-[100px]">Category</TableHead>
                          <TableHead className="min-w-[100px]">Type</TableHead>
                          <TableHead className="min-w-[80px]">Status</TableHead>
                          <TableHead className="min-w-[150px]">Location</TableHead>
                          <TableHead className="min-w-[120px]">Assigned To</TableHead>
                          <TableHead className="min-w-[160px]">Assigned Email</TableHead>
                          <TableHead className="min-w-[100px]">Employee ID</TableHead>
                          <TableHead className="min-w-[120px]">Purchase Date</TableHead>
                          <TableHead className="min-w-[120px]">Warranty Expiry</TableHead>
                          <TableHead className="min-w-[120px]">Purchase Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {countryAssets.map((asset: any, index: number) => (
                          <TableRow key={asset.id || index} data-testid={`asset-row-${index}`}>
                            <TableCell className="font-medium min-w-[120px]">
                              {asset.name || 'N/A'}
                            </TableCell>
                            <TableCell className="font-mono text-xs min-w-[120px]">
                              {asset.serialNumber || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs min-w-[120px]">
                              {asset.model || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs min-w-[130px]">
                              {asset.manufacturer || 'N/A'}
                            </TableCell>
                            <TableCell className="min-w-[100px]">{asset.category || 'N/A'}</TableCell>
                            <TableCell className="min-w-[100px]">
                              <Badge variant="outline" className="text-xs">
                                {asset.type || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[80px]">
                              <Badge 
                                variant={asset.status === 'deployed' ? 'default' : 
                                       asset.status === 'in-stock' ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {asset.status || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs min-w-[150px]">
                              {[asset.city, asset.state, asset.country].filter(Boolean).join(', ') || 'N/A'}
                            </TableCell>
                            <TableCell className="min-w-[120px]">
                              {asset.assignedUserName ? (
                                <button
                                  onClick={() => navigateToUserProfile(asset.assignedUserEmail || undefined, asset.assignedUserEmployeeId || undefined, asset.assignedUserId || undefined)}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-xs transition-colors"
                                  data-testid={`link-user-${index}`}
                                >
                                  <User className="h-3 w-3" />
                                  <span>{asset.assignedUserName}</span>
                                </button>
                              ) : 'Unassigned'}
                            </TableCell>
                            <TableCell className="text-xs min-w-[160px]">
                              {asset.assignedUserEmail ? (
                                <button
                                  onClick={() => navigateToUserProfile(asset.assignedUserEmail || undefined, asset.assignedUserEmployeeId || undefined, asset.assignedUserId || undefined)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-xs transition-colors break-all"
                                  data-testid={`link-user-email-${index}`}
                                >
                                  {asset.assignedUserEmail}
                                </button>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs min-w-[100px]">
                              {asset.assignedUserEmployeeId ? (
                                <button
                                  onClick={() => navigateToUserProfile(asset.assignedUserEmail || undefined, asset.assignedUserEmployeeId || undefined, asset.assignedUserId || undefined)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-xs transition-colors font-mono"
                                  data-testid={`link-user-employee-id-${index}`}
                                >
                                  {asset.assignedUserEmployeeId}
                                </button>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs min-w-[120px]">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(asset.purchaseDate)}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs min-w-[120px]">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(asset.warrantyExpiry)}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs min-w-[120px]">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(asset.purchaseCost)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No assets found for {selectedCountry}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}