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
import { RotateCcw } from "lucide-react";
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
      defaultPosition: { x: 24, y: 120 },
      width: 300,
      height: 180,
      component: <HardwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
    },
    {
      id: 'software-tile',
      title: 'Software Assets',
      section: 'asset-overview',
      defaultPosition: { x: 348, y: 120 },
      width: 300,
      height: 180,
      component: <SoftwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
    },
    {
      id: 'peripherals-tile',
      title: 'Peripheral Devices',
      section: 'asset-overview',
      defaultPosition: { x: 672, y: 120 },
      width: 300,
      height: 180,
      component: <PeripheralsTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
    },
    {
      id: 'others-tile',
      title: 'Other Assets',
      section: 'asset-overview',
      defaultPosition: { x: 996, y: 120 },
      width: 300,
      height: 180,
      component: <OthersTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
    },
    
    // Asset Lifecycle Section
    {
      id: 'deployed-assets',
      title: 'Deployed Assets',
      section: 'lifecycle',
      defaultPosition: { x: 24, y: 320 },
      width: 320,
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
      defaultPosition: { x: 368, y: 320 },
      width: 320,
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
      defaultPosition: { x: 712, y: 320 },
      width: 320,
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
      defaultPosition: { x: 1056, y: 320 },
      width: 320,
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
      defaultPosition: { x: 24, y: 500 },
      width: 680,
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
      defaultPosition: { x: 720, y: 500 },
      width: 672,
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
      defaultPosition: { x: 24, y: 820 },
      width: 324,
      height: 180,
      component: <UnusedHardwareTile metrics={metrics} />
    },
    {
      id: 'unused-licenses',
      title: 'Unused Licenses',
      section: 'insights',
      defaultPosition: { x: 372, y: 820 },
      width: 324,
      height: 180,
      component: <UnusedLicensesTile metrics={metrics} />
    },
    {
      id: 'expiring-items',
      title: 'Expiring Items Summary',
      section: 'insights',
      defaultPosition: { x: 720, y: 820 },
      width: 324,
      height: 180,
      component: <ExpiringItemsTile metrics={metrics} />
    },
    {
      id: 'compliance-risk',
      title: 'Compliance Risk',
      section: 'insights',
      defaultPosition: { x: 1068, y: 820 },
      width: 324,
      height: 180,
      component: <ComplianceRiskTile metrics={metrics} />
    },
    
    // Activities Section
    {
      id: 'recent-activities',
      title: 'Recent Activities',
      section: 'activities',
      defaultPosition: { x: 24, y: 1040 },
      width: 680,
      height: 320,
      component: <RecentActivitiesTile metrics={metrics} />
    },
    {
      id: 'ai-recommendations',
      title: 'AI Recommendations',
      section: 'activities',
      defaultPosition: { x: 720, y: 1040 },
      width: 672,
      height: 320,
      component: (
        <AIRecommendations
          recommendations={recommendations || []}
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
      defaultPosition: { x: 24, y: 1360 },
      width: 1368,
      height: 400,
      component: (
        <div className="bg-card rounded-lg border p-3 h-full">
          <WorldMap />
        </div>
      )
    }
  ];
}


