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
        
        {/* Global Search Bar */}
        
        {/* Dashboard Content - Independent Draggable Tiles */}
        {metrics && (
          <IndependentDraggableTiles
            tiles={[
              // Asset Overview Individual Tiles
              {
                id: 'hardware-tile',
                title: 'Hardware Assets',
                component: <HardwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 100, y: 120 },
                width: 280,
                height: 200
              },
              {
                id: 'software-tile',
                title: 'Software Assets',
                component: <SoftwareTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 400, y: 120 },
                width: 280,
                height: 200
              },
              {
                id: 'peripherals-tile',
                title: 'Peripherals Assets',
                component: <PeripheralsTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 700, y: 120 },
                width: 280,
                height: 200
              },
              {
                id: 'others-tile',
                title: 'Other Assets',
                component: <OthersTile metrics={metrics} onNavigateToAssets={handleNavigateToAssets} />,
                defaultPosition: { x: 1000, y: 120 },
                width: 280,
                height: 200
              },
              // ITAM Insights Individual Tiles
              {
                id: 'unused-hardware-tile',
                title: 'Unused Hardware',
                component: <UnusedHardwareTile metrics={metrics} />,
                defaultPosition: { x: 100, y: 340 },
                width: 280,
                height: 160
              },
              {
                id: 'unused-licenses-tile',
                title: 'Unused Licenses',
                component: <UnusedLicensesTile metrics={metrics} />,
                defaultPosition: { x: 400, y: 340 },
                width: 280,
                height: 160
              },
              {
                id: 'expiring-items-tile',
                title: 'Expiring Items',
                component: <ExpiringItemsTile metrics={metrics} />,
                defaultPosition: { x: 700, y: 340 },
                width: 280,
                height: 160
              },
              {
                id: 'compliance-risk-tile',
                title: 'Compliance Risk',
                component: <ComplianceRiskTile metrics={metrics} />,
                defaultPosition: { x: 1000, y: 340 },
                width: 280,
                height: 160
              },
              {
                id: 'recent-activities-tile',
                title: 'Recent Activities',
                component: <RecentActivitiesTile metrics={metrics} />,
                defaultPosition: { x: 100, y: 520 },
                width: 380,
                height: 400
              },
              // Existing Complex Tiles
              {
                id: 'asset-age-analysis',
                title: 'Asset Age Analysis',
                component: metrics?.assetAgeAnalysis ? <AssetAgeAnalysis assetAgeAnalysis={metrics.assetAgeAnalysis} /> : <div className="text-muted-foreground p-4">Asset age analysis loading...</div>,
                defaultPosition: { x: 500, y: 520 },
                width: 480,
                height: 350
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
                defaultPosition: { x: 1000, y: 520 },
                width: 480,
                height: 350
              },
              {
                id: 'world-map',
                title: 'Global Asset Distribution',
                component: <WorldMap />,
                defaultPosition: { x: 100, y: 940 },
                width: 500,
                height: 350
              },
            ]}
          />
        )}
      </main>
    </div>
  );
}
