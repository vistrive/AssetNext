import { useMemo } from "react";
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle, GlassCardDescription, StatCard } from "@/components/ui-custom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { Asset } from "@shared/schema";
import { Laptop, Monitor, Printer, HardDrive, Cpu, Package } from "lucide-react";

interface AssetAnalyticsProps {
  assets: Asset[];
}

// Enhanced color scheme for better visibility in dark mode
const COLORS = {
  primary: ['#3B82F6', '#60A5FA', '#818CF8', '#A78BFA', '#C084FC', '#E879F9', '#F472B6', '#FB7185'],
  bar: {
    hardware: ['#60A5FA', '#3B82F6'], // Brighter cyan-to-blue for hardware categories
    hwVendor: ['#3B82F6', '#6366F1'], // Blue gradient for hardware vendors
    software: ['#818CF8', '#A78BFA'], // Purple gradient for software vendors
  }
};

// Global tooltip configuration for dark mode
const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'rgba(20, 25, 40, 0.95)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '0.5rem',
    color: '#E5E7EB',
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
  labelStyle: {
    color: '#F3F4F6',
    fontWeight: 600,
  },
  itemStyle: {
    color: '#E5E7EB',
  },
  cursor: {
    fill: 'rgba(59, 130, 246, 0.1)',
  }
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
    <div className="space-y-6 mb-6 animate-fade-in-up">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Assets"
          value={analytics.totalAssets}
          icon={<Package className="h-4 w-4" />}
        />

        <StatCard
          title="Hardware"
          value={analytics.hardwareCount}
          icon={<Laptop className="h-4 w-4" />}
        />

        <StatCard
          title="Software"
          value={analytics.softwareCount}
          icon={<Monitor className="h-4 w-4" />}
        />

        <StatCard
          title="Peripherals"
          value={analytics.peripheralCount}
          icon={<Printer className="h-4 w-4" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asset Type Distribution */}
        <GlassCard glow hover gradient>
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-base">Asset Type Distribution</GlassCardTitle>
            <GlassCardDescription className="text-xs">Breakdown by asset type</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
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
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={2}
                >
                  {analytics.typeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS.primary[index % COLORS.primary.length]}
                      style={{ filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.3))' }}
                    />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCardContent>
        </GlassCard>

        {/* Status Distribution */}
        <GlassCard glow hover gradient>
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-base">Asset Status</GlassCardTitle>
            <GlassCardDescription className="text-xs">Current status of all assets</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
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
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={2}
                >
                  {analytics.statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS.primary[index % COLORS.primary.length]}
                      style={{ filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.3))' }}
                    />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCardContent>
        </GlassCard>

        {/* Hardware Categories */}
        {analytics.categoryData.length > 0 && (
          <GlassCard glow hover gradient>
            <GlassCardHeader className="pb-3">
              <GlassCardTitle className="text-base">Hardware Categories</GlassCardTitle>
              <GlassCardDescription className="text-xs">Device types breakdown</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.categoryData}>
                  <defs>
                    <linearGradient id="cat-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60A5FA" stopOpacity={1} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.9} />
                    </linearGradient>
                    <filter id="bar-glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="rgba(96, 165, 250, 0.15)" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    fontSize={10}
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    fontSize={10} 
                    allowDecimals={false} 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar 
                    dataKey="value" 
                    fill="url(#cat-bar-gradient)" 
                    radius={[8, 8, 0, 0]}
                    style={{ filter: 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.4))' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </GlassCardContent>
          </GlassCard>
        )}
      </div>

      {/* Bottom Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hardware Vendors */}
        {analytics.vendorData.length > 0 && (
          <GlassCard glow hover gradient>
            <GlassCardHeader className="pb-3">
              <GlassCardTitle className="text-base">Top Hardware Vendors</GlassCardTitle>
              <GlassCardDescription className="text-xs">Distribution by manufacturer</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.vendorData}>
                  <defs>
                    <linearGradient id="hw-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="rgba(59, 130, 246, 0.15)" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    fontSize={10}
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    fontSize={10} 
                    allowDecimals={false} 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar 
                    dataKey="value" 
                    fill="url(#hw-bar-gradient)" 
                    radius={[8, 8, 0, 0]}
                    style={{ filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.4))' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Software Vendors */}
        {analytics.softwareVendorData.length > 0 && (
          <GlassCard glow hover gradient>
            <GlassCardHeader className="pb-3">
              <GlassCardTitle className="text-base">Top Software Vendors</GlassCardTitle>
              <GlassCardDescription className="text-xs">Software licenses by vendor</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.softwareVendorData}>
                  <defs>
                    <linearGradient id="sw-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={1} />
                      <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="rgba(129, 140, 248, 0.15)" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    fontSize={10}
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    fontSize={10} 
                    allowDecimals={false} 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar 
                    dataKey="value" 
                    fill="url(#sw-bar-gradient)" 
                    radius={[8, 8, 0, 0]}
                    style={{ filter: 'drop-shadow(0 0 6px rgba(129, 140, 248, 0.4))' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </GlassCardContent>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
