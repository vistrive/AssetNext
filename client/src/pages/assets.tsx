import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { AssetForm } from "@/components/assets/asset-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Laptop, Monitor, Code, Edit, Eye, Trash2, Search, Upload, Download, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import type { Asset, InsertAsset } from "@shared/schema";

export default function Assets() {
  const [location] = useLocation();
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [committedSearchTerm, setCommittedSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize filters based on URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const typeParam = urlParams.get('type');
    const categoryParam = urlParams.get('category');
    
    if (typeParam && ['hardware', 'software', 'peripheral', 'others'].includes(typeParam)) {
      setTypeFilter(typeParam);
    } else {
      setTypeFilter("all");
    }
    
    if (categoryParam) {
      setCategoryFilter(categoryParam);
    } else {
      setCategoryFilter("all");
    }
  }, [location]);

  // Get dynamic page title based on filter
  const getPageTitle = () => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
      // Create title from category (e.g., "pc" -> "PC Assets")
      const categoryName = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1).replace('-', ' ');
      return `${categoryName} Assets`;
    }
    
    switch (typeFilter) {
      case 'hardware': return 'Hardware Assets';
      case 'software': return 'Software Assets'; 
      case 'peripheral': return 'Peripheral Assets';
      case 'others': return 'Other Assets';
      default: return 'Assets';
    }
  };

  const getPageDescription = () => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
      const categoryDescriptions: Record<string, string> = {
        'pc': 'Manage desktop computers and workstations',
        'laptop': 'Manage portable computers and notebooks',
        'server': 'Manage server hardware and infrastructure',
        'rack': 'Manage server racks and data center equipment',
        'mobile': 'Manage mobile phones and cellular devices',
        'tablet': 'Manage tablets and portable touch devices',
        'printer': 'Manage printing devices and equipment',
        '3d-printer': 'Manage 3D printing equipment',
        'scanner': 'Manage scanning devices and equipment',
        'mouse': 'Manage computer mice and pointing devices',
        'router': 'Manage network routing equipment',
        'switch': 'Manage network switching equipment',
        'hub': 'Manage network hub equipment',
        'cctv': 'Manage CCTV cameras and surveillance equipment',
        'access-control': 'Manage access control hardware and systems'
      };
      return categoryDescriptions[categoryParam] || 'Manage specific asset category';
    }
    
    switch (typeFilter) {
      case 'hardware': return 'Manage hardware assets like laptops, desktops, and servers';
      case 'software': return 'Manage software licenses and applications';
      case 'peripheral': return 'Manage peripheral devices like printers and accessories';
      case 'others': return 'Manage other miscellaneous assets';
      default: return 'Manage your IT assets and equipment';
    }
  };

  // Fetch assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["/api/assets", typeFilter, statusFilter, categoryFilter, committedSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (committedSearchTerm.trim()) params.append("search", committedSearchTerm.trim());
      
      const response = await authenticatedRequest("GET", `/api/assets?${params}`);
      return response.json();
    },
  });

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async (assetData: InsertAsset) => {
      console.log("Creating asset with data:", assetData);
      try {
        const response = await authenticatedRequest("POST", "/api/assets", assetData);
        console.log("Create asset response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error("API Error Response:", errorData);
          throw new Error(`API Error ${response.status}: ${errorData}`);
        }
        
        const result = await response.json();
        console.log("Create asset response data:", result);
        return result;
      } catch (error) {
        console.error("Request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Asset creation successful:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsAssetFormOpen(false);
      setEditingAsset(undefined);
      toast({
        title: "Asset created",
        description: "The asset has been created successfully.",
      });
    },
    onError: (error) => {
      console.error("Asset creation failed:", error);
      let errorMessage = "Failed to create asset. Please try again.";
      
      if (error.message.includes("Authentication expired") || error.message.includes("No authentication token")) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (error.message.includes("400")) {
        errorMessage = "Please check all required fields are filled correctly.";
      } else if (error.message.includes("401")) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error.message.includes("422")) {
        errorMessage = "Invalid data provided. Please check your inputs.";
      } else if (error.message.includes("500")) {
        errorMessage = "Server error. Please try again later.";
      }
      
      toast({
        title: "Asset Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // If it's an auth error, close the form to prevent confusion
      if (error.message.includes("401") || error.message.includes("Authentication")) {
        setIsAssetFormOpen(false);
        setEditingAsset(undefined);
      }
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

  const handleAssetSubmit = (assetData: Omit<InsertAsset, 'tenantId'> | InsertAsset) => {
    console.log("handleAssetSubmit called with:", assetData);
    console.log("editingAsset:", editingAsset);
    if (editingAsset) {
      console.log("Updating existing asset");
      updateAssetMutation.mutate({ id: editingAsset.id, data: assetData as InsertAsset });
    } else {
      console.log("Creating new asset");
      createAssetMutation.mutate(assetData as InsertAsset);
    }
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      deleteAssetMutation.mutate(id);
    }
  };

  // Handle search functionality
  const handleSearch = () => {
    // Read the input value and call the search API
    setCommittedSearchTerm(searchTerm);
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    setCommittedSearchTerm("");
    searchInputRef.current?.focus();
  };

  // Bulk upload functions
  const handleBulkUpload = () => {
    setIsBulkUploadOpen(true);
    setUploadFile(null);
    setUploadResults(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
        return;
      }
      setUploadFile(file);
      setUploadResults(null);
    }
  };

  const validateFile = async () => {
    if (!uploadFile) return;

    setIsValidating(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await authenticatedRequest(
        "POST", 
        "/api/assets/bulk/upload?validateOnly=true", 
        formData
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Validation failed" }));
        throw new Error(errorData.message || "Validation failed");
      }

      const results = await response.json();
      setUploadResults(results);
    } catch (error) {
      toast({
        title: "Validation failed",
        description: error instanceof Error ? error.message : "Failed to validate the CSV file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const importAssets = async (mode: 'partial' | 'atomic' = 'partial') => {
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await authenticatedRequest(
        "POST", 
        `/api/assets/bulk/upload?mode=${mode}`, 
        formData
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Import failed" }));
        throw new Error(errorData.message || "Import failed");
      }

      const results = await response.json();
      
      if (results.summary.inserted > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
        
        toast({
          title: "Import successful",
          description: `Successfully imported ${results.summary.inserted} assets.`,
        });
        
        setIsBulkUploadOpen(false);
        setUploadFile(null);
        setUploadResults(null);
      } else {
        setUploadResults(results);
        toast({
          title: "No assets imported",
          description: results.message || "No valid assets found to import.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await authenticatedRequest("GET", "/api/assets/bulk/template");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Download failed" }));
        throw new Error(errorData.message || "Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'asset_template_with_samples.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download template. Please try again.",
        variant: "destructive",
      });
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

  // Assets are already filtered by the backend, no need for client-side filtering
  const filteredAssets = assets;

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
      
      <main className="flex-1 md:ml-64 overflow-auto">
        <TopBar
          title={getPageTitle()}
          description={getPageDescription()}
          onAddClick={handleAddAsset}
          addButtonText="Add Asset"
          onBulkUploadClick={handleBulkUpload}
        />
        
        <div className="p-6">
          {/* Active Search Indicator */}
          {committedSearchTerm && (
            <div className="mb-4">
              <div className="inline-flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                <span>Searching for: "{committedSearchTerm}"</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="ml-2 text-primary hover:text-primary/80 focus:outline-none"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                  data-testid="button-search"
                  title="Search assets"
                  aria-label="Search assets"
                >
                  <Search className="h-4 w-4" />
                </button>
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                  data-testid="input-search-assets"
                />
                {(searchTerm || committedSearchTerm) && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                    data-testid="button-clear-search"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="peripheral">Peripherals</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
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
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Vendor</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Company</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Location</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Assigned To</th>
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
                          <div>
                            <p className="font-medium text-foreground">{asset.vendorName || "Not specified"}</p>
                            {asset.vendorEmail && (
                              <p className="text-xs text-muted-foreground">{asset.vendorEmail}</p>
                            )}
                            {asset.vendorPhone && (
                              <p className="text-xs text-muted-foreground">{asset.vendorPhone}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          <div>
                            <p className="font-medium text-foreground">{asset.companyName || "Not specified"}</p>
                            {asset.companyGstNumber && (
                              <p className="text-xs text-muted-foreground">GST: {asset.companyGstNumber}</p>
                            )}
                          </div>
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
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center space-y-2">
                          <Monitor className="h-12 w-12 text-muted-foreground/50" />
                          <p>No assets found</p>
                          <p className="text-sm">
                            {committedSearchTerm || typeFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all"
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

      {/* Bulk Upload Modal */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Upload Assets</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="download" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="download">Download Template</TabsTrigger>
              <TabsTrigger value="upload">Upload CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="download" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Step 1: Download Template</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download a comprehensive CSV template with sample data showing all asset types (hardware, software, peripherals) and statuses.
                  </p>
                  
                  <Button 
                    variant="outline" 
                    onClick={downloadTemplate}
                    data-testid="button-download-template"
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Template with Samples
                  </Button>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Step 2: Customize Your Data</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Template includes sample data for:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Hardware:</strong> Laptops, desktops with deployed/in-stock status</li>
                      <li>• <strong>Software:</strong> Applications with subscription/perpetual licenses</li>
                      <li>• <strong>Peripherals:</strong> Printers, accessories with all statuses</li>
                    </ul>
                    
                    <h4 className="font-medium mb-2 mt-4">Key Guidelines:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Replace sample data with your actual asset information</li>
                      <li>• Keep the same column headers (do not modify)</li>
                      <li>• Required fields: <strong>name, type, status</strong></li>
                      <li>• Date format: <strong>YYYY-MM-DD</strong> (e.g., 2024-01-15)</li>
                      <li>• Software assets should include software_name and version</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Step 3: Upload Your CSV</h3>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="bulk-upload-file"
                      data-testid="input-bulk-file"
                    />
                    <label htmlFor="bulk-upload-file" className="cursor-pointer">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">Choose CSV file</p>
                      <p className="text-sm text-muted-foreground">
                        Click to select your completed CSV file (max 5MB, 5000 rows)
                      </p>
                    </label>
                  </div>

                  {uploadFile && (
                    <div className="mt-4">
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertDescription>
                          Selected file: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                        </AlertDescription>
                      </Alert>

                      <div className="flex gap-2 mt-4">
                        <Button 
                          onClick={validateFile} 
                          disabled={isValidating}
                          data-testid="button-validate"
                        >
                          {isValidating ? "Validating..." : "Validate File"}
                        </Button>
                        
                        {uploadResults && uploadResults.summary.valid > 0 && (
                          <>
                            <Button 
                              onClick={() => importAssets('partial')} 
                              disabled={isUploading}
                              data-testid="button-import-partial"
                            >
                              {isUploading ? "Importing..." : "Import Valid Assets"}
                            </Button>
                            
                            {uploadResults.summary.invalid === 0 && (
                              <Button 
                                onClick={() => importAssets('atomic')} 
                                disabled={isUploading}
                                variant="outline"
                                data-testid="button-import-all"
                              >
                                Import All (Atomic)
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {uploadResults && (
                    <div className="mt-6 space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-muted p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold">{uploadResults.summary.total}</div>
                          <div className="text-sm text-muted-foreground">Total Rows</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">{uploadResults.summary.valid}</div>
                          <div className="text-sm text-muted-foreground">Valid</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-600">{uploadResults.summary.invalid}</div>
                          <div className="text-sm text-muted-foreground">Invalid</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600">{uploadResults.summary.inserted || 0}</div>
                          <div className="text-sm text-muted-foreground">Imported</div>
                        </div>
                      </div>

                      {uploadResults.rows && uploadResults.rows.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr>
                                  <th className="text-left py-2 px-3">Row</th>
                                  <th className="text-left py-2 px-3">Status</th>
                                  <th className="text-left py-2 px-3">Issues</th>
                                </tr>
                              </thead>
                              <tbody>
                                {uploadResults.rows.map((row: any, index: number) => (
                                  <tr key={index} className="border-t">
                                    <td className="py-2 px-3">{row.rowNumber}</td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1">
                                        {row.status === 'valid' ? (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-600" />
                                        )}
                                        <span className={row.status === 'valid' ? 'text-green-600' : 'text-red-600'}>
                                          {row.status}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3">
                                      {row.errors?.length > 0 && (
                                        <div className="text-red-600 text-xs">
                                          {row.errors.join(', ')}
                                        </div>
                                      )}
                                      {row.warnings?.length > 0 && (
                                        <div className="text-yellow-600 text-xs">
                                          {row.warnings.join(', ')}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
