import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { Asset } from "@shared/schema";
import { Laptop, Monitor, Printer, HardDrive, Cpu, Package } from "lucide-react";

interface AssetAnalyticsProps {
  assets: Asset[];
}

const COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#f97316', '#14b8a6'],
  secondary: ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#818cf8', '#fb923c', '#2dd4bf'],
};

export function AssetAnalytics({ assets }: AssetAnalyticsProps) {
  // Calculate analytics data
  const analytics = useMemo(() => {
    // Asset type distribution
    const typeDistribution = assets.reduce((acc, asset) => {
      const type = asset.type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Hardware vendor distribution
    const hardwareAssets = assets.filter(a => a.type === 'Hardware');
    const vendorDistribution = hardwareAssets.reduce((acc, asset) => {
      const vendor = asset.manufacturer || 'Unknown';
      acc[vendor] = (acc[vendor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Hardware category distribution
    const categoryDistribution = hardwareAssets.reduce((acc, asset) => {
      const category = asset.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Software vendor distribution - EXCLUDE "Unknown"
    const softwareAssets = assets.filter(a => a.type === 'Software');
    const softwareVendorDistribution = softwareAssets.reduce((acc, asset) => {
      const vendor = asset.manufacturer;
      // Only count if vendor is not empty, null, undefined, or "Unknown"
      if (vendor && vendor.trim() !== '' && vendor.toLowerCase() !== 'unknown') {
        acc[vendor] = (acc[vendor] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Status distribution
    const statusDistribution = assets.reduce((acc, asset) => {
      const status = asset.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to chart data format
    const typeData = Object.entries(typeDistribution).map(([name, value]) => ({ name, value }));
    const vendorData = Object.entries(vendorDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 vendors
      .map(([name, value]) => ({ name, value }));
    
    const categoryData = Object.entries(categoryDistribution).map(([name, value]) => ({ name, value }));
    const softwareVendorData = Object.entries(softwareVendorDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
    
    const statusData = Object.entries(statusDistribution).map(([name, value]) => ({ name, value }));

    return {
      typeData,
      vendorData,
      categoryData,
      softwareVendorData,
      statusData,
      totalAssets: assets.length,
      hardwareCount: hardwareAssets.length,
      softwareCount: softwareAssets.length,
      peripheralCount: assets.filter(a => a.type === 'Peripherals').length,
    };
  }, [assets]);

  if (assets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAssets}</div>
            <p className="text-xs text-muted-foreground">All asset types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hardware</CardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.hardwareCount}</div>
            <p className="text-xs text-muted-foreground">
              {((analytics.hardwareCount / analytics.totalAssets) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Software</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.softwareCount}</div>
            <p className="text-xs text-muted-foreground">
              {((analytics.softwareCount / analytics.totalAssets) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peripherals</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.peripheralCount}</div>
            <p className="text-xs text-muted-foreground">
              {((analytics.peripheralCount / analytics.totalAssets) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asset Type Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Asset Type Distribution</CardTitle>
            <CardDescription className="text-xs">Breakdown by asset type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Asset Status</CardTitle>
            <CardDescription className="text-xs">Current status of all assets</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.secondary[index % COLORS.secondary.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hardware Categories */}
        {analytics.categoryData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hardware Categories</CardTitle>
              <CardDescription className="text-xs">Device types breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.categoryData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    fontSize={10}
                  />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.primary[1]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hardware Vendors */}
        {analytics.vendorData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top Hardware Vendors</CardTitle>
              <CardDescription className="text-xs">Distribution by manufacturer</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.vendorData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    fontSize={10}
                  />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.primary[0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Software Vendors */}
        {analytics.softwareVendorData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top Software Vendors</CardTitle>
              <CardDescription className="text-xs">Software licenses by vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.softwareVendorData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    fontSize={10}
                  />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.primary[2]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
