import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, User, MessageSquare, AlertCircle } from "lucide-react";
import { TicketStatusBadge } from "./ticket-status-badge";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import type { Ticket } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  className?: string;
}

export function TicketCard({ ticket, onClick, className }: TicketCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "hardware":
        return "🖥️";
      case "software":
        return "💻";
      case "network":
        return "🌐";
      case "access":
        return "🔐";
      case "general":
      default:
        return "📋";
    }
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={onClick}
      data-testid={`card-ticket-${ticket.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getCategoryIcon(ticket.category)}</span>
            <div>
              <h3 
                className="font-semibold text-base line-clamp-1"
                data-testid={`text-ticket-title-${ticket.id}`}
              >
                {ticket.title}
              </h3>
              <p 
                className="text-xs text-muted-foreground"
                data-testid={`text-ticket-number-${ticket.id}`}
              >
                #{ticket.ticketNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TicketPriorityBadge priority={ticket.priority as any} />
            <TicketStatusBadge status={ticket.status as any} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p 
          className="text-sm text-muted-foreground line-clamp-2 mb-3"
          data-testid={`text-ticket-description-${ticket.id}`}
        >
          {ticket.description}
        </p>

        {ticket.assetName && (
          <div className="flex items-center text-xs text-muted-foreground mb-2">
            <AlertCircle className="h-3 w-3 mr-1" />
            <span data-testid={`text-ticket-asset-${ticket.id}`}>
              Related to: {ticket.assetName}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <User className="h-3 w-3 mr-1" />
              <span data-testid={`text-ticket-requestor-${ticket.id}`}>
                {ticket.requestorName}
              </span>
            </div>
            {ticket.assignedToName && (
              <div className="flex items-center">
                <Avatar className="h-4 w-4 mr-1">
                  <AvatarFallback className="text-xs">
                    {getInitials(ticket.assignedToName)}
                  </AvatarFallback>
                </Avatar>
                <span data-testid={`text-ticket-assignee-${ticket.id}`}>
                  {ticket.assignedToName}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span data-testid={`text-ticket-created-${ticket.id}`}>
              {formatDistanceToNow(new Date(ticket.createdAt || new Date()), { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full">
          <Badge 
            variant="outline" 
            className="text-xs"
            data-testid={`badge-category-${ticket.id}`}
          >
            {ticket.category}
          </Badge>
          <div className="flex items-center text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3 mr-1" />
            <span data-testid={`text-ticket-comments-${ticket.id}`}>
              {/* TODO: Add comment count when implementing comments */}
              Comments
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}