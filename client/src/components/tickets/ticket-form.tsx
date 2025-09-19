import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { authenticatedRequest } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { insertTicketSchema, type InsertTicket, type Asset } from "@shared/schema";
import { z } from "zod";

const ticketFormSchema = insertTicketSchema.pick({
  title: true,
  description: true,
  category: true,
  priority: true,
  assetId: true,
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

interface TicketFormProps {
  onSuccess?: (ticket: any) => void;
  onCancel?: () => void;
  defaultValues?: Partial<TicketFormData>;
}

interface AssetSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  dataTestId: string;
}

function AssetSelect({ value, onValueChange, placeholder, dataTestId }: AssetSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });

  const selectedAsset = assets.find(asset => asset.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid={dataTestId}
        >
          {selectedAsset ? `${selectedAsset.name} (${selectedAsset.serialNumber})` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search assets..." />
          <CommandList>
            <CommandEmpty>No assets found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value=""
                onSelect={() => {
                  onValueChange("");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                No asset selected
              </CommandItem>
              {assets.map((asset) => (
                <CommandItem
                  key={asset.id}
                  value={asset.id}
                  onSelect={() => {
                    onValueChange(asset.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === asset.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{asset.name}</span>
                    <span className="text-xs text-muted-foreground">{asset.serialNumber}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function TicketForm({ onSuccess, onCancel, defaultValues }: TicketFormProps) {
  const { toast } = useToast();

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "general",
      priority: "medium",
      assetId: "",
      ...defaultValues,
    },
  });

  const createTicketMutation = useMutation<any, Error, TicketFormData>({
    mutationFn: async (data: TicketFormData) => {
      // Remove assetId if empty and add assetName for the backend
      const ticketData: any = { ...data };
      if (!ticketData.assetId) {
        delete ticketData.assetId;
        delete ticketData.assetName;
      } else {
        // Find the selected asset to get its name
        const assets = queryClient.getQueryData<Asset[]>(['/api/assets']) || [];
        const selectedAsset = assets.find((asset: Asset) => asset.id === ticketData.assetId);
        if (selectedAsset) {
          ticketData.assetName = selectedAsset.name;
        }
      }

      const response = await authenticatedRequest("POST", "/api/tickets", ticketData);
      return response.json();
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      form.reset();
      toast({
        title: "Ticket created",
        description: "Your support ticket has been created successfully.",
      });
      onSuccess?.(ticket);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TicketFormData) => {
    createTicketMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Brief description of the issue" 
                  {...field} 
                  data-testid="input-ticket-title"
                />
              </FormControl>
              <FormDescription>
                Provide a clear, concise title for your support request.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Detailed description of the issue, steps to reproduce, and any error messages"
                  className="min-h-[120px]"
                  {...field} 
                  data-testid="textarea-ticket-description"
                />
              </FormControl>
              <FormDescription>
                Provide as much detail as possible to help us resolve your issue quickly.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-ticket-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="access">Access & Permissions</SelectItem>
                    <SelectItem value="general">General Support</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the category that best describes your issue.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-ticket-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low - Minor issue, no impact on work</SelectItem>
                    <SelectItem value="medium">Medium - Some impact, workaround available</SelectItem>
                    <SelectItem value="high">High - Significant impact, urgent attention needed</SelectItem>
                    <SelectItem value="urgent">Urgent - Critical issue, work completely blocked</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the urgency level of your request.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="assetId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Related Asset (Optional)</FormLabel>
              <FormControl>
                <AssetSelect
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  placeholder="Select an asset if this issue is related to specific equipment"
                  dataTestId="select-ticket-asset"
                />
              </FormControl>
              <FormDescription>
                If this issue is related to a specific piece of equipment, select it here.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              data-testid="button-ticket-cancel"
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createTicketMutation.isPending}
            data-testid="button-ticket-submit"
          >
            {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
          </Button>
        </div>
      </form>
    </Form>
  );
}