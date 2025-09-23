import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { authenticatedRequest } from "@/lib/auth";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { insertAssetSchema, insertMasterDataSchema } from "@shared/schema";
import type { Asset, InsertAsset, MasterData } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const assetFormSchema = insertAssetSchema.extend({
  tenantId: z.string().optional(), // Make tenantId optional for form validation
  purchaseDate: z.string().optional(),
  purchaseCost: z.coerce.number().positive().optional().or(z.undefined()),
  warrantyExpiry: z.string().optional(),
  renewalDate: z.string().optional(),
  vendorEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")).or(z.undefined()),
  vendorPhone: z.string().regex(/^[\+]?[\d\s\-\(\)]*$/, "Please enter a valid phone number").optional().or(z.literal("")).or(z.undefined()),
  companyGstNumber: z.string().optional().or(z.literal("")).or(z.undefined()),
}).superRefine((data, ctx) => {
  // Make software-specific fields mandatory when type is 'Software'
  if (data.type === 'Software') {
    if (!data.softwareName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Software name is required for software assets",
        path: ["softwareName"],
      });
    }
    if (!data.version) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Version is required for software assets",
        path: ["version"],
      });
    }
    if (!data.licenseType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "License type is required for software assets",
        path: ["licenseType"],
      });
    }
    if (!data.licenseKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "License key is required for software assets",
        path: ["licenseKey"],
      });
    }
    if (data.usedLicenses === undefined || data.usedLicenses === null || !Number.isFinite(data.usedLicenses) || data.usedLicenses < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Used licenses must be a valid non-negative number",
        path: ["usedLicenses"],
      });
    }
    if (!data.renewalDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Renewal date is required for software assets",
        path: ["renewalDate"],
      });
    }
  }
});

type AssetFormData = z.infer<typeof assetFormSchema>;

interface ComboSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  type: string;
  placeholder: string;
  label: string;
  dataTestId: string;
}

function ComboSelect({ value, onValueChange, type, placeholder, label, dataTestId }: ComboSelectProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newValue, setNewValue] = useState("");
  const { toast } = useToast();

  const { data: masterData = [], isLoading, error } = useQuery<MasterData[]>({
    queryKey: ['/api/master', type],
  });

  const addMasterDataMutation = useMutation<MasterData, Error, { type: string; value: string }>({
    mutationFn: async (data: { type: string; value: string }) => {
      const response = await authenticatedRequest("POST", `/api/master`, data);
      return response.json() as Promise<MasterData>;
    },
    onSuccess: (newMasterData: MasterData) => {
      queryClient.invalidateQueries({ queryKey: ['/api/master', type] });
      onValueChange(newMasterData.value);
      setShowAddDialog(false);
      setNewValue("");
      setOpen(false);
      toast({
        title: "Added successfully",
        description: `New ${label.toLowerCase()} has been added.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || `Failed to add ${label.toLowerCase()}. You might not have permission to add new items.`,
        variant: "destructive",
      });
    },
  });

  const handleAddNew = () => {
    if (newValue.trim()) {
      addMasterDataMutation.mutate({ type, value: newValue.trim() });
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            data-testid={dataTestId}
          >
            {value ? value : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandEmpty>
              <div className="p-2">
                <p>No {label.toLowerCase()} found.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setShowAddDialog(true)}
                  data-testid={`button-add-new-${type}`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add new {label.toLowerCase()}
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {masterData.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  data-testid={`option-${type}-${item.value}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.value}
                </CommandItem>
              ))}
              {masterData.length > 0 && (
                <CommandItem onSelect={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add new {label.toLowerCase()}
                </CommandItem>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-value">New {label}</Label>
              <Input
                id="new-value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`Enter new ${label.toLowerCase()}`}
                data-testid={`input-new-${type}`}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewValue("");
                }}
                data-testid={`button-cancel-${type}`}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNew}
                disabled={!newValue.trim() || addMasterDataMutation.isPending}
                data-testid={`button-save-${type}`}
              >
                {addMasterDataMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface AssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<InsertAsset, 'tenantId'>) => void;
  asset?: Asset;
  isLoading?: boolean;
}

