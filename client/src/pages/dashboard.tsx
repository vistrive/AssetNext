import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { AssetCategoryTiles } from "@/components/dashboard/asset-category-tiles";
import { AIRecommendations } from "@/components/dashboard/ai-recommendations";
import { ITAMInsights } from "@/components/dashboard/itam-insights";
import { DraggableGrid } from "@/components/dashboard/draggable-grid";
import { AssetAgeAnalysis } from "@/components/dashboard/asset-age-analysis";
import { WorldMap } from "@/components/dashboard/world-map";
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
        
        <div className="p-6">
          {metrics && (
            <DraggableGrid
              tiles={[
                {
                  id: 'asset-category-tiles',
                  title: 'Asset Overview',
                  component: (
                    <AssetCategoryTiles 
                      metrics={metrics} 
                      onNavigateToAssets={handleNavigateToAssets}
                    />
                  ),
                  size: 'full'
                },
                {
                  id: 'itam-insights',
                  title: 'ITAM Insights',
                  component: <ITAMInsights metrics={metrics} />,
                  size: 'full'
                },
                {
                  id: 'asset-age-analysis',
                  title: 'Asset Age Analysis',
                  component: metrics?.assetAgeAnalysis ? <AssetAgeAnalysis assetAgeAnalysis={metrics.assetAgeAnalysis} /> : <div className="text-muted-foreground p-4">Asset age analysis loading...</div>,
                  size: 'large'
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
                  size: 'large'
                },
                {
                  id: 'world-map',
                  title: 'Global Asset Distribution',
                  component: <WorldMap />,
                  size: 'large'
                },
              ]}
            />
          )}
        </div>
      </main>
    </div>
  );
}
