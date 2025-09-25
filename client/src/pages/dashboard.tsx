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
              Drag tiles to customize your dashboard layout • Asset Overview, Metrics, Analytics & Visual sections
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
        
        
        {/* Dashboard Content with Integrated Section Headings and Tiles */}
        {metrics && (
          <div className="relative px-6 pb-8">
            {/* Section Headings positioned above their respective tile rows */}
            <div className="absolute left-6 z-10">
              {/* Asset Overview Section Heading */}
              <div className="mb-6" style={{ top: '140px', position: 'absolute' }}>
                <h2 className="text-xl font-semibold text-foreground mb-2">Asset Overview</h2>
                <p className="text-sm text-muted-foreground">
                  Hardware, Software, Peripherals and Other Assets
                </p>
              </div>
              
              {/* ITAM Insights Section Heading */}
              <div className="mb-6" style={{ top: '380px', position: 'absolute' }}>
                <h2 className="text-xl font-semibold text-foreground mb-2">ITAM Insights</h2>
                <p className="text-sm text-muted-foreground">
                  Unused Assets, License Optimization and Compliance Monitoring
                </p>
              </div>
              
              {/* Activities Section Heading */}
              <div className="mb-6" style={{ top: '580px', position: 'absolute' }}>
                <h2 className="text-xl font-semibold text-foreground mb-2">Activities</h2>
                <p className="text-sm text-muted-foreground">
                  Recent Activities, Asset Analysis and AI-Powered Recommendations
                </p>
              </div>
              
              {/* Global Distribution Section Heading */}
              <div className="mb-6" style={{ top: '980px', position: 'absolute' }}>
                <h2 className="text-xl font-semibold text-foreground mb-2">Global Distribution</h2>
                <p className="text-sm text-muted-foreground">
                  Worldwide Asset Location and Regional Overview
                </p>
              </div>
            </div>
            <IndependentDraggableTiles
              onLayoutChange={(layouts) => {
                // Optionally handle layout changes here
                console.log('Layout updated:', layouts);
              }}
              tiles={[
              // Asset Overview Section - Row 1 (improved spacing with proper margins)
              {
                id: 'hardware-tile',
                title: 'Hardware Assets',
                component: <HardwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 32, y: 220 },
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              {
                id: 'software-tile',
                title: 'Software Assets',
                component: <SoftwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 344, y: 220 }, // 32 + 280 + 32
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              {
                id: 'peripherals-tile',
                title: 'Peripherals Assets',
                component: <PeripheralsTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 656, y: 220 }, // 344 + 280 + 32
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              {
                id: 'others-tile',
                title: 'Other Assets',
                component: <OthersTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 968, y: 220 }, // 656 + 280 + 32
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              // ITAM Insights Section - Row 2 (insights and warnings with proper spacing)
              {
                id: 'unused-hardware-tile',
                title: 'Unused Hardware',
                component: <UnusedHardwareTile metrics={metrics} />,
                defaultPosition: { x: 32, y: 480 }, // 220 + 200 + 60
                width: 280,
                height: 160,
                section: 'metrics'
              },
              {
                id: 'unused-licenses-tile',
                title: 'Unused Licenses',
                component: <UnusedLicensesTile metrics={metrics} />,
                defaultPosition: { x: 344, y: 480 },
                width: 280,
                height: 160,
                section: 'metrics'
              },
              {
                id: 'expiring-items-tile',
                title: 'Expiring Warranties & Licenses',
                component: <ExpiringItemsTile metrics={metrics} />,
                defaultPosition: { x: 656, y: 480 },
                width: 280,
                height: 160,
                section: 'metrics'
              },
              {
                id: 'compliance-risk-tile',
                title: 'Compliance Risk',
                component: <ComplianceRiskTile metrics={metrics} />,
                defaultPosition: { x: 968, y: 480 },
                width: 280,
                height: 160,
                section: 'metrics'
              },
              // Activities Section - Row 3 (detailed analysis with improved spacing)
              {
                id: 'recent-activities-tile',
                title: 'Recent Activities',
                component: <RecentActivitiesTile metrics={metrics} />,
                defaultPosition: { x: 32, y: 700 }, // 480 + 160 + 60
                width: 380,
                height: 360,
                section: 'analytics'
              },
              {
                id: 'asset-age-analysis',
                title: 'Asset Age Analysis',
                component: metrics?.assetAgeAnalysis ? <AssetAgeAnalysis assetAgeAnalysis={metrics.assetAgeAnalysis} /> : <div className="text-muted-foreground p-4">Asset age analysis loading...</div>,
                defaultPosition: { x: 444, y: 700 }, // 32 + 380 + 32
                width: 380,
                height: 360,
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
                defaultPosition: { x: 856, y: 700 }, // 444 + 380 + 32
                width: 380,
                height: 360,
                section: 'analytics'
              },
              // Global Distribution Section - Row 4 (geographic and visual data with proper spacing)
              {
                id: 'world-map',
                title: 'Global Asset Distribution',
                component: <WorldMap />,
                defaultPosition: { x: 244, y: 1120 }, // 700 + 360 + 60, centered
                width: 760,
                height: 400,
                section: 'visual'
              },
            ]}
            />
          </div>
        )}
      </main>
    </div>
  );
}