export function AssetForm({ isOpen, onClose, onSubmit, asset, isLoading }: AssetFormProps) {
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState<AssetFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: asset ? {
      name: asset.name,
      type: asset.type,
      category: asset.category || "",
      manufacturer: asset.manufacturer || "",
      model: asset.model || "",
      serialNumber: asset.serialNumber || "",
      status: asset.status,
      location: asset.location || "",
      assignedUserName: asset.assignedUserName || "",
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : "",
      purchaseCost: asset.purchaseCost ? Number(asset.purchaseCost) : undefined,
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : "",
      // Software-specific fields
      softwareName: asset.softwareName || "",
      version: asset.version || "",
      licenseType: asset.licenseType || "",
      licenseKey: asset.licenseKey || "",
      usedLicenses: asset.usedLicenses || 0,
      renewalDate: asset.renewalDate ? new Date(asset.renewalDate).toISOString().split('T')[0] : "",
      notes: asset.notes || "",
      vendorName: asset.vendorName || "",
      vendorEmail: asset.vendorEmail || "",
      vendorPhone: asset.vendorPhone || "",
      companyName: asset.companyName || "",
      companyGstNumber: asset.companyGstNumber || "",
    } : {
      name: "",
      type: "",
      status: "",
      category: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
      location: "",
      assignedUserName: "",
      purchaseDate: "",
      purchaseCost: undefined,
      warrantyExpiry: "",
      softwareName: "",
      version: "",
      licenseType: "",
      licenseKey: "",
      usedLicenses: 0,
      renewalDate: "",
      notes: "",
      vendorName: "",
      vendorEmail: "",
      vendorPhone: "",
      companyName: "",
      companyGstNumber: "",
      tenantId: "", // Add tenantId to default values
    },
  });

  // Reset form when asset prop changes (for edit mode)
  useEffect(() => {
    if (asset) {
      // Pre-fill form with existing asset data
      reset({
        name: asset.name,
        type: asset.type,
        category: asset.category || "",
        manufacturer: asset.manufacturer || "",
        model: asset.model || "",
        serialNumber: asset.serialNumber || "",
        status: asset.status,
        location: asset.location || "",
        assignedUserName: asset.assignedUserName || "",
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : "",
        purchaseCost: asset.purchaseCost ? Number(asset.purchaseCost) : undefined,
        warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : "",
        // Software-specific fields
        softwareName: asset.softwareName || "",
        version: asset.version || "",
        licenseType: asset.licenseType || "",
        licenseKey: asset.licenseKey || "",
        usedLicenses: asset.usedLicenses || 0,
        renewalDate: asset.renewalDate ? new Date(asset.renewalDate).toISOString().split('T')[0] : "",
        notes: asset.notes || "",
        vendorName: asset.vendorName || "",
        vendorEmail: asset.vendorEmail || "",
        vendorPhone: asset.vendorPhone || "",
        companyName: asset.companyName || "",
        companyGstNumber: asset.companyGstNumber || "",
        tenantId: "", // Add tenantId to form data
      });
    } else {
      // Reset to empty form for create mode
      reset({
        name: "",
        type: "",
        status: "",
        category: "",
        manufacturer: "",
        model: "",
        serialNumber: "",
        location: "",
        assignedUserName: "",
        purchaseDate: "",
        purchaseCost: undefined,
        warrantyExpiry: "",
        softwareName: "",
        version: "",
        licenseType: "",
        licenseKey: "",
        usedLicenses: 0,
        renewalDate: "",
        notes: "",
        vendorName: "",
        vendorEmail: "",
        vendorPhone: "",
        companyName: "",
        companyGstNumber: "",
        tenantId: "",
      });
    }
  }, [asset, reset]);

  const handleFormSubmit = (data: AssetFormData) => {
    console.log("Form submission data:", data);
    console.log("Form errors:", errors);
    
    // For edit mode, skip review and submit directly
    if (asset) {
      const { tenantId: _, ...restData } = data;
      const submitData: Omit<InsertAsset, 'tenantId'> = {
        ...restData,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
      };
      console.log("Submitting asset data:", submitData);
      onSubmit(submitData);
      return;
    }
    
    // For create mode, show review step first
    setReviewData(data);
    setShowReview(true);
  };

  const handleProceedWithCreation = () => {
    if (!reviewData) return;
    
    const { tenantId: _, ...restData } = reviewData;
    const submitData: Omit<InsertAsset, 'tenantId'> = {
      ...restData,
      purchaseDate: reviewData.purchaseDate ? new Date(reviewData.purchaseDate) : undefined,
      warrantyExpiry: reviewData.warrantyExpiry ? new Date(reviewData.warrantyExpiry) : undefined,
      renewalDate: reviewData.renewalDate ? new Date(reviewData.renewalDate) : undefined,
    };
    
    console.log("Creating asset after review:", submitData);
    onSubmit(submitData);
    setShowReview(false);
    setReviewData(null);
  };

  const handleBackToEdit = () => {
    setShowReview(false);
    setReviewData(null);
  };

  const handleClose = () => {
    reset();
    setShowReview(false);
    setReviewData(null);
    onClose();
  };

  const formatFieldValue = (value: any, fieldType?: string): string => {
    if (value === null || value === undefined || value === "") return "Not specified";
    
    if (fieldType === "date" && typeof value === "string") {
      const date = new Date(value);
      return date.toLocaleDateString();
    }
    
    if (fieldType === "currency" && typeof value === "number") {
      return `$${value.toFixed(2)}`;
    }
    
    return String(value);
  };

  const renderReviewDialog = () => (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Review Asset Details</DialogTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Please review the asset information below before creating the asset.
        </p>
      </DialogHeader>
      
      {reviewData && (
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3 text-foreground border-b pb-2">Basic Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Asset Name:</span>
                <p className="text-foreground" data-testid="text-review-asset-name">{formatFieldValue(reviewData.name)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Type:</span>
                <p className="text-foreground" data-testid="text-review-type">{formatFieldValue(reviewData.type)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Serial Number:</span>
                <p className="text-foreground" data-testid="text-review-serial-number">{formatFieldValue(reviewData.serialNumber)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Category:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.category)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Model:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.model)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Manufacturer:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.manufacturer)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Status:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.status)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Location:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.location)}</p>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">Assigned User:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.assignedUserName)}</p>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3 text-foreground border-b pb-2">Financial Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Purchase Date:</span>
                <p className="text-foreground" data-testid="text-review-purchase-date">{formatFieldValue(reviewData.purchaseDate, "date")}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Purchase Cost:</span>
                <p className="text-foreground" data-testid="text-review-purchase-cost">{formatFieldValue(reviewData.purchaseCost, "currency")}</p>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">Warranty Expiry:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.warrantyExpiry, "date")}</p>
              </div>
            </div>
          </div>

          {/* Software Details - only show if type is Software */}
          {reviewData.type === "Software" && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 text-foreground border-b pb-2">Software Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Software Name:</span>
                  <p className="text-foreground">{formatFieldValue(reviewData.softwareName)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Version:</span>
                  <p className="text-foreground">{formatFieldValue(reviewData.version)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">License Type:</span>
                  <p className="text-foreground">{formatFieldValue(reviewData.licenseType)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Used Licenses:</span>
                  <p className="text-foreground">{formatFieldValue(reviewData.usedLicenses)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">License Key:</span>
                  <p className="text-foreground">{formatFieldValue(reviewData.licenseKey)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Renewal Date:</span>
                  <p className="text-foreground">{formatFieldValue(reviewData.renewalDate, "date")}</p>
                </div>
              </div>
            </div>
          )}

          {/* Vendor & Company Information */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3 text-foreground border-b pb-2">Vendor & Company Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Vendor Name:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.vendorName)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Vendor Email:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.vendorEmail)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Vendor Phone:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.vendorPhone)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Company Name:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.companyName)}</p>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">GST Number:</span>
                <p className="text-foreground">{formatFieldValue(reviewData.companyGstNumber)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {reviewData.notes && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 text-foreground border-b pb-2">Notes</h3>
              <p className="text-sm text-foreground">{reviewData.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleBackToEdit}
              data-testid="button-back-to-edit"
            >
              Back to Edit
            </Button>
            <Button 
              type="button" 
              onClick={handleProceedWithCreation}
              disabled={isLoading}
              data-testid="button-proceed-creation"
            >
              {isLoading ? "Creating..." : "Proceed with Creation"}
            </Button>
          </div>
        </div>
      )}
    </DialogContent>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {showReview ? renderReviewDialog() : (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          </DialogHeader>
        
        <form onSubmit={(e) => {
          console.log("Form onSubmit event triggered!");
          console.log("Form validation state:", { isValid: !Object.keys(errors).length });
          console.log("Current form errors:", errors);
          handleSubmit(handleFormSubmit)(e);
        }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Asset Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g., MacBook Pro 16-inch"
                data-testid="input-asset-name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="type">Asset Type *</Label>
              <Select 
                value={watch("type")} 
                onValueChange={(value) => setValue("type", value)}
              >
                <SelectTrigger data-testid="select-asset-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hardware">Hardware</SelectItem>
                  <SelectItem value="Software">Software</SelectItem>
                  <SelectItem value="Peripherals">Peripherals</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                {...register("serialNumber")}
                placeholder="e.g., A1234567890"
                data-testid="input-serial-number"
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <ComboSelect
                value={watch("category") || ""}
                onValueChange={(value) => setValue("category", value)}
                type="category"
                placeholder="Select category"
                label="Category"
                dataTestId="select-category"
              />
            </div>
            
            <div>
              <Label htmlFor="model">Model</Label>
              <ComboSelect
                value={watch("model") || ""}
                onValueChange={(value) => setValue("model", value)}
                type="model"
                placeholder="Select model"
                label="Model"
                dataTestId="select-model"
              />
            </div>
            
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <ComboSelect
                value={watch("manufacturer") || ""}
                onValueChange={(value) => setValue("manufacturer", value)}
                type="manufacturer"
                placeholder="Select manufacturer"
                label="Manufacturer"
                dataTestId="select-manufacturer"
              />
            </div>
            
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={watch("status")} 
                onValueChange={(value) => setValue("status", value)}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                  <SelectItem value="in-repair">In Repair</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                {...register("purchaseDate")}
                data-testid="input-purchase-date"
              />
            </div>
            
            <div>
              <Label htmlFor="purchaseCost">Purchase Cost</Label>
              <Input
                id="purchaseCost"
                type="number"
                step="0.01"
                {...register("purchaseCost", { 
                  setValueAs: v => v === '' || v == null || Number.isNaN(+v) ? undefined : +v 
                })}
                placeholder="0.00"
                data-testid="input-purchase-cost"
              />
              {errors.purchaseCost && (
                <p className="text-red-500 text-sm mt-1">{errors.purchaseCost.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
              <Input
                id="warrantyExpiry"
                type="date"
                {...register("warrantyExpiry")}
                data-testid="input-warranty-expiry"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <ComboSelect
                value={watch("location") || ""}
                onValueChange={(value) => setValue("location", value)}
                type="location"
                placeholder="Select location"
                label="Location"
                dataTestId="select-location"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="assignedUserName">Assigned User</Label>
              <Input
                id="assignedUserName"
                {...register("assignedUserName")}
                placeholder="e.g., John Smith"
                data-testid="input-assigned-user"
              />
            </div>

            {/* Software-specific fields - only show when type is 'Software' */}
            {watch("type") === "Software" && (
              <>
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Software Details</h3>
                </div>
                
                <div>
                  <Label htmlFor="softwareName">Software Name *</Label>
                  <Input
                    id="softwareName"
                    {...register("softwareName")}
                    placeholder="e.g., Microsoft Office 365"
                    data-testid="input-software-name"
                  />
                  {errors.softwareName && (
                    <p className="text-red-500 text-sm mt-1">{errors.softwareName.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="version">Version *</Label>
                  <Input
                    id="version"
                    {...register("version")}
                    placeholder="e.g., 2021, v1.5.3"
                    data-testid="input-version"
                  />
                  {errors.version && (
                    <p className="text-red-500 text-sm mt-1">{errors.version.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="licenseType">License Type *</Label>
                  <Select 
                    value={watch("licenseType") || ""} 
                    onValueChange={(value) => setValue("licenseType", value)}
                  >
                    <SelectTrigger data-testid="select-license-type">
                      <SelectValue placeholder="Select license type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="perpetual">Perpetual</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="volume">Volume</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.licenseType && (
                    <p className="text-red-500 text-sm mt-1">{errors.licenseType.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="licenseKey">License Key *</Label>
                  <Input
                    id="licenseKey"
                    {...register("licenseKey")}
                    placeholder="e.g., ABCD-1234-EFGH-5678"
                    data-testid="input-license-key"
                  />
                  {errors.licenseKey && (
                    <p className="text-red-500 text-sm mt-1">{errors.licenseKey.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="usedLicenses">Used Licenses *</Label>
                  <Input
                    id="usedLicenses"
                    type="number"
                    min="0"
                    {...register("usedLicenses", { 
                      setValueAs: v => v === '' || v == null || Number.isNaN(+v) ? undefined : +v 
                    })}
                    placeholder="0"
                    data-testid="input-used-licenses"
                  />
                  {errors.usedLicenses && (
                    <p className="text-red-500 text-sm mt-1">{errors.usedLicenses.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="renewalDate">Renewal Date *</Label>
                  <Input
                    id="renewalDate"
                    type="date"
                    {...register("renewalDate")}
                    data-testid="input-renewal-date"
                  />
                  {errors.renewalDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.renewalDate.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Vendor Information Section */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Vendor Information</h3>
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <ComboSelect
                value={watch("vendorName") || ""}
                onValueChange={(value) => setValue("vendorName", value)}
                type="vendor"
                placeholder="Select vendor"
                label="Vendor"
                dataTestId="select-vendor-name"
              />
            </div>
            
            <div>
              <Label htmlFor="vendorEmail">Vendor Email</Label>
              <Input
                id="vendorEmail"
                type="email"
                {...register("vendorEmail")}
                placeholder="e.g., business@vendor.com"
                data-testid="input-vendor-email"
              />
              {errors.vendorEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.vendorEmail.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="vendorPhone">Vendor Phone</Label>
              <Input
                id="vendorPhone"
                type="tel"
                {...register("vendorPhone")}
                placeholder="e.g., +1-800-123-4567"
                data-testid="input-vendor-phone"
              />
              {errors.vendorPhone && (
                <p className="text-red-500 text-sm mt-1">{errors.vendorPhone.message}</p>
              )}
            </div>

            {/* Company Information Section */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Company Information</h3>
            </div>
            
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <ComboSelect
                value={watch("companyName") || ""}
                onValueChange={(value) => setValue("companyName", value)}
                type="company"
                placeholder="Select company"
                label="Company"
                dataTestId="select-company-name"
              />
            </div>
            
            <div>
              <Label htmlFor="companyGstNumber">GST Number</Label>
              <Input
                id="companyGstNumber"
                {...register("companyGstNumber")}
                placeholder="e.g., 29AABCA1234D1Z5"
                maxLength={15}
                data-testid="input-company-gst"
              />
              {errors.companyGstNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.companyGstNumber.message}</p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Additional notes about this asset..."
                className="h-24"
                data-testid="textarea-notes"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              onClick={(e) => {
                console.log("Submit button clicked!");
                console.log("Button type:", e.currentTarget.type);
                console.log("Form errors before submit:", errors);
                // Don't prevent default - let form submission proceed
              }}
              data-testid="button-submit-asset"
            >
              {isLoading ? "Saving..." : asset ? "Update Asset" : "Create Asset"}
            </Button>
          </div>
        </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
