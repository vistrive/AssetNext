import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Upload } from "lucide-react";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { RoleNotifications } from "@/components/notifications/role-notifications";

interface TopBarProps {
  title: string;
  description: string;
  onAddClick?: () => void;
  showAddButton?: boolean;
  addButtonText?: string;
  onBulkUploadClick?: () => void;
}

export function TopBar({ 
  title, 
  description, 
  onAddClick, 
  showAddButton = true,
  addButtonText = "Add Asset",
  onBulkUploadClick
}: TopBarProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Side: Title and Description */}
        <div className="flex items-center space-x-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
        
        {/* Right Side: Global Search and Action Buttons */}
        <div className="flex items-center space-x-4">
          <div className="w-80">
            <GlobalSearch 
              placeholder="Search assets, users, vendors..." 
              className="w-full"
            />
          </div>
          <div className="flex items-center space-x-3">
            <RoleNotifications />
            {onBulkUploadClick && (
              <Button 
                variant="outline" 
                onClick={onBulkUploadClick} 
                data-testid="button-bulk-upload"
                size="sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
            )}
            {showAddButton && onAddClick && (
              <Button onClick={onAddClick} data-testid="button-add-asset" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {addButtonText}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
