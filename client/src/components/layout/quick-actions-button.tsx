import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Package, 
  Users, 
  Building2,
  Laptop
} from "lucide-react";

export function QuickActionsButton() {
  const [, setLocation] = useLocation();

  const handleNavigateToAddAsset = () => {
    setLocation("/assets?action=add");
  };

  const handleNavigateToAddUser = () => {
    setLocation("/team?action=add");
  };

  const handleNavigateToAddVendor = () => {
    // Navigate to assets page with vendor add action, since vendors are typically managed through assets
    setLocation("/assets?action=add&focus=vendor");
  };

  return (
    <div className="fixed top-16 right-8 z-40" data-testid="quick-actions-container">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="sm"
            className="rounded-full w-10 h-10 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0"
            data-testid="button-quick-actions"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48" data-testid="menu-quick-actions">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            Quick Actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleNavigateToAddAsset}
            className="flex items-center gap-3 cursor-pointer"
            data-testid="menu-item-add-asset"
          >
            <Package className="h-4 w-4 text-blue-500" />
            <div className="flex flex-col">
              <span className="font-medium">Add Asset</span>
              <span className="text-xs text-muted-foreground">Hardware or Software</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleNavigateToAddUser}
            className="flex items-center gap-3 cursor-pointer"
            data-testid="menu-item-add-user"
          >
            <Users className="h-4 w-4 text-purple-500" />
            <div className="flex flex-col">
              <span className="font-medium">Add User</span>
              <span className="text-xs text-muted-foreground">Team Member</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleNavigateToAddVendor}
            className="flex items-center gap-3 cursor-pointer"
            data-testid="menu-item-add-vendor"
          >
            <Building2 className="h-4 w-4 text-orange-500" />
            <div className="flex flex-col">
              <span className="font-medium">Add Vendor</span>
              <span className="text-xs text-muted-foreground">Supplier Information</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}