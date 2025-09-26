import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import { authenticatedRequest } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Package, Navigation, Eye, Calendar, DollarSign, User, Building } from "lucide-react";
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
  const [locationData, setLocationData] = useState<AssetLocationData[]>([]);
  const [availableCoordinates, setAvailableCoordinates] = useState<LocationCoordinates>({});
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryAssets, setCountryAssets] = useState<any[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);

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
    
    if (assets.length > 0 && availableCoordinates && Object.keys(availableCoordinates).length > 0) {
      // Aggregate assets by country
      const countryMap = new Map<string, AssetLocationData>();
      
      assets.forEach((asset: any) => {
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

      const locationData = Array.from(countryMap.values());
      setLocationData(locationData);
    }
  }, [assetsData, availableCoordinates]);

  // Function to zoom to a specific country
  const zoomToCountry = (countryData: AssetLocationData) => {
    if (mapInstance && countryData.coordinates) {
      mapInstance.setView(countryData.coordinates, 6, {
        animate: true,
        duration: 1.0
      });
    }
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
          {/* Countries List Side Panel */}
          <div className="w-64 flex-shrink-0">
            <div className="h-full border rounded-lg bg-muted/30">
              <div className="p-3 border-b">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Countries with Assets
                </h4>
              </div>
              <ScrollArea className="h-[340px] p-2">
                <div className="space-y-1">
                  {locationData
                    .filter(location => location.coordinates)
                    .sort((a, b) => b.asset_count - a.asset_count)
                    .map((location, index) => (
                    <Button
                      key={`country-${location.country}-${index}`}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-auto p-2 text-left"
                      onClick={() => zoomToCountry(location)}
                      data-testid={`country-button-${location.country.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="font-medium text-sm truncate w-full">
                          {location.country}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {location.asset_count} {location.asset_count === 1 ? 'asset' : 'assets'}
                        </span>
                      </div>
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0 ml-2" 
                        style={{ backgroundColor: getMarkerColor(location.asset_count) }}
                      />
                    </Button>
                  ))}
                  {locationData.filter(location => location.coordinates).length === 0 && (
                    <div className="text-center text-muted-foreground text-sm p-4">
                      No countries with assets found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          {/* Map Container */}
          <div className="flex-1 rounded-lg overflow-hidden border" data-testid="map-container">
            <MapContainer
              center={[30, 20]}
              zoom={3}
              style={{ height: '100%', width: '100%' }}
              data-testid="leaflet-map"
            >
              <MapController onMapReady={setMapInstance} />
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
                        <h3 className="font-semibold text-lg mb-3">
                          {location.country}
                        </h3>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm">Total Assets:</span>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            {location.asset_count} {location.asset_count === 1 ? 'asset' : 'assets'}
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => showCountryAssets(location.country)}
                          className="w-full"
                          data-testid={`view-assets-${location.country.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Asset Details
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
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
      <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Assets in {selectedCountry}
            </DialogTitle>
            <DialogDescription>
              Detailed information for {countryAssets.length} {countryAssets.length === 1 ? 'asset' : 'assets'} located in {selectedCountry}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-hidden">
            <ScrollArea className="h-[60vh]">
              {countryAssets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead>Purchase Cost</TableHead>
                      <TableHead>Warranty Expiry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countryAssets.map((asset: any, index: number) => (
                      <TableRow key={asset.id || index} data-testid={`asset-row-${index}`}>
                        <TableCell className="font-medium">
                          {asset.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {asset.type || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{asset.category || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {asset.serialNumber || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={asset.status === 'deployed' ? 'default' : 
                                   asset.status === 'in-stock' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {asset.status || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {asset.assignedUserName ? (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="text-xs">{asset.assignedUserName}</span>
                            </div>
                          ) : 'Unassigned'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {[asset.city, asset.state, asset.country].filter(Boolean).join(', ') || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(asset.purchaseDate)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(asset.purchaseCost)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(asset.warrantyExpiry)}
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
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}