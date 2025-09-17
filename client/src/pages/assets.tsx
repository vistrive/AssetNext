import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { AssetForm } from "@/components/assets/asset-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Laptop, Monitor, Code, Edit, Eye, Trash2, Search } from "lucide-react";
import type { Asset, InsertAsset } from "@shared/schema";

export default function Assets() {
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["/api/assets", typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await authenticatedRequest("GET", `/api/assets?${params}`);
      return response.json();
    },
  });

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async (assetData: InsertAsset) => {
      const response = await authenticatedRequest("POST", "/api/assets", assetData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsAssetFormOpen(false);
      setEditingAsset(undefined);
      toast({
        title: "Asset created",
        description: "The asset has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAsset> }) => {
      const response = await authenticatedRequest("PUT", `/api/assets/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsAssetFormOpen(false);
      setEditingAsset(undefined);
      toast({
        title: "Asset updated",
        description: "The asset has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Asset deleted",
        description: "The asset has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddAsset = () => {
    setEditingAsset(undefined);
    setIsAssetFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsAssetFormOpen(true);
  };

  const handleAssetSubmit = (assetData: InsertAsset) => {
    if (editingAsset) {
      updateAssetMutation.mutate({ id: editingAsset.id, data: assetData });
    } else {
      createAssetMutation.mutate(assetData);
    }
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      deleteAssetMutation.mutate(id);
    }
  };

  const getAssetIcon = (type: string, category?: string) => {
    if (type === "software") return Code;
    if (category === "laptop") return Laptop;
    return Monitor;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "deployed":
        return "status-deployed";
      case "in-stock":
        return "status-in-stock";
      case "in-repair":
        return "status-in-repair";
      case "disposed":
        return "status-disposed";
      default:
        return "status-in-stock";
    }
  };

  // Filter assets based on search term
  const filteredAssets = assets.filter((asset: Asset) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      asset.name.toLowerCase().includes(searchLower) ||
      asset.serialNumber?.toLowerCase().includes(searchLower) ||
      asset.manufacturer?.toLowerCase().includes(searchLower) ||
      asset.model?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <TopBar
          title="Assets"
          description="Manage your IT assets and equipment"
          onAddClick={handleAddAsset}
          addButtonText="Add Asset"
        />
        
        <div className="p-6">
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-assets"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="peripheral">Peripheral</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                  <SelectItem value="in-repair">In Repair</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assets Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Asset</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Type</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Status</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Location</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Assigned To</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Purchase Cost</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset: Asset) => {
                    const Icon = getAssetIcon(asset.type, asset.category || undefined);
                    
                    return (
                      <tr 
                        key={asset.id}
                        className="border-b border-border hover:bg-muted/25 transition-colors"
                        data-testid={`asset-row-${asset.id}`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                              <Icon className="text-muted-foreground h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{asset.name}</p>
                              <p className="text-muted-foreground text-sm">
                                {asset.serialNumber || "No Serial Number"}
                              </p>
                              {asset.manufacturer && asset.model && (
                                <p className="text-muted-foreground text-xs">
                                  {asset.manufacturer} {asset.model}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="capitalize text-foreground">{asset.type}</span>
                        </td>
                        <td className="py-4 px-6">
                          <Badge className={`asset-status-badge ${getStatusBadgeClass(asset.status)}`}>
                            {asset.status.replace('-', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {asset.location || "Not specified"}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {asset.assignedUserName || "Unassigned"}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {asset.purchaseCost ? `$${parseFloat(asset.purchaseCost).toLocaleString()}` : "N/A"}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAsset(asset)}
                              data-testid={`button-edit-${asset.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAsset(asset.id)}
                              data-testid={`button-delete-${asset.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredAssets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center space-y-2">
                          <Monitor className="h-12 w-12 text-muted-foreground/50" />
                          <p>No assets found</p>
                          <p className="text-sm">
                            {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                              ? "Try adjusting your filters"
                              : "Add your first asset to get started"
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      
      <AssetForm
        isOpen={isAssetFormOpen}
        onClose={() => {
          setIsAssetFormOpen(false);
          setEditingAsset(undefined);
        }}
        onSubmit={handleAssetSubmit}
        asset={editingAsset}
        isLoading={createAssetMutation.isPending || updateAssetMutation.isPending}
      />
    </div>
  );
}