export default function Dashboard() {
  const [, navigate] = useLocation();
  const [isDragMode, setIsDragMode] = useState(false);

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

  const handleNavigateToAssets = (type?: string, category?: string) => {
    if (!type) return;
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
          showDragToggle={true}
          isDragMode={isDragMode}
          onToggleDragMode={() => setIsDragMode(!isDragMode)}
        />
        
        
        {/* Conditional Layout: Grid vs Drag-and-Drop */}
        {metrics && (
          <>
            {isDragMode ? (
              // Drag-and-Drop Mode with Container Boundaries and Reset Controls
              <div className="w-full max-w-[100vw] mx-auto px-4 sm:px-6 py-6 box-border overflow-hidden relative">
                {/* Reset Controls - Only visible in drag mode */}
                <div className="mb-4 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      localStorage.removeItem('dashboard-layout-v1');
                      window.dispatchEvent(new CustomEvent('reset-all-tiles'));
                    }}
                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                    data-testid="reset-all-tiles"
                    title="Reset all dashboard tiles to default positions"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset All
                  </Button>
                </div>
                <IndependentDraggableTiles 
                  tiles={createDashboardTiles(metrics, recommendations, handleNavigateToAssets, handleViewAllRecommendations, handleViewRecommendation, navigate)}
                />
              </div>
            ) : (
              // Responsive Grid Layout Mode
              <div className="w-full max-w-[1440px] mx-auto px-6 py-6 box-border overflow-hidden">
                {/* Asset Overview Section */}
            <div className="mb-8" data-testid="section-asset-overview">
              <div className="mb-6" data-testid="heading-asset-overview">
                <h2 className="text-lg font-semibold text-foreground mb-1">Asset Overview</h2>
                <p className="text-xs text-muted-foreground">Hardware, Software, Peripherals and Other Assets</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="min-w-0 max-w-full">
                  <HardwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
                </div>
                <div className="min-w-0 max-w-full">
                  <SoftwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
                </div>
                <div className="min-w-0 max-w-full">
                  <PeripheralsTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
                </div>
                <div className="min-w-0 max-w-full">
                  <OthersTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />
                </div>
              </div>
            </div>

            {/* Asset Lifecycle Section */}
            <div className="mb-8" data-testid="section-asset-lifecycle">
              <div className="mb-6" data-testid="heading-asset-lifecycle">
                <h2 className="text-lg font-semibold text-foreground mb-1">Asset Lifecycle</h2>
                <p className="text-xs text-muted-foreground">Asset Status Distribution and Lifecycle Management</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="min-w-0 max-w-full">
                  <div className="bg-card rounded-lg border p-3 h-28 flex items-center justify-between hover:shadow-sm transition-shadow box-border" data-testid="card-deployed-assets">
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
                <div className="min-w-0 max-w-full">
                  <div className="bg-card rounded-lg border p-3 h-28 flex items-center justify-between hover:shadow-sm transition-shadow box-border" data-testid="card-in-stock-assets">
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
                <div className="min-w-0 max-w-full">
                  <div className="bg-card rounded-lg border p-3 h-28 flex items-center justify-between hover:shadow-sm transition-shadow box-border" data-testid="card-in-repair-assets">
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
                <div className="min-w-0 max-w-full">
                  <div className="bg-card rounded-lg border p-3 h-28 flex items-center justify-between hover:shadow-sm transition-shadow box-border" data-testid="card-retired-assets">
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
            </div>

            {/* Expiring Warranties & Licenses Section */}
            <div className="mb-8" data-testid="section-expiring-items">
              <div className="mb-6" data-testid="heading-expiring-items">
                <h2 className="text-lg font-semibold text-foreground mb-1">Expiring Warranties & Licenses</h2>
                <p className="text-xs text-muted-foreground">Upcoming Hardware Warranty and Software License Expirations</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="min-w-0 max-w-full">
                  <div className="bg-card rounded-lg border h-[300px] box-border" data-testid="card-expiring-warranties">
                    <div className="flex items-center justify-between p-3 border-b">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-yellow-600 mr-2"></div>
                        <p className="text-sm font-medium text-foreground">Hardware Warranties</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {metrics?.itamInsights?.expiringItems?.warranties?.length || 0} expiring
                      </span>
                    </div>
                    <div className="max-h-[248px] overflow-y-auto">
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
                </div>
                <div className="min-w-0 max-w-full">
                  <div className="bg-card rounded-lg border h-[300px] box-border" data-testid="card-expiring-licenses">
                    <div className="flex items-center justify-between p-3 border-b">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-600 mr-2"></div>
                        <p className="text-sm font-medium text-foreground">Software Licenses</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {metrics?.itamInsights?.expiringItems?.licenses?.length || 0} expiring
                      </span>
                    </div>
                    <div className="max-h-[248px] overflow-y-auto">
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
                </div>
              </div>
            </div>

            {/* ITAM Insights Section */}
            <div className="mb-8" data-testid="section-itam-insights">
              <div className="mb-6" data-testid="heading-itam-insights">
                <h2 className="text-lg font-semibold text-foreground mb-1">ITAM Insights</h2>
                <p className="text-xs text-muted-foreground">Unused Assets, License Optimization and Compliance Monitoring</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="min-w-0 max-w-full">
                  <UnusedHardwareTile metrics={metrics} />
                </div>
                <div className="min-w-0 max-w-full">
                  <UnusedLicensesTile metrics={metrics} />
                </div>
                <div className="min-w-0 max-w-full">
                  <ExpiringItemsTile metrics={metrics} />
                </div>
                <div className="min-w-0 max-w-full">
                  <ComplianceRiskTile metrics={metrics} />
                </div>
              </div>
            </div>

            {/* Activities Section */}
            <div className="mb-8" data-testid="section-activities">
              <div className="mb-6" data-testid="heading-activities">
                <h2 className="text-lg font-semibold text-foreground mb-1">Activities</h2>
                <p className="text-xs text-muted-foreground">Recent Activities and AI-Powered Recommendations</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="min-w-0 max-w-full">
                  <RecentActivitiesTile metrics={metrics} />
                </div>
                <div className="min-w-0 max-w-full">
                  <AIRecommendations
                    recommendations={recommendations || []}
                    onViewAll={handleViewAllRecommendations}
                    onViewRecommendation={handleViewRecommendation}
                  />
                </div>
              </div>
            </div>

            {/* Global Distribution Section */}
            <div className="mb-8" data-testid="section-global-distribution">
              <div className="mb-6" data-testid="heading-global-distribution">
                <h2 className="text-lg font-semibold text-foreground mb-1">Global Distribution</h2>
                <p className="text-xs text-muted-foreground">Worldwide Asset Location and Regional Overview</p>
              </div>
              <div className="w-full min-w-0 max-w-full">
                <div className="bg-card rounded-lg border p-3 box-border">
                  <WorldMap />
                </div>
              </div>
            </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
