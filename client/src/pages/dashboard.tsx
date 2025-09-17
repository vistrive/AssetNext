import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { AssetStatusChart } from "@/components/dashboard/asset-status-chart";
import { AIRecommendations } from "@/components/dashboard/ai-recommendations";
import { RecentAssets } from "@/components/dashboard/recent-assets";
import { AssetForm } from "@/components/assets/asset-form";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Asset, Recommendation } from "@shared/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [assetFilter, setAssetFilter] = useState("all");
  const { toast } = useToast();

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/dashboard/metrics");
      return response.json();
    },
  });

  // Fetch recent assets
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["/api/assets"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/assets");
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

  const handleAddAsset = () => {
    setIsAssetFormOpen(true);
  };

  const handleAssetSubmit = async (assetData: any) => {
    try {
      await authenticatedRequest("POST", "/api/assets", assetData);
      setIsAssetFormOpen(false);
      toast({
        title: "Asset created",
        description: "The asset has been created successfully.",
      });
      // Refresh data would happen here with query invalidation
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create asset. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFilterChange = (filter: string) => {
    setAssetFilter(filter);
  };

  const handleViewAllAssets = () => {
    navigate("/assets");
  };

  const handleViewAllRecommendations = () => {
    navigate("/recommendations");
  };

  const handleViewRecommendation = (id: string) => {
    navigate(`/recommendations?id=${id}`);
  };

  const handleEditAsset = (id: string) => {
    navigate(`/assets?edit=${id}`);
  };

  const handleViewAsset = (id: string) => {
    navigate(`/assets?view=${id}`);
  };

  if (metricsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter assets based on selected filter
  const filteredAssets = assets.filter((asset: Asset) => {
    if (assetFilter === "all") return true;
    return asset.type === assetFilter;
  }).slice(0, 10); // Show only recent 10

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <TopBar
          title="Dashboard"
          description="Overview of your IT assets and system health"
          onAddClick={handleAddAsset}
        />
        
        <div className="p-6 space-y-6">
          {metrics && <MetricsGrid metrics={metrics} />}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {metrics && (
              <AssetStatusChart
                statusBreakdown={metrics.assetStatusBreakdown}
                totalAssets={metrics.totalAssets}
              />
            )}
            
            <AIRecommendations
              recommendations={recommendations}
              onViewAll={handleViewAllRecommendations}
              onViewRecommendation={handleViewRecommendation}
            />
          </div>
          
          <RecentAssets
            assets={filteredAssets}
            onFilterChange={handleFilterChange}
            onViewAll={handleViewAllAssets}
            onEditAsset={handleEditAsset}
            onViewAsset={handleViewAsset}
          />
        </div>
      </main>
      
      <AssetForm
        isOpen={isAssetFormOpen}
        onClose={() => setIsAssetFormOpen(false)}
        onSubmit={handleAssetSubmit}
      />
    </div>
  );
}
