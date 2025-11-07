import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { FloatingAIAssistant } from "@/components/ai/floating-ai-assistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CalendarDays, Building2, Mail, Phone, Plus, Search, Edit, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
  contractStartDate: z.date().optional(),
  contractEndDate: z.date().optional(),
  contractValue: z.string().optional(),
  contractType: z.string().optional(),
  notes: z.string().optional(),
});

type VendorData = z.infer<typeof vendorSchema>;

interface Vendor {
  id: string;
  value: string;
  description?: string;
  metadata?: {
    email?: string;
    phone?: string;
    contactPerson?: string;
    address?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    contractValue?: string;
    contractType?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function AddVendorForm({ onSuccess, editingVendor }: { onSuccess: () => void; editingVendor?: Vendor }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const form = useForm<VendorData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: editingVendor ? {
      name: editingVendor.value,
      email: editingVendor.metadata?.email || "",
      phone: editingVendor.metadata?.phone || "",
      contactPerson: editingVendor.metadata?.contactPerson || "",
      address: editingVendor.metadata?.address || "",
      contractStartDate: editingVendor.metadata?.contractStartDate ? new Date(editingVendor.metadata.contractStartDate) : undefined,
      contractEndDate: editingVendor.metadata?.contractEndDate ? new Date(editingVendor.metadata.contractEndDate) : undefined,
      contractValue: editingVendor.metadata?.contractValue || "",
      contractType: editingVendor.metadata?.contractType || "",
      notes: editingVendor.description || "",
    } : {
      name: "",
      email: "",
      phone: "",
      contactPerson: "",
      address: "",
      contractValue: "",
      contractType: "",
      notes: "",
    },
  });

