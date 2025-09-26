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
  state: string;
  city: string;
  asset_count: number;
  coordinates?: [number, number];
}

interface LocationCoordinates {
  [key: string]: [number, number]; // lat, lng
}

// Common location coordinates for demo (in a real app, you'd use a geocoding service)
const locationCoordinates: LocationCoordinates = {
  "India,Tamil Nadu,Maturin": [11.0168, 76.9558], // Chennai area
  "Australia,Western Australia,Pontypridd": [-31.9505, 115.8605], // Perth area
  "United States,California,San Francisco": [37.7749, -122.4194],
  "United Kingdom,England,London": [51.5074, -0.1278],
  "Germany,Bavaria,Munich": [48.1351, 11.5820],
  "Japan,Tokyo,Tokyo": [35.6762, 139.6503],
  "Canada,Ontario,Toronto": [43.6532, -79.3832],
  "France,Île-de-France,Paris": [48.8566, 2.3522],
};

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

  // Fetch assets and aggregate by location
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['/api/assets'],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/assets");
      return response.json();
    },
    enabled: true,
  });

  useEffect(() => {
    if (assetsData?.assets && Array.isArray(assetsData.assets)) {
      // Aggregate assets by location
      const locationMap = new Map<string, AssetLocationData>();
      
      assetsData.assets.forEach((asset: any) => {
        if (asset.country && asset.state && asset.city) {
          const locationKey = `${asset.country},${asset.state},${asset.city}`;
          
          if (locationMap.has(locationKey)) {
            const existing = locationMap.get(locationKey)!;
            existing.asset_count += 1;
          } else {
            const coordinates = locationCoordinates[locationKey];
            locationMap.set(locationKey, {
              country: asset.country,
              state: asset.state,
              city: asset.city,
              asset_count: 1,
              coordinates: coordinates
            });
          }
        }
      });

      setLocationData(Array.from(locationMap.values()));
    }
  }, [assetsData]);

  if (isLoading) {
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
            center={[20, 0]}
            zoom={2}
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
                  key={`${location.country}-${location.state}-${location.city}-${index}`}
                  position={location.coordinates}
                  icon={createCustomMarker(location.asset_count)}
                  data-testid={`marker-${location.city.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-semibold text-lg mb-2">
                        {location.city}, {location.state}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {location.country}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Assets:</span>
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