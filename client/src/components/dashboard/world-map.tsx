import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import { authenticatedRequest } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package } from "lucide-react";
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
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color}; 
        width: ${Math.max(20, Math.min(40, 20 + count * 3))}px; 
        height: ${Math.max(20, Math.min(40, 20 + count * 3))}px; 
        border-radius: 50%; 
        border: 3px solid white; 
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${count > 9 ? '10px' : '12px'};
      ">
        ${count}
      </div>
    `,
    iconSize: [Math.max(20, Math.min(40, 20 + count * 3)), Math.max(20, Math.min(40, 20 + count * 3))],
    className: 'custom-div-icon'
  });
};

export function WorldMap() {
  const [locationData, setLocationData] = useState<AssetLocationData[]>([]);
  const [availableCoordinates, setAvailableCoordinates] = useState<LocationCoordinates>({});

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
    if (assetsData?.assets && Array.isArray(assetsData.assets) && availableCoordinates) {
      // Aggregate assets by country
      const countryMap = new Map<string, AssetLocationData>();
      
      assetsData.assets.forEach((asset: any) => {
        if (asset.country) {
          if (countryMap.has(asset.country)) {
            const existing = countryMap.get(asset.country)!;
            existing.asset_count += 1;
          } else {
            // Get country coordinates
            let coordinates: [number, number] | undefined;
            const coordData = availableCoordinates[asset.country];
            if (coordData) {
              coordinates = [coordData.lat, coordData.lng];
            }

            countryMap.set(asset.country, {
              country: asset.country,
              asset_count: 1,
              coordinates: coordinates
            });
          }
        }
      });

      setLocationData(Array.from(countryMap.values()));
    }
  }, [assetsData, availableCoordinates]);

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
        <div className="h-[400px] w-full rounded-lg overflow-hidden border" data-testid="map-container">
          <MapContainer
            center={[30, 20]}
            zoom={3}
            style={{ height: '100%', width: '100%' }}
            data-testid="leaflet-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {locationData.map((location, index) => {
              if (!location.coordinates) return null;
              
              return (
                <Marker
                  key={`${location.country}-${index}`}
                  position={location.coordinates}
                  icon={createCustomMarker(location.asset_count)}
                  data-testid={`marker-${location.country.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-semibold text-lg mb-2">
                        {location.country}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Assets:</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                          {location.asset_count} {location.asset_count === 1 ? 'asset' : 'assets'}
                        </Badge>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
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
              <span>2-3 assets</span>
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
    </Card>
  );
}