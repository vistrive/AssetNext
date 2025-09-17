import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { insertAssetSchema } from "@shared/schema";
import type { Asset, InsertAsset } from "@shared/schema";
import { z } from "zod";

const assetFormSchema = insertAssetSchema.extend({
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  vendorEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  vendorPhone: z.string().regex(/^[\+]?[\d\s\-\(\)]+$/, "Please enter a valid phone number").optional().or(z.literal("")),
  companyGstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Please enter a valid 15-character GST number").optional().or(z.literal("")),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InsertAsset) => void;
  asset?: Asset;
  isLoading?: boolean;
}

export function AssetForm({ isOpen, onClose, onSubmit, asset, isLoading }: AssetFormProps) {
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
      purchaseCost: asset.purchaseCost || "",
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : "",
      notes: asset.notes || "",
      vendorName: asset.vendorName || "",
      vendorEmail: asset.vendorEmail || "",
      vendorPhone: asset.vendorPhone || "",
      companyName: asset.companyName || "",
      companyGstNumber: asset.companyGstNumber || "",
    } : {},
  });

  const handleFormSubmit = (data: AssetFormData) => {
    const submitData: InsertAsset = {
      ...data,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      tenantId: "", // Will be set by the API
    };
    onSubmit(submitData);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="peripheral">Peripheral</SelectItem>
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
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                {...register("model")}
                placeholder="e.g., MacBook Pro"
                data-testid="input-model"
              />
            </div>
            
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                {...register("manufacturer")}
                placeholder="e.g., Apple"
                data-testid="input-manufacturer"
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
                {...register("purchaseCost")}
                placeholder="0.00"
                data-testid="input-purchase-cost"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register("location")}
                placeholder="e.g., Office Floor 2, Desk 45"
                data-testid="input-location"
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

            {/* Vendor Information Section */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Vendor Information</h3>
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <Input
                id="vendorName"
                {...register("vendorName")}
                placeholder="e.g., Apple Inc."
                data-testid="input-vendor-name"
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
              <Input
                id="companyName"
                {...register("companyName")}
                placeholder="e.g., Apple Inc."
                data-testid="input-company-name"
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
              data-testid="button-submit-asset"
            >
              {isLoading ? "Saving..." : asset ? "Update Asset" : "Create Asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
