import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import type { Ticket } from "@shared/schema";

const editTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.enum(["hardware", "software", "network", "access", "other"]),
});

type EditTicketFormData = z.infer<typeof editTicketSchema>;

interface TicketEditDialogProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketEditDialog({ ticket, open, onOpenChange }: TicketEditDialogProps) {
  const { toast } = useToast();

  const form = useForm<EditTicketFormData>({
    resolver: zodResolver(editTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      category: "other",
    },
  });

  // Reset form when ticket changes
  useEffect(() => {
    if (ticket) {
      form.reset({
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority as "low" | "medium" | "high" | "urgent",
        category: ticket.category as "hardware" | "software" | "network" | "access" | "other",
      });
    }
  }, [ticket, form]);

  const updateTicketMutation = useMutation({
    mutationFn: async (data: EditTicketFormData) => {
      if (!ticket) return;
      const response = await authenticatedRequest("PUT", `/api/tickets/${ticket.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Ticket updated",
        description: "The ticket has been successfully updated.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditTicketFormData) => {
    updateTicketMutation.mutate(data);
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Ticket #{ticket.ticketNumber}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brief summary of the issue" />
                  </FormControl>
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
                      {...field}
                      placeholder="Detailed description of the issue"
                      className="min-h-[150px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hardware">Hardware</SelectItem>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="network">Network</SelectItem>
                        <SelectItem value="access">Access</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateTicketMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTicketMutation.isPending}>
                {updateTicketMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Ticket"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
