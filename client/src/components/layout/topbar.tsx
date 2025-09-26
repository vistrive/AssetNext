import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Upload, Move, RotateCcw } from "lucide-react";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { RoleNotifications } from "@/components/notifications/role-notifications";

interface TopBarProps {
  title: string;
  description: string;
  onAddClick?: () => void;
  showAddButton?: boolean;
  addButtonText?: string;
  onBulkUploadClick?: () => void;
  showDragToggle?: boolean;
  isDragMode?: boolean;
  onToggleDragMode?: () => void;
  onResetAll?: () => void;
}

export function TopBar({ 
  title, 
  description, 
  onAddClick, 
  showAddButton = true,
  addButtonText = "Add Asset",
  onBulkUploadClick,
  showDragToggle = false,
  isDragMode = false,
  onToggleDragMode,
  onResetAll
}: TopBarProps) {
  return (
    <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
        {/* Left Side: Title and Description */}
        <div className="flex items-center space-x-6 min-w-0 flex-1">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">{title}</h2>
            <p className="text-muted-foreground text-xs sm:text-sm truncate">{description}</p>
          </div>
        </div>
        
        {/* Right Side: Global Search and Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="w-full sm:w-64 lg:w-80">
            <GlobalSearch 
              placeholder="Search assets, users, vendors..." 
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <RoleNotifications />
            {onBulkUploadClick && (
              <Button 
                variant="outline" 
                onClick={onBulkUploadClick} 
                data-testid="button-bulk-upload"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Upload className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Bulk Upload</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            )}
            {showAddButton && onAddClick && (
              <Button 
                onClick={onAddClick} 
                data-testid="button-add-asset" 
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{addButtonText}</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Drag Toggle and Reset - positioned in top right edge below main header */}
      {showDragToggle && onToggleDragMode && (
        <div className="flex justify-end pt-2 gap-2">
          {/* Reset All Button - always takes up space to maintain consistent drag toggle position */}
          <Button
            variant="outline"
            size="sm"
            onClick={onResetAll}
            data-testid="reset-all-tiles"
            className={`text-xs h-6 px-3 text-muted-foreground hover:text-foreground ${
              isDragMode && onResetAll ? 'visible' : 'invisible'
            }`}
            title="Reset all dashboard tiles to default positions"
            disabled={!isDragMode || !onResetAll}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset All
          </Button>
          <Button
            variant={isDragMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleDragMode}
            data-testid="toggle-drag-mode"
            className="text-xs h-6 px-3"
          >
            <Move className="h-3 w-3 mr-1" />
            Drag
          </Button>
        </div>
      )}
    </header>
  );
}