  const createVendor = useMutation({
    mutationFn: async (data: VendorData) => {
      const payload = {
        type: "vendor",
        value: data.name,
        description: data.notes,
        metadata: {
          email: data.email,
          phone: data.phone,
          contactPerson: data.contactPerson,
          address: data.address,
          contractStartDate: data.contractStartDate?.toISOString(),
          contractEndDate: data.contractEndDate?.toISOString(),
          contractValue: data.contractValue,
          contractType: data.contractType,
        },
      };
      
      if (editingVendor) {
        return apiRequest("PUT", `/api/master-data/${editingVendor.id}`, payload);
      } else {
        return apiRequest("POST", "/api/master-data", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data"] });
      toast({
        title: editingVendor ? "Vendor updated!" : "Vendor created!",
        description: editingVendor 
          ? "The vendor information has been updated successfully."
          : "A new vendor has been added to your database.",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Vendor creation/update error:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingVendor ? 'update' : 'create'} vendor. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VendorData) => {
    createVendor.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter vendor name" {...field} data-testid="input-vendor-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <Input placeholder="Enter contact person name" {...field} data-testid="input-contact-person" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input placeholder="vendor@example.com" type="email" {...field} data-testid="input-vendor-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-vendor-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter vendor address" {...field} data-testid="input-vendor-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contractStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="input-contract-start-date"
                      >
                        {field.value ? format(field.value, "PPP") : "Select start date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contractEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="input-contract-end-date"
                      >
                        {field.value ? format(field.value, "PPP") : "Select end date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contractValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Value</FormLabel>
                <FormControl>
                  <Input placeholder="$10,000" {...field} data-testid="input-contract-value" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contractType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Type</FormLabel>
                <FormControl>
                  <Input placeholder="Annual, Monthly, One-time" {...field} data-testid="input-contract-type" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes about the vendor" {...field} data-testid="input-vendor-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setLocation("/vendors")}
            data-testid="button-cancel-vendor"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createVendor.isPending}
            data-testid="button-save-vendor"
          >
            {createVendor.isPending ? "Saving..." : editingVendor ? "Update Vendor" : "Create Vendor"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Vendors() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const { toast } = useToast();

  const isNewVendor = window.location.pathname === "/vendors/new";

  useEffect(() => {
    if (isNewVendor) {
      setShowAddForm(true);
    }
  }, [isNewVendor]);

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["/api/master-data", { type: "vendor" }],
    queryFn: () => fetch("/api/master-data?type=vendor").then(res => res.json()),
  });

  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/master-data/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data"] });
      toast({
        title: "Vendor deleted!",
        description: "The vendor has been removed from your database.",
      });
    },
    onError: (error: any) => {
      console.error("Vendor deletion error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredVendors = vendors?.filter((vendor: Vendor) =>
    vendor.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.metadata?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.metadata?.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const contractExpiringVendors = filteredVendors.filter((vendor: Vendor) => {
    if (!vendor.metadata?.contractEndDate) return false;
    const endDate = new Date(vendor.metadata.contractEndDate);
    const now = new Date();
    const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return endDate <= threeMonthsFromNow && endDate >= now;
  });

  const displayVendors = searchParams?.includes("filter=contract-expiring") 
    ? contractExpiringVendors 
    : filteredVendors;

  const handleAddVendor = () => {
    setEditingVendor(null);
    setShowAddForm(true);
    if (!isNewVendor) {
      setLocation("/vendors/new");
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingVendor(null);
    if (isNewVendor) {
      setLocation("/vendors");
    }
  };

  const getContractStatus = (vendor: Vendor) => {
    if (!vendor.metadata?.contractEndDate) return null;
    
    const endDate = new Date(vendor.metadata.contractEndDate);
    const now = new Date();
    
    if (endDate < now) {
      return { status: "expired", label: "Expired", variant: "destructive" as const };
    } else if (endDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      return { status: "expiring-soon", label: "Expiring Soon", variant: "destructive" as const };
    } else if (endDate <= new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
      return { status: "expiring", label: "Expiring", variant: "secondary" as const };
    } else {
      return { status: "active", label: "Active", variant: "default" as const };
    }
  };

  if (showAddForm) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        
        <main className="flex-1 md:ml-64 overflow-auto">
          <TopBar 
            title={editingVendor ? "Edit Vendor" : "Add New Vendor"}
            description={editingVendor 
              ? "Update vendor information and contract details"
              : "Add a new vendor to your system with contract information"
            }
            showAddButton={false}
          />
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardContent className="pt-6">
                    <AddVendorForm onSuccess={handleCloseForm} editingVendor={editingVendor || undefined} />
                  </CardContent>
                </Card>
              </div>
            </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background page-enter">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 overflow-auto">
        <TopBar 
          title={searchParams?.includes("filter=contract-expiring") ? "Contract Renewals" : "Vendors Management"}
          description={searchParams?.includes("filter=contract-expiring") 
            ? "Vendors with contracts expiring within 3 months" 
            : "Manage your vendor relationships and contracts"
          }
          showAddButton={true}
          addButtonText="Add Vendor"
          onAddClick={handleAddVendor}
        />
          <div className="p-6">
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-vendors"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Loading vendors...</div>
              </div>
            ) : displayVendors.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No vendors found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? "No vendors match your search criteria" 
                      : searchParams?.includes("filter=contract-expiring")
                      ? "No vendors have contracts expiring soon"
                      : "Get started by adding your first vendor"
                    }
                  </p>
                  {!searchTerm && !searchParams?.includes("filter=contract-expiring") && (
                    <Button onClick={handleAddVendor} data-testid="button-add-first-vendor">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Vendor
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayVendors.map((vendor: Vendor) => {
                  const contractStatus = getContractStatus(vendor);
                  
                  return (
                    <Card key={vendor.id} data-testid={`card-vendor-${vendor.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                              {vendor.value}
                            </CardTitle>
                            {vendor.metadata?.contactPerson && (
                              <CardDescription>Contact: {vendor.metadata.contactPerson}</CardDescription>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVendor(vendor)}
                              data-testid={`button-edit-vendor-${vendor.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-delete-vendor-${vendor.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{vendor.value}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteVendor.mutate(vendor.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {vendor.metadata?.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            {vendor.metadata.email}
                          </div>
                        )}
                        
                        {vendor.metadata?.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            {vendor.metadata.phone}
                          </div>
                        )}

                        {vendor.metadata?.contractEndDate && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarDays className="w-4 h-4" />
                              Contract expires {format(new Date(vendor.metadata.contractEndDate), "MMM d, yyyy")}
                            </div>
                            {contractStatus && (
                              <Badge variant={contractStatus.variant} className="text-xs">
                                {contractStatus.label}
                              </Badge>
                            )}
                          </div>
                        )}

                        {vendor.metadata?.contractValue && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Value:</span> {vendor.metadata.contractValue}
                          </div>
                        )}

                        {vendor.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {vendor.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
      </main>
      
      {/* Global Floating AI Assistant */}
      <FloatingAIAssistant />
    </div>
  );
}