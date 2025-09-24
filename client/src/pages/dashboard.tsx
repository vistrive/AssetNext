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
        
        {/* Global Search Bar */}
        
        {/* Dashboard Content - Independent Draggable Tiles */}
        {metrics && (
          <IndependentDraggableTiles
            onLayoutChange={(layouts) => {
              // Optionally handle layout changes here
              console.log('Layout updated:', layouts);
            }}
            tiles={[
              // Asset Overview Section - Row 1 (consistent 24px gutters, equal card widths)
              {
                id: 'hardware-tile',
                title: 'Hardware Assets',
                component: <HardwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 24, y: 140 },
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              {
                id: 'software-tile',
                title: 'Software Assets',
                component: <SoftwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 328, y: 140 }, // 24 + 280 + 24
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              {
                id: 'peripherals-tile',
                title: 'Peripherals Assets',
                component: <PeripheralsTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 632, y: 140 }, // 328 + 280 + 24
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              {
                id: 'others-tile',
                title: 'Other Assets',
                component: <OthersTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 936, y: 140 }, // 632 + 280 + 24
                width: 280,
                height: 200,
                section: 'asset-overview'
              },
              // Core Metrics Section - Row 2 (insights and warnings)
              {
                id: 'unused-hardware-tile',
                title: 'Unused Hardware',
                component: <UnusedHardwareTile metrics={metrics} />,
                defaultPosition: { x: 24, y: 364 }, // 140 + 200 + 24
                width: 280,
                height: 160,
                section: 'metrics'
              },
              {
                id: 'unused-licenses-tile',
                title: 'Unused Licenses',
                component: <UnusedLicensesTile metrics={metrics} />,
                defaultPosition: { x: 328, y: 364 },
                width: 280,
                height: 160,
                section: 'metrics'
              },
              {
                id: 'expiring-items-tile',
                title: 'Expiring Items',
                component: <ExpiringItemsTile metrics={metrics} />,
                defaultPosition: { x: 632, y: 364 },
                width: 280,
                height: 160,
                section: 'metrics'
              },
              {
                id: 'compliance-risk-tile',
                title: 'Compliance Risk',
                component: <ComplianceRiskTile metrics={metrics} />,
                defaultPosition: { x: 936, y: 364 },
                width: 280,
                height: 160,
                section: 'metrics'
              },
              // Analytics Section - Row 3 (detailed analysis)
              {
                id: 'recent-activities-tile',
                title: 'Recent Activities',
                component: <RecentActivitiesTile metrics={metrics} />,
                defaultPosition: { x: 24, y: 548 }, // 364 + 160 + 24
                width: 380,
                height: 360,
                section: 'analytics'
              },
              {
                id: 'asset-age-analysis',
                title: 'Asset Age Analysis',
                component: metrics?.assetAgeAnalysis ? <AssetAgeAnalysis assetAgeAnalysis={metrics.assetAgeAnalysis} /> : <div className="text-muted-foreground p-4">Asset age analysis loading...</div>,
                defaultPosition: { x: 428, y: 548 }, // 24 + 380 + 24
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
                defaultPosition: { x: 832, y: 548 }, // 428 + 380 + 24
                width: 380,
                height: 360,
                section: 'analytics'
              },
              // Visual Section - Row 4 (geographic and visual data)
              {
                id: 'world-map',
                title: 'Global Asset Distribution',
                component: <WorldMap />,
                defaultPosition: { x: 228, y: 932 }, // 548 + 360 + 24, centered
                width: 760,
                height: 400,
                section: 'visual'
              },
            ]}
          />
        )}
      </main>
    </div>
  );
}
