import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { AIRecommendations } from "@/components/dashboard/ai-recommendations";
import { IndependentDraggableTiles } from "@/components/dashboard/independent-draggable-tile";
import { AssetAgeAnalysis } from "@/components/dashboard/asset-age-analysis";
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
import type { Asset, Recommendation } from "@shared/schema";

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
        <div className="px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Drag tiles to customize your dashboard layout • Reset tiles to restore default positions
            </div>
            <div className="flex items-center gap-2">
              {/* Global Reset */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Clear all saved positions and dispatch reset events
                  localStorage.removeItem('dashboard-layout-v1');
                  // Dispatch global reset event
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
                  Assets
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('reset-section', { detail: { section: 'itam-insights' } }))}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  data-testid="button-reset-itam-insights"
                  title="Reset ITAM Insights tiles"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Insights
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
                  onClick={() => window.dispatchEvent(new CustomEvent('reset-section', { detail: { section: 'maps' } }))}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  data-testid="button-reset-maps"
                  title="Reset Maps tiles"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Maps
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Global Search Bar */}
        
        {/* Dashboard Content - Independent Draggable Tiles */}
        {metrics && (
          <IndependentDraggableTiles
            onLayoutChange={(layouts) => {
              // Optionally handle layout changes here
              console.log('Layout updated:', layouts);
            }}
            tiles={[
              // Asset Overview Section - Row 1 (evenly spaced across top)
              {
                id: 'hardware-tile',
                title: 'Hardware Assets',
                component: <HardwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 20, y: 140 },
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              {
                id: 'software-tile',
                title: 'Software Assets',
                component: <SoftwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 320, y: 140 },
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              {
                id: 'peripherals-tile',
                title: 'Peripherals Assets',
                component: <PeripheralsTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 620, y: 140 },
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              {
                id: 'others-tile',
                title: 'Other Assets',
                component: <OthersTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 920, y: 140 },
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              // ITAM Insights Section - Row 2 (compact insight tiles)
              {
                id: 'unused-hardware-tile',
                title: 'Unused Hardware',
                component: <UnusedHardwareTile metrics={metrics} />,
                defaultPosition: { x: 20, y: 360 },
                width: 280,
                height: 150,
                section: 'itam-insights'
              },
              {
                id: 'unused-licenses-tile',
                title: 'Unused Licenses',
                component: <UnusedLicensesTile metrics={metrics} />,
                defaultPosition: { x: 320, y: 360 },
                width: 280,
                height: 150,
                section: 'itam-insights'
              },
              {
                id: 'expiring-items-tile',
                title: 'Expiring Items',
                component: <ExpiringItemsTile metrics={metrics} />,
                defaultPosition: { x: 620, y: 360 },
                width: 280,
                height: 150,
                section: 'itam-insights'
              },
              {
                id: 'compliance-risk-tile',
                title: 'Compliance Risk',
                component: <ComplianceRiskTile metrics={metrics} />,
                defaultPosition: { x: 920, y: 360 },
                width: 280,
                height: 150,
                section: 'itam-insights'
              },
              // Analytics Section - Row 3 (larger analytical tiles)
              {
                id: 'recent-activities-tile',
                title: 'Recent Activities',
                component: <RecentActivitiesTile metrics={metrics} />,
                defaultPosition: { x: 20, y: 530 },
                width: 380,
                height: 350,
                section: 'analytics'
              },
              {
                id: 'asset-age-analysis',
                title: 'Asset Age Analysis',
                component: metrics?.assetAgeAnalysis ? <AssetAgeAnalysis assetAgeAnalysis={metrics.assetAgeAnalysis} /> : <div className="text-muted-foreground p-4">Asset age analysis loading...</div>,
                defaultPosition: { x: 420, y: 530 },
                width: 380,
                height: 350,
                section: 'analytics'
              },
              {
                id: 'ai-recommendations',
                title: 'AI Recommendations',
                component: (
                  <AIRecommendations
                    recommendations={recommendations}
                    onViewAll={handleViewAllRecommendations}
                    onViewRecommendation={handleViewRecommendation}
                  />
                ),
                defaultPosition: { x: 820, y: 530 },
                width: 380,
                height: 350,
                section: 'analytics'
              },
              // Maps & Visual Section - Row 4 (properly positioned within view)
              {
                id: 'world-map',
                title: 'Global Asset Distribution',
                component: <WorldMap />,
                defaultPosition: { x: 20, y: 900 },
                width: 580,
                height: 400,
                section: 'maps'
              },
            ]}
          />
        )}
      </main>
    </div>
  );
}
