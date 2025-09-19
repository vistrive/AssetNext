import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus } from "lucide-react";
import { TicketCard } from "./ticket-card";
import { useAuth } from "@/hooks/use-auth";
import { authenticatedRequest } from "@/lib/auth";
import type { Ticket } from "@shared/schema";

interface TicketListProps {
  onTicketClick?: (ticket: Ticket) => void;
  onCreateTicket?: () => void;
  showCreateButton?: boolean;
  title?: string;
}

export function TicketList({ 
  onTicketClick, 
  onCreateTicket, 
  showCreateButton = true,
  title = "Support Tickets" 
}: TicketListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Build role-specific query parameters
  const getQueryParams = () => {
    const params = new URLSearchParams();
    
    switch (user?.role) {
      case "employee":
        params.set("requestorOnly", "true");
        break;
      case "technician":
        params.set("assignedOnly", "true");
        break;
      case "manager":
      case "admin":
        // No additional filters - see all tickets in tenant
        break;
    }
    
    return params.toString();
  };

  const queryParams = getQueryParams();
  const apiUrl = queryParams ? `/api/tickets?${queryParams}` : '/api/tickets';

  const { data: tickets = [], isLoading, error } = useQuery<Ticket[]>({
    queryKey: [apiUrl],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", apiUrl);
      return response.json();
    },
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Filter tickets based on search and filter criteria
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchTerm === "" || 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.requestorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Failed to load tickets. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-ticket-list-title">
            {title}
          </h2>
          <p className="text-muted-foreground">
            {filteredTickets.length} of {tickets.length} tickets
          </p>
        </div>
        {showCreateButton && onCreateTicket && (
          <Button onClick={onCreateTicket} data-testid="button-create-ticket">
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets by title, description, number, or requestor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-tickets"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-filter-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="hardware">Hardware</SelectItem>
              <SelectItem value="software">Software</SelectItem>
              <SelectItem value="network">Network</SelectItem>
              <SelectItem value="access">Access</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-filter-priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setCategoryFilter("all");
                setPriorityFilter("all");
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search or filters."
                : "No support tickets have been created yet."}
            </p>
            {showCreateButton && onCreateTicket && (
              <Button onClick={onCreateTicket} data-testid="button-create-first-ticket">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Ticket
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => onTicketClick?.(ticket)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}