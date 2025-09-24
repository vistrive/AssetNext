import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { authenticatedRequest } from "@/lib/auth";
import { Globe, MapPin, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryAssets {
  country: string;
  count: number;
  percentage: number;
  locations: string[];
}

interface AssetLocation {
  location: string;
  count: number;
}

// Simple country mapping for common locations
const countryMapping: Record<string, string> = {
  // North America
  "United States": "US",
  "USA": "US", 
  "America": "US",
  "New York": "US",
  "California": "US",
  "Texas": "US",
  "Florida": "US",
  "Chicago": "US",
  "Los Angeles": "US",
  "San Francisco": "US",
  "Boston": "US",
  "Seattle": "US",
  "Canada": "CA",
  "Toronto": "CA",
  "Vancouver": "CA",
  "Montreal": "CA",

  // Europe  
  "United Kingdom": "GB",
  "UK": "GB",
  "England": "GB", 
  "London": "GB",
  "Manchester": "GB",
  "Germany": "DE",
  "Berlin": "DE",
  "Munich": "DE",
  "Frankfurt": "DE",
  "France": "FR",
  "Paris": "FR",
  "Lyon": "FR",
  "Italy": "IT",
  "Rome": "IT",
  "Milan": "IT",
  "Spain": "ES",
  "Madrid": "ES",
  "Barcelona": "ES",
  "Netherlands": "NL",
  "Amsterdam": "NL",
  "Switzerland": "CH",
  "Zurich": "CH",

  // Asia
  "India": "IN",
  "Mumbai": "IN",
  "Delhi": "IN",
  "Bangalore": "IN",
  "Hyderabad": "IN",
  "Chennai": "IN",
  "China": "CN",
  "Beijing": "CN",
  "Shanghai": "CN",
  "Hong Kong": "HK",
  "Japan": "JP",
  "Tokyo": "JP",
  "Osaka": "JP",
  "Singapore": "SG",
  "South Korea": "KR",
  "Seoul": "KR",

  // Australia & Oceania
  "Australia": "AU",
  "Sydney": "AU",
  "Melbourne": "AU",
  "Brisbane": "AU",

  // Other
  "Brazil": "BR",
  "São Paulo": "BR",
  "Mexico": "MX",
  "Russia": "RU",
  "Moscow": "RU",
};

// Country coordinates for positioning on the map (simplified)
const countryCoordinates: Record<string, { x: number; y: number; name: string }> = {
  "US": { x: 200, y: 120, name: "United States" },
  "CA": { x: 180, y: 80, name: "Canada" },
  "GB": { x: 420, y: 100, name: "United Kingdom" },
  "DE": { x: 460, y: 110, name: "Germany" },
  "FR": { x: 440, y: 120, name: "France" },
  "IT": { x: 470, y: 140, name: "Italy" },
  "ES": { x: 420, y: 140, name: "Spain" },
  "NL": { x: 450, y: 100, name: "Netherlands" },
  "CH": { x: 460, y: 120, name: "Switzerland" },
  "IN": { x: 580, y: 160, name: "India" },
  "CN": { x: 640, y: 120, name: "China" },
  "HK": { x: 660, y: 150, name: "Hong Kong" },
  "JP": { x: 700, y: 120, name: "Japan" },
  "SG": { x: 640, y: 180, name: "Singapore" },
  "KR": { x: 680, y: 110, name: "South Korea" },
  "AU": { x: 700, y: 220, name: "Australia" },
  "BR": { x: 280, y: 200, name: "Brazil" },
  "MX": { x: 180, y: 150, name: "Mexico" },
  "RU": { x: 560, y: 80, name: "Russia" },
};

// Simple world map SVG background
const WorldMapSVG = ({ 
  countryData, 
  onCountryClick, 
  hoveredCountry, 
  setHoveredCountry 
}: { 
  countryData: Record<string, CountryAssets>; 
  onCountryClick: (country: string) => void;
  hoveredCountry: string | null;
  setHoveredCountry: (country: string | null) => void;
}) => {
  const getCountryColor = (countryCode: string) => {
    const data = countryData[countryCode];
    if (!data) return "#e5e7eb"; // gray-200
    
    const { count } = data;
    if (count >= 50) return "#dc2626"; // red-600
    if (count >= 20) return "#ea580c"; // orange-600  
    if (count >= 10) return "#d97706"; // amber-600
    if (count >= 5) return "#ca8a04"; // yellow-600
    return "#16a34a"; // green-600
  };

  const getCircleSize = (count: number) => {
    if (count >= 50) return 12;
    if (count >= 20) return 10;
    if (count >= 10) return 8;
    if (count >= 5) return 6;
    return 4;
  };

  return (
    <svg 
      viewBox="0 0 800 300" 
      className="w-full h-48 sm:h-56 md:h-64 bg-slate-50 dark:bg-slate-900 rounded-lg border"
    >
      {/* Simple continent outlines */}
      <g fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.3">
        {/* North America outline */}
        <path d="M 50 50 Q 150 40 250 60 Q 300 80 280 140 Q 200 160 150 150 Q 100 130 50 120 Z" />
        {/* Europe outline */}
        <path d="M 400 80 Q 480 75 520 90 Q 500 130 480 140 Q 440 135 400 120 Z" />
        {/* Asia outline */}  
        <path d="M 520 60 Q 650 50 720 80 Q 750 120 720 160 Q 650 170 580 160 Q 540 130 520 100 Z" />
        {/* Australia outline */}
        <path d="M 680 200 Q 720 195 740 210 Q 730 230 700 235 Q 680 220 680 200 Z" />
        {/* South America outline */}
        <path d="M 220 170 Q 280 165 300 200 Q 290 240 270 260 Q 240 250 220 230 Z" />
      </g>

      {/* Country dots/markers */}
      {Object.entries(countryCoordinates).map(([countryCode, coords]) => {
        const data = countryData[countryCode];
        if (!data) return null;

        return (
          <TooltipProvider key={countryCode}>
            <Tooltip>
              <TooltipTrigger asChild>
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={getCircleSize(data.count)}
                  fill={getCountryColor(countryCode)}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer hover:opacity-80 transition-all duration-200"
                  style={{
                    transform: hoveredCountry === countryCode ? 'scale(1.2)' : 'scale(1)',
                    transformOrigin: `${coords.x}px ${coords.y}px`
                  }}
                  onClick={() => onCountryClick(countryCode)}
                  onMouseEnter={() => setHoveredCountry(countryCode)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  data-testid={`country-marker-${countryCode}`}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p className="font-semibold">{coords.name}</p>
                  <p>{data.count} assets ({data.percentage.toFixed(1)}%)</p>
                  <p className="text-xs text-muted-foreground">
                    Locations: {data.locations.slice(0, 3).join(", ")}
                    {data.locations.length > 3 && ` +${data.locations.length - 3} more`}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      {/* Legend */}
      <g transform="translate(20, 250)">
        <text x="0" y="0" fontSize="10" fill="currentColor" className="fill-muted-foreground">
          Asset Count:
        </text>
        <circle cx="80" cy="-2" r="4" fill="#16a34a" />
        <text x="90" y="2" fontSize="9" fill="currentColor" className="fill-muted-foreground">1-4</text>
        
        <circle cx="120" cy="-2" r="6" fill="#ca8a04" />
        <text x="132" y="2" fontSize="9" fill="currentColor" className="fill-muted-foreground">5-9</text>
        
        <circle cx="160" cy="-2" r="8" fill="#d97706" />
        <text x="174" y="2" fontSize="9" fill="currentColor" className="fill-muted-foreground">10-19</text>
        
        <circle cx="210" cy="-2" r="10" fill="#ea580c" />
        <text x="226" y="2" fontSize="9" fill="currentColor" className="fill-muted-foreground">20-49</text>
        
        <circle cx="270" cy="-2" r="12" fill="#dc2626" />
        <text x="288" y="2" fontSize="9" fill="currentColor" className="fill-muted-foreground">50+</text>
      </g>
    </svg>
  );
};

export function WorldMap() {
  const [, setLocation] = useLocation();
  const [countryData, setCountryData] = useState<Record<string, CountryAssets>>({});
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Fetch assets data for location analysis
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ["/api/assets"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/assets");
      return response.json();
    },
  });

  useEffect(() => {
    if (assetsData?.assets) {
      // Process location data and map to countries
      const locationCounts: Record<string, number> = {};
      const locationToCountry: Record<string, string> = {};

      assetsData.assets.forEach((asset: any) => {
        if (asset.location) {
          const location = asset.location.trim();
          locationCounts[location] = (locationCounts[location] || 0) + 1;
          
          // Map location to country
          for (const [locationKey, countryCode] of Object.entries(countryMapping)) {
            if (location.toLowerCase().includes(locationKey.toLowerCase()) || 
                locationKey.toLowerCase().includes(location.toLowerCase())) {
              locationToCountry[location] = countryCode;
              break;
            }
          }
        }
      });

      // Aggregate by country
      const countryAssets: Record<string, CountryAssets> = {};
      const totalAssets = assetsData.assets.length;

      Object.entries(locationCounts).forEach(([location, count]) => {
        const countryCode = locationToCountry[location] || "OTHER";
        
        if (countryCode !== "OTHER") {
          if (!countryAssets[countryCode]) {
            countryAssets[countryCode] = {
              country: countryCoordinates[countryCode]?.name || countryCode,
              count: 0,
              percentage: 0,
              locations: [],
            };
          }
          
          countryAssets[countryCode].count += count;
          countryAssets[countryCode].locations.push(location);
        }
      });

      // Calculate percentages
      Object.values(countryAssets).forEach(data => {
        data.percentage = (data.count / totalAssets) * 100;
      });

      setCountryData(countryAssets);
    }
  }, [assetsData]);

  const handleCountryClick = (countryCode: string) => {
    const data = countryData[countryCode];
    if (data && data.locations.length > 0) {
      // Navigate to assets page filtered by the first location in the country
      setLocation(`/assets?location=${encodeURIComponent(data.locations[0])}`);
    }
  };

  const sortedCountries = Object.entries(countryData)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5);

  const totalAssets = Object.values(countryData).reduce((sum, data) => sum + data.count, 0);

  return (
    <Card className="h-full" data-testid="card-world-map">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
          <span className="hidden sm:inline">Global Asset Distribution</span>
          <span className="sm:hidden">Global Assets</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Asset locations worldwide - click markers to filter by location</span>
          <span className="sm:hidden">Click markers to filter</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-muted-foreground">Loading global asset data...</div>
          </div>
        ) : Object.keys(countryData).length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No location data available</p>
              <p className="text-sm">Add location information to assets to see the global distribution</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <WorldMapSVG 
              countryData={countryData}
              onCountryClick={handleCountryClick}
              hoveredCountry={hoveredCountry}
              setHoveredCountry={setHoveredCountry}
            />
            
            {/* Top countries stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <h4 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Top Countries by Asset Count</span>
                  <span className="sm:hidden">Top Countries</span>
                </h4>
                <div className="space-y-1 sm:space-y-2">
                  {sortedCountries.map(([countryCode, data]) => (
                    <div 
                      key={countryCode}
                      className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleCountryClick(countryCode)}
                      data-testid={`country-stat-${countryCode}`}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                        <div 
                          className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: hoveredCountry === countryCode ? '#3b82f6' : '#64748b' }}
                        />
                        <span className="text-xs sm:text-sm font-medium truncate">{data.country}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs sm:text-sm font-semibold">{data.count}</div>
                        <div className="text-xs text-muted-foreground">
                          {data.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                  Quick Stats
                </h4>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  <div className="p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-sm sm:text-lg font-bold text-blue-600">{Object.keys(countryData).length}</div>
                    <div className="text-xs text-muted-foreground">Countries</div>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-sm sm:text-lg font-bold text-green-600">{totalAssets}</div>
                    <div className="text-xs text-muted-foreground">Located Assets</div>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-sm sm:text-lg font-bold text-purple-600">
                      {Object.values(countryData).reduce((sum, data) => sum + data.locations.length, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Locations</div>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-sm sm:text-lg font-bold text-orange-600">
                      {sortedCountries.length > 0 ? sortedCountries[0][1].percentage.toFixed(1) : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">Top Country</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}