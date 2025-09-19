import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { TicketList } from "@/components/tickets/ticket-list";
import { TicketForm } from "@/components/tickets/ticket-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Users, Wrench, Settings2 } from "lucide-react";

export default function Tickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const getPageContent = () => {
    switch (user?.role) {
      case "employee":
        return {
          title: "My Support Tickets",
          description: "View your support requests and create new tickets",
          icon: <Users className="h-5 w-5" />,
          canCreate: true,
          filterByRole: "employee"
        };
      case "technician":
        return {
          title: "Assigned Tickets",
          description: "Manage tickets assigned to you and update their status",
          icon: <Wrench className="h-5 w-5" />,
          canCreate: false,
          filterByRole: "technician"
        };
      case "manager":
        return {
          title: "Team Tickets",
          description: "Overview of all tickets and team management",
          icon: <Settings2 className="h-5 w-5" />,
          canCreate: true,
          filterByRole: "manager"
        };
      case "admin":
        return {
          title: "All Tickets",
          description: "Complete ticket management and system administration",
          icon: <Settings2 className="h-5 w-5" />,
          canCreate: true,
          filterByRole: "admin"
        };
      default:
        return {
          title: "Support Tickets",
          description: "Ticket management system",
          icon: <Users className="h-5 w-5" />,
          canCreate: false,
          filterByRole: "employee"
        };
    }
  };

  const pageContent = getPageContent();

  const handleCreateTicket = () => {
    setIsCreateDialogOpen(true);
  };

  const handleTicketCreated = (ticket: any) => {
    setIsCreateDialogOpen(false);
    toast({
      title: "Ticket created",
      description: `Ticket #${ticket.id} has been created successfully.`,
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <TopBar
          title={pageContent.title}
          description={pageContent.description}
          onAddClick={pageContent.canCreate ? handleCreateTicket : undefined}
        />
        
        <div className="p-6">
          <TicketList />
        </div>
      </main>
      
      {pageContent.canCreate && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Ticket
              </DialogTitle>
            </DialogHeader>
            <TicketForm
              onSuccess={handleTicketCreated}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}