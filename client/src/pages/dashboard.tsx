import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { AIRecommendations } from "@/components/dashboard/ai-recommendations";
import { WorldMap } from "@/components/dashboard/world-map";
import { HardwareTile } from "@/components/dashboard/individual-tiles/hardware-tile";
import { SoftwareTile } from "@/components/dashboard/individual-tiles/software-tile";
import { PeripheralsTile } from "@/components/dashboard/individual-tiles/peripherals-tile";
import { OthersTile } from "@/components/dashboard/individual-tiles/others-tile";
import { UnusedHardwareTile } from "@/components/dashboard/individual-tiles/unused-hardware-tile";
import { UnusedLicensesTile } from "@/components/dashboard/individual-tiles/unused-licenses-tile";
import { ExpiringItemsTile } from "@/components/dashboard/individual-tiles/expiring-items-tile";
import { ComplianceRiskTile } from "@/components/dashboard/individual-tiles/compliance-risk-tile";
import { RecentActivitiesTile } from "@/components/dashboard/individual-tiles/recent-activities-tile";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { authenticatedRequest } from "@/lib/auth";
import type { Recommendation } from "@shared/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/dashboard/metrics");
      return response.json();
    },
  });

  // Fetch recommendations
  const { data: recommendations = [] } = useQuery({
    queryKey: ["/api/recommendations"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/recommendations?status=pending");
      return response.json();
    },
  });

  const handleViewAllRecommendations = () => {
    navigate("/recommendations");
  };

  const handleViewRecommendation = (id: string) => {
    navigate(`/recommendations?id=${id}`);
  };

  const handleNavigateToAssets = (type: string, category?: string) => {
    if (category) {
      navigate(`/assets?type=${type}&category=${category}`);
    } else {
      navigate(`/assets?type=${type}`);
    }
  };

  if (metricsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 overflow-auto">
        <TopBar
          title="ITAM Dashboard"
          description="Comprehensive IT Asset Management with Lifecycle Insights, Unused Asset Detection & Compliance Monitoring"
        />
        
        {/* Dashboard Controls Header */}
        <div className="px-6 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Drag tiles to customize your dashboard layout • Asset Overview, Lifecycle, Metrics & Visual sections
            </div>
            <div className="flex items-center gap-2">
              {/* Global Reset */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Clear all saved positions and dispatch reset events
                  localStorage.removeItem('dashboard-layout-v1');
                  // Also clear old tile position storage
                  Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('tile-position-')) {
                      localStorage.removeItem(key);
                    }
                  });
                  // Dispatch global reset event for in-place re-render
                  window.dispatchEvent(new CustomEvent('reset-all-tiles'));
                }}
                className="h-8 px-3 text-xs"
                data-testid="button-reset-all-tiles"
                title="Reset all tiles to default positions"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset Layout
              </Button>
              
              {/* Section Reset Controls */}
              <div className="flex items-center gap-1 border-l pl-2 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('reset-section', { detail: { section: 'asset-overview' } }))}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  data-testid="button-reset-asset-overview"
                  title="Reset Asset Overview tiles"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Overview
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('reset-section', { detail: { section: 'metrics' } }))}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  data-testid="button-reset-metrics"
                  title="Reset Core Metrics tiles"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Metrics
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('reset-section', { detail: { section: 'analytics' } }))}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  data-testid="button-reset-analytics"
                  title="Reset Analytics tiles"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Analytics
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('reset-section', { detail: { section: 'visual' } }))}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  data-testid="button-reset-visual"
                  title="Reset Visual tiles"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Visual
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        
        {/* Dashboard Content with Responsive Grid Layout */}
        {metrics && (
          <div className="p-4">
            {/* Asset Overview Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Asset Overview</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Hardware, Software, Peripherals and Other Assets
              </p>
            </div>
            {/* Asset Overview Tiles - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="max-w-full">
                <HardwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
              </div>
              <div className="max-w-full">
                <SoftwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
              </div>
              <div className="max-w-full">
                <PeripheralsTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
              </div>
              <div className="max-w-full">
                <OthersTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
              </div>
            </div>
            
            {/* Asset Lifecycle Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Asset Lifecycle</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Asset Status Distribution and Lifecycle Management
              </p>
            </div>
            
            {/* Asset Lifecycle Tiles - Responsive Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="max-w-full">
                <div className="bg-card rounded-lg border p-3 h-28 flex items-center justify-between hover:shadow-sm transition-shadow" data-testid="card-deployed-assets">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Deployed</p>
                    <p className="text-xl font-bold text-green-600" data-testid="count-deployed">
                      {metrics?.assetStatusCounts?.deployed || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  </div>
                </div>
              </div>
              <div className="max-w-full">
                <div className="bg-card rounded-lg border p-3 h-28 flex items-center justify-between hover:shadow-sm transition-shadow" data-testid="card-in-stock-assets">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">In Stock</p>
                    <p className="text-xl font-bold text-blue-600" data-testid="count-in-stock">
                      {metrics?.assetStatusCounts?.inStock || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  </div>
                </div>
              </div>
              <div className="max-w-full">
                <div className="bg-card rounded-lg border p-3 h-28 flex items-center justify-between hover:shadow-sm transition-shadow" data-testid="card-in-repair-assets">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">In Repair</p>
                    <p className="text-xl font-bold text-orange-600" data-testid="count-in-repair">
                      {metrics?.assetStatusCounts?.inRepair || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                  </div>
                </div>
              </div>
              <div className="max-w-full">
                <div className="bg-card rounded-lg border p-3 h-28 flex items-center justify-between hover:shadow-sm transition-shadow" data-testid="card-retired-assets">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Retired</p>
                    <p className="text-xl font-bold text-gray-600" data-testid="count-retired">
                      {metrics?.assetStatusCounts?.retired || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Expiring Warranties & Licenses Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Expiring Warranties & Licenses</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Upcoming Hardware Warranty and Software License Expirations
              </p>
            </div>
            
            {/* Expiring Items - Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
              <div className="max-w-full">
                <div className="bg-card rounded-lg border p-3 h-32" data-testid="card-expiring-warranties">
                  <div className="flex items-center mb-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-600 mr-2"></div>
                    <p className="text-sm font-medium text-foreground">Hardware Warranties</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600 mb-1" data-testid="count-expiring-warranties">
                    {metrics?.itamInsights?.summary?.totalExpiringWarranties || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Expiring within 30 days</p>
                </div>
              </div>
              <div className="max-w-full">
                <div className="bg-card rounded-lg border p-3 h-32" data-testid="card-expiring-licenses">
                  <div className="flex items-center mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-600 mr-2"></div>
                    <p className="text-sm font-medium text-foreground">Software Licenses</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600 mb-1" data-testid="count-expiring-licenses">
                    {metrics?.itamInsights?.summary?.totalExpiringLicenses || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Expiring within 30 days</p>
                </div>
              </div>
            </div>
            
            {/* ITAM Insights Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">ITAM Insights</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Unused Assets, License Optimization and Compliance Monitoring
              </p>
            </div>
            
            {/* ITAM Insights Tiles - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="max-w-full">
                <UnusedHardwareTile metrics={metrics} />
              </div>
              <div className="max-w-full">
                <UnusedLicensesTile metrics={metrics} />
              </div>
              <div className="max-w-full">
                <ExpiringItemsTile metrics={metrics} />
              </div>
              <div className="max-w-full">
                <ComplianceRiskTile metrics={metrics} />
              </div>
            </div>
            
            {/* Activities Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Activities</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Recent Activities and AI-Powered Recommendations
              </p>
            </div>
            
            {/* Activities Tiles - Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
              <div className="max-w-full">
                <RecentActivitiesTile metrics={metrics} />
              </div>
              <div className="max-w-full">
                <AIRecommendations
                  recommendations={recommendations}
                  onViewAll={handleViewAllRecommendations}
                  onViewRecommendation={handleViewRecommendation}
                />
              </div>
            </div>
            
            {/* Global Distribution Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Global Distribution</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Worldwide Asset Location and Regional Overview
              </p>
            </div>
            
            {/* World Map - Full Width */}
            <div className="max-w-full overflow-hidden">
              <div className="bg-card rounded-lg border p-3">
                <WorldMap />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
