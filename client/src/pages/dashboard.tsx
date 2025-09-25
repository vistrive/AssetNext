import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { AIRecommendations } from "@/components/dashboard/ai-recommendations";
import { WorldMap } from "@/components/dashboard/world-map";
import { IndependentDraggableTiles, useTileReset } from "@/components/dashboard/independent-draggable-tile";

interface DashboardTile {
  id: string;
  title: string;
  component: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  width?: number;
  height?: number;
  section?: string;
}
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
import { RotateCcw, Plus, Users, Building2 } from "lucide-react";
import { authenticatedRequest } from "@/lib/auth";
import type { Recommendation } from "@shared/schema";

// Create dashboard tiles for draggable system
function createDashboardTiles(
  metrics: any,
  recommendations: Recommendation[] | undefined,
  handleNavigateToAssets: (type?: string, category?: string) => void,
  handleViewAllRecommendations: () => void,
  handleViewRecommendation: (id: string) => void,
  navigate: any
): DashboardTile[] {
  return [
    // Asset Overview Section
    {
      id: 'hardware-tile',
      title: 'Hardware Assets',
      section: 'asset-overview',
      defaultPosition: { x: 50, y: 160 },
      width: 320,
      height: 180,
      component: <HardwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
    },
    {
      id: 'software-tile',
      title: 'Software Assets',
      section: 'asset-overview',
      defaultPosition: { x: 390, y: 160 },
      width: 320,
      height: 180,
      component: <SoftwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
    },
    {
      id: 'peripherals-tile',
      title: 'Peripheral Devices',
      section: 'asset-overview',
      defaultPosition: { x: 730, y: 160 },
      width: 320,
      height: 180,
      component: <PeripheralsTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
    },
    {
      id: 'others-tile',
      title: 'Other Assets',
      section: 'asset-overview',
      defaultPosition: { x: 1070, y: 160 },
      width: 320,
      height: 180,
      component: <OthersTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
    },
    
    // Asset Lifecycle Section
    {
      id: 'deployed-assets',
      title: 'Deployed Assets',
      section: 'lifecycle',
      defaultPosition: { x: 50, y: 250 },
      width: 240,
      height: 150,
      component: (
        <div className="bg-card rounded-lg border p-3 h-full flex items-center justify-between hover:shadow-sm transition-shadow" data-testid="card-deployed-assets">
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
      )
    },
    {
      id: 'in-stock-assets',
      title: 'In Stock Assets',
      section: 'lifecycle',
      defaultPosition: { x: 310, y: 250 },
      width: 240,
      height: 150,
      component: (
        <div className="bg-card rounded-lg border p-3 h-full flex items-center justify-between hover:shadow-sm transition-shadow" data-testid="card-in-stock-assets">
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
      )
    },
    {
      id: 'in-repair-assets',
      title: 'In Repair Assets',
      section: 'lifecycle',
      defaultPosition: { x: 570, y: 250 },
      width: 240,
      height: 150,
      component: (
        <div className="bg-card rounded-lg border p-3 h-full flex items-center justify-between hover:shadow-sm transition-shadow" data-testid="card-in-repair-assets">
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
      )
    },
    {
      id: 'retired-assets',
      title: 'Retired Assets',
      section: 'lifecycle',
      defaultPosition: { x: 830, y: 250 },
      width: 240,
      height: 150,
      component: (
        <div className="bg-card rounded-lg border p-3 h-full flex items-center justify-between hover:shadow-sm transition-shadow" data-testid="card-retired-assets">
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
      )
    },
    
    // Expiring Warranties & Licenses
    {
      id: 'expiring-warranties',
      title: 'Expiring Warranties',
      section: 'expiring',
      defaultPosition: { x: 50, y: 420 },
      width: 420,
      height: 300,
      component: (
        <div className="bg-card rounded-lg border h-full" data-testid="card-expiring-warranties">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-600 mr-2"></div>
              <p className="text-sm font-medium text-foreground">Hardware Warranties</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {metrics?.itamInsights?.expiringItems?.warranties?.length || 0} expiring
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {metrics?.itamInsights?.expiringItems?.warranties?.length > 0 ? (
              metrics.itamInsights.expiringItems.warranties.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                  data-testid={`expiring-warranty-${item.id}`}
                  onClick={() => navigate(`/assets?selectedId=${item.id}`)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-yellow-600 font-medium ml-2">
                      {(() => {
                        const date = item.expiryDate || item.warrantyExpiry || item.amcExpiry;
                        return date ? new Date(date).toLocaleDateString() : 'No date';
                      })()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {item.manufacturer} {item.model} • {item.category}
                  </p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Serial: {item.serialNumber || 'N/A'}</span>
                    <span>Purchase: {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-muted-foreground">
                      {item.assignedUser || item.location || 'Unassigned'}
                    </p>
                    <p className="text-xs text-yellow-600">{item.contractType}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No warranties expiring in next 30 days
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'expiring-licenses',
      title: 'Expiring Licenses',
      section: 'expiring',
      defaultPosition: { x: 490, y: 420 },
      width: 420,
      height: 300,
      component: (
        <div className="bg-card rounded-lg border h-full" data-testid="card-expiring-licenses">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-600 mr-2"></div>
              <p className="text-sm font-medium text-foreground">Software Licenses</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {metrics?.itamInsights?.expiringItems?.licenses?.length || 0} expiring
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {metrics?.itamInsights?.expiringItems?.licenses?.length > 0 ? (
              metrics.itamInsights.expiringItems.licenses.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                  data-testid={`expiring-license-${item.id}`}
                  onClick={() => navigate(`/software?selectedId=${item.id}`)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-red-600 font-medium ml-2">
                      {(() => {
                        const date = item.expiryDate || item.renewalDate;
                        return date ? new Date(date).toLocaleDateString() : 'No date';
                      })()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {item.vendor} v{item.version} • {item.totalLicenses} licenses
                  </p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Cost: ${item.costPerLicense || 0}/license</span>
                    <span>Purchase: {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-muted-foreground">
                      License Key: {item.licenseKey || 'N/A'}
                    </p>
                    <p className="text-xs text-red-600">{item.contractType}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No licenses expiring in next 30 days
              </div>
            )}
          </div>
        </div>
      )
    },
    
    // ITAM Insights Section
    {
      id: 'unused-hardware',
      title: 'Unused Hardware',
      section: 'insights',
      defaultPosition: { x: 50, y: 740 },
      width: 280,
      height: 180,
      component: <UnusedHardwareTile metrics={metrics} />
    },
    {
      id: 'unused-licenses',
      title: 'Unused Licenses',
      section: 'insights',
      defaultPosition: { x: 350, y: 740 },
      width: 280,
      height: 180,
      component: <UnusedLicensesTile metrics={metrics} />
    },
    {
      id: 'expiring-items',
      title: 'Expiring Items Summary',
      section: 'insights',
      defaultPosition: { x: 650, y: 740 },
      width: 280,
      height: 180,
      component: <ExpiringItemsTile metrics={metrics} />
    },
    {
      id: 'compliance-risk',
      title: 'Compliance Risk',
      section: 'insights',
      defaultPosition: { x: 950, y: 740 },
      width: 280,
      height: 180,
      component: <ComplianceRiskTile metrics={metrics} />
    },
    
    // Activities Section
    {
      id: 'recent-activities',
      title: 'Recent Activities',
      section: 'activities',
      defaultPosition: { x: 50, y: 940 },
      width: 480,
      height: 320,
      component: <RecentActivitiesTile metrics={metrics} />
    },
    {
      id: 'ai-recommendations',
      title: 'AI Recommendations',
      section: 'activities',
      defaultPosition: { x: 550, y: 940 },
      width: 480,
      height: 320,
      component: (
        <AIRecommendations
          recommendations={recommendations}
          onViewAll={handleViewAllRecommendations}
          onViewRecommendation={handleViewRecommendation}
        />
      )
    },
    
    // Global Distribution
    {
      id: 'world-map',
      title: 'Global Asset Distribution',
      section: 'visual',
      defaultPosition: { x: 50, y: 1280 },
      width: 980,
      height: 400,
      component: (
        <div className="bg-card rounded-lg border p-3 h-full">
          <WorldMap />
        </div>
      )
    }
  ];
}

// Dashboard header controls with reset functionality and quick actions
function DashboardHeaderControls({ totalAssets }: { totalAssets: number }) {
  const navigate = useLocation()[1];

  const handleQuickAddAsset = () => {
    navigate('/assets?action=create');
  };

  const handleQuickAddUser = () => {
    navigate('/team?action=create');
  };

  const handleQuickAddVendor = () => {
    navigate('/vendors?action=create');
  };

  const handleResetSection = (section: string) => {
    window.dispatchEvent(new CustomEvent('reset-section', { detail: { section } }));
  };

  const handleResetAllTiles = () => {
    // Clear saved layout from localStorage and dispatch reset events
    localStorage.removeItem('dashboard-layout-v1');
    window.dispatchEvent(new CustomEvent('reset-all-tiles'));
  };

  return (
    <div className="px-6 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Comprehensive IT Asset Management Dashboard • Asset Overview, Lifecycle, Insights & Global Distribution
        </div>
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleQuickAddAsset}
              className="text-xs h-7"
              data-testid="quick-add-asset"
              title="Quick add asset"
            >
              <Plus className="h-3 w-3 mr-1" />
              Asset
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleQuickAddUser}
              className="text-xs h-7"
              data-testid="quick-add-user"
              title="Quick add user"
            >
              <Users className="h-3 w-3 mr-1" />
              User
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleQuickAddVendor}
              className="text-xs h-7"
              data-testid="quick-add-vendor"
              title="Quick add vendor"
            >
              <Building2 className="h-3 w-3 mr-1" />
              Vendor
            </Button>
          </div>
          
          {/* Reset Controls */}
          <div className="flex items-center gap-2 border-l pl-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleResetSection('asset-overview')}
              className="text-xs h-7"
              data-testid="reset-overview-section"
              title="Reset Asset Overview tiles"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Overview
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleResetSection('insights')}
              className="text-xs h-7"
              data-testid="reset-insights-section"
              title="Reset ITAM Insights tiles"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Insights
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetAllTiles}
              className="text-xs h-7 text-orange-600 hover:text-orange-700"
              data-testid="reset-all-tiles"
              title="Reset all dashboard tiles to default positions"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset All
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground border-l pl-3">
            <span>Total Assets: {totalAssets}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        
        {/* Dashboard Header with Reset Controls & Quick Actions */}
        <DashboardHeaderControls totalAssets={metrics?.totalAssets || 0} />
        
        
        {/* Dashboard with Fixed Section Headings and Draggable Tiles */}
        {metrics && (
          <div className="relative">
            {/* Fixed Section Headings */}
            <div className="relative z-10 pointer-events-none">
              {/* Asset Overview Section Header */}
              <div className="absolute left-6 top-6" data-testid="heading-asset-overview">
                <h2 className="text-lg font-semibold text-foreground mb-1 bg-background/90 backdrop-blur px-2 py-1 rounded-md border shadow-sm">
                  Asset Overview
                </h2>
                <p className="text-xs text-muted-foreground bg-background/90 backdrop-blur px-2 py-1 rounded">
                  Hardware, Software, Peripherals and Other Assets
                </p>
              </div>

              {/* Asset Lifecycle Section Header */}
              <div className="absolute left-6 top-[210px]" data-testid="heading-asset-lifecycle">
                <h2 className="text-lg font-semibold text-foreground mb-1 bg-background/90 backdrop-blur px-2 py-1 rounded-md border shadow-sm">
                  Asset Lifecycle
                </h2>
                <p className="text-xs text-muted-foreground bg-background/90 backdrop-blur px-2 py-1 rounded">
                  Asset Status Distribution and Lifecycle Management
                </p>
              </div>

              {/* Expiring Warranties & Licenses Section Header */}
              <div className="absolute left-6 top-[380px]" data-testid="heading-expiring-items">
                <h2 className="text-lg font-semibold text-foreground mb-1 bg-background/90 backdrop-blur px-2 py-1 rounded-md border shadow-sm">
                  Expiring Warranties & Licenses
                </h2>
                <p className="text-xs text-muted-foreground bg-background/90 backdrop-blur px-2 py-1 rounded">
                  Upcoming Hardware Warranty and Software License Expirations
                </p>
              </div>

              {/* ITAM Insights Section Header */}
              <div className="absolute left-6 top-[700px]" data-testid="heading-itam-insights">
                <h2 className="text-lg font-semibold text-foreground mb-1 bg-background/90 backdrop-blur px-2 py-1 rounded-md border shadow-sm">
                  ITAM Insights
                </h2>
                <p className="text-xs text-muted-foreground bg-background/90 backdrop-blur px-2 py-1 rounded">
                  Unused Assets, License Optimization and Compliance Monitoring
                </p>
              </div>

              {/* Activities Section Header */}
              <div className="absolute left-6 top-[900px]" data-testid="heading-activities">
                <h2 className="text-lg font-semibold text-foreground mb-1 bg-background/90 backdrop-blur px-2 py-1 rounded-md border shadow-sm">
                  Activities
                </h2>
                <p className="text-xs text-muted-foreground bg-background/90 backdrop-blur px-2 py-1 rounded">
                  Recent Activities and AI-Powered Recommendations
                </p>
              </div>

              {/* Global Distribution Section Header */}
              <div className="absolute left-6 top-[1240px]" data-testid="heading-global-distribution">
                <h2 className="text-lg font-semibold text-foreground mb-1 bg-background/90 backdrop-blur px-2 py-1 rounded-md border shadow-sm">
                  Global Distribution
                </h2>
                <p className="text-xs text-muted-foreground bg-background/90 backdrop-blur px-2 py-1 rounded">
                  Worldwide Asset Location and Regional Overview
                </p>
              </div>
            </div>

            {/* Draggable Tiles */}
            <IndependentDraggableTiles 
              tiles={createDashboardTiles(metrics, recommendations, handleNavigateToAssets, handleViewAllRecommendations, handleViewRecommendation, navigate)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
