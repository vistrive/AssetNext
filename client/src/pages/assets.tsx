import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@/hooks/use-search";
import { useLocation, Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { AssetForm } from "@/components/assets/asset-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Laptop, Monitor, Code, Edit, Eye, Trash2, Search, Upload, Download, FileText, AlertCircle, CheckCircle, XCircle, ArrowUpDown, ArrowUp, ArrowDown, Settings, Calendar, DollarSign, Package, MapPin, User, Hash, Building, Wrench, Mail, BadgeCheck } from "lucide-react";
import type { Asset, InsertAsset } from "@shared/schema";
import { AssetTypeEnum } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

// Column visibility state
interface ColumnVisibility {
  name: boolean;
  serialNumber: boolean;
  model: boolean;
  manufacturer: boolean;
  category: boolean;
  type: boolean;
  status: boolean;
  location: boolean;
  assignedUserName: boolean;
  assignedUserEmail: boolean;
  assignedUserEmployeeId: boolean;
  purchaseDate: boolean;
  warrantyExpiry: boolean;
  purchaseCost: boolean;
  actions: boolean;
}

// Enhanced Assets Table Component
interface EnhancedAssetsTableProps {
  assets: Asset[];
  isLoading: boolean;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (id: string) => void;
}

function EnhancedAssetsTable({ assets, isLoading, onEditAsset, onDeleteAsset }: EnhancedAssetsTableProps) {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Function to navigate to user profile by email or employee ID
  const navigateToUserProfile = async (email?: string, employeeId?: string) => {
    try {
      let queryParam = '';
      if (email) {
        queryParam = `email=${encodeURIComponent(email)}`;
      } else if (employeeId) {
        queryParam = `employeeId=${encodeURIComponent(employeeId)}`;
      } else {
        return;
      }

      const response = await authenticatedRequest(`/api/users/find?${queryParam}`);
      if (response.ok) {
        const user = await response.json();
        // Navigate to user detail page with the found user ID
        window.location.href = `/users/${user.id}`;
      } else {
        console.error('User not found');
      }
    } catch (error) {
      console.error('Error finding user:', error);
    }
  };
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [dateRanges, setDateRanges] = useState<Record<string, { from?: Date; to?: Date }>>({});
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    name: true,
    serialNumber: true,
    model: true,
    manufacturer: true,
    category: true,
    type: true,
    status: true,
    location: true,
    assignedUserName: true,
    assignedUserEmail: true,
    assignedUserEmployeeId: true,
    purchaseDate: true,
    warrantyExpiry: true,
    purchaseCost: true,
    actions: true,
  });

  // Sort and filter assets
  const processedAssets = useMemo(() => {
    let filtered = [...assets];

    // Apply column-specific searches
    Object.entries(columnSearch).forEach(([field, searchTerm]) => {
      if (searchTerm.trim()) {
        filtered = filtered.filter((asset: any) => {
          const value = asset[field];
          if (value === null || value === undefined) return false;
          
          // Handle numeric filtering for purchase cost
          if (field === 'purchaseCost') {
            const minCost = parseFloat(searchTerm);
            if (!isNaN(minCost)) {
              const assetCost = typeof value === 'string' ? parseFloat(value) : value;
              return !isNaN(assetCost) && assetCost >= minCost;
            }
          }
          
          // Handle string matching for all other fields
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        });
      }
    });

    // Apply date range filters
    Object.entries(dateRanges).forEach(([field, range]) => {
      if (range.from || range.to) {
        filtered = filtered.filter((asset: any) => {
          const assetDate = asset[field] ? new Date(asset[field]) : null;
          if (!assetDate) return false;
          
          if (range.from && assetDate < range.from) return false;
          if (range.to && assetDate > range.to) return false;
          return true;
        });
      }
    });

    // Sort assets
    filtered.sort((a: any, b: any) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      let comparison = 0;
      
      // Handle numeric fields
      if (sortField === 'purchaseCost') {
        const aNum = typeof aValue === 'string' ? parseFloat(aValue) : aValue;
        const bNum = typeof bValue === 'string' ? parseFloat(bValue) : bValue;
        comparison = (isNaN(aNum) ? 0 : aNum) - (isNaN(bNum) ? 0 : bNum);
      }
      // Handle date fields
      else if (sortField === 'purchaseDate' || sortField === 'warrantyExpiry' || sortField === 'createdAt' || sortField === 'updatedAt') {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        comparison = aDate.getTime() - bDate.getTime();
      }
      // Handle other numeric fields like usedLicenses
      else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }
      // Handle dates that are already Date objects
      else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      }
      // Handle strings
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      }
      // Fallback to string comparison
      else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [assets, sortField, sortDirection, columnSearch, dateRanges]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleColumnSearch = (field: string, value: string) => {
    setColumnSearch(prev => ({ ...prev, [field]: value }));
  };

  const handleDateRangeChange = (field: string, from?: Date, to?: Date) => {
    setDateRanges(prev => ({ ...prev, [field]: { from, to } }));
  };

  const getAssetIcon = (type: string, category?: string) => {
    if (type === 'Hardware') {
      switch (category?.toLowerCase()) {
        case 'laptop': return Laptop;
        case 'desktop': case 'pc': return Monitor;
        case 'server': return Building;
        case 'tablet': return Laptop;
        case 'mobile phone': case 'phone': return Laptop;
        default: return Monitor;
      }
    }
    if (type === 'Software') return Code;
    if (type === 'Peripherals') return Wrench;
    return Package;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'deployed': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100';
      case 'in-stock': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100';
      case 'in-repair': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100';
      case 'disposed': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return ArrowUpDown;
    return sortDirection === 'asc' ? ArrowUp : ArrowDown;
  };

  const formatCurrency = (value: string | number | null) => {
    if (!value) return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? 'N/A' : `$${numValue.toLocaleString()}`;
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const visibleColumns = Object.entries(columnVisibility).filter(([_, visible]) => visible).map(([key, _]) => key);
  const columnCount = visibleColumns.length;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading assets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column Visibility Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {processedAssets.length} of {assets.length} assets
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-column-settings">
              <Settings className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-2">
              <h4 className="font-medium">Show/Hide Columns</h4>
              {Object.entries(columnVisibility).map(([key, visible]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`column-${key}`}
                    checked={visible}
                    onCheckedChange={(checked) =>
                      setColumnVisibility(prev => ({ ...prev, [key]: !!checked }))
                    }
                    data-testid={`checkbox-column-${key}`}
                  />
                  <label htmlFor={`column-${key}`} className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Enhanced Assets Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {columnVisibility.name && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[200px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('name')}
                        data-testid="sort-name"
                      >
                        <User className="h-4 w-4 mr-1" />
                        Asset Name
                        {React.createElement(getSortIcon('name'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Input
                      placeholder="Search names..."
                      value={columnSearch.name || ''}
                      onChange={(e) => handleColumnSearch('name', e.target.value)}
                      className="mt-1 h-7 text-xs"
                      data-testid="search-name"
                    />
                  </th>
                )}
                
                {columnVisibility.serialNumber && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[140px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('serialNumber')}
                        data-testid="sort-serialNumber"
                      >
                        <Hash className="h-4 w-4 mr-1" />
                        Serial Number
                        {React.createElement(getSortIcon('serialNumber'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Input
                      placeholder="Search serial..."
                      value={columnSearch.serialNumber || ''}
                      onChange={(e) => handleColumnSearch('serialNumber', e.target.value)}
                      className="mt-1 h-7 text-xs"
                      data-testid="search-serialNumber"
                    />
                  </th>
                )}

                {columnVisibility.model && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[120px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('model')}
                        data-testid="sort-model"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Model
                        {React.createElement(getSortIcon('model'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Input
                      placeholder="Search model..."
                      value={columnSearch.model || ''}
                      onChange={(e) => handleColumnSearch('model', e.target.value)}
                      className="mt-1 h-7 text-xs"
                      data-testid="search-model"
                    />
                  </th>
                )}

                {columnVisibility.manufacturer && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[130px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('manufacturer')}
                        data-testid="sort-manufacturer"
                      >
                        <Building className="h-4 w-4 mr-1" />
                        Manufacturer
                        {React.createElement(getSortIcon('manufacturer'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Input
                      placeholder="Search manufacturer..."
                      value={columnSearch.manufacturer || ''}
                      onChange={(e) => handleColumnSearch('manufacturer', e.target.value)}
                      className="mt-1 h-7 text-xs"
                      data-testid="search-manufacturer"
                    />
                  </th>
                )}

                {columnVisibility.category && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[100px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('category')}
                        data-testid="sort-category"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Category
                        {React.createElement(getSortIcon('category'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Input
                      placeholder="Search category..."
                      value={columnSearch.category || ''}
                      onChange={(e) => handleColumnSearch('category', e.target.value)}
                      className="mt-1 h-7 text-xs"
                      data-testid="search-category"
                    />
                  </th>
                )}

                {columnVisibility.type && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[100px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('type')}
                        data-testid="sort-type"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Type
                        {React.createElement(getSortIcon('type'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Select value={columnSearch.type || 'all'} onValueChange={(value) => handleColumnSearch('type', value === 'all' ? '' : value)}>
                      <SelectTrigger className="mt-1 h-7 text-xs" data-testid="filter-type">
                        <SelectValue placeholder="Filter type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Hardware">Hardware</SelectItem>
                        <SelectItem value="Software">Software</SelectItem>
                        <SelectItem value="Peripherals">Peripherals</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </th>
                )}

                {columnVisibility.status && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[120px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('status')}
                        data-testid="sort-status"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Status
                        {React.createElement(getSortIcon('status'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Select value={columnSearch.status || 'all'} onValueChange={(value) => handleColumnSearch('status', value === 'all' ? '' : value)}>
                      <SelectTrigger className="mt-1 h-7 text-xs" data-testid="filter-status">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="deployed">Deployed</SelectItem>
                        <SelectItem value="in-stock">In Stock</SelectItem>
                        <SelectItem value="in-repair">In Repair</SelectItem>
                        <SelectItem value="disposed">Disposed</SelectItem>
                      </SelectContent>
                    </Select>
                  </th>
                )}

                {columnVisibility.location && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[120px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('location')}
                        data-testid="sort-location"
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        Location
                        {React.createElement(getSortIcon('location'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Input
                      placeholder="Search location..."
                      value={columnSearch.location || ''}
                      onChange={(e) => handleColumnSearch('location', e.target.value)}
                      className="mt-1 h-7 text-xs"
                      data-testid="search-location"
                    />
                  </th>
                )}

                {columnVisibility.assignedUserName && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[120px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('assignedUserName')}
                        data-testid="sort-assignedUserName"
                      >
                        <User className="h-4 w-4 mr-1" />
                        Assigned To
                        {React.createElement(getSortIcon('assignedUserName'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Input
                      placeholder="Search assigned..."
                      value={columnSearch.assignedUserName || ''}
                      onChange={(e) => handleColumnSearch('assignedUserName', e.target.value)}
                      className="mt-1 h-7 text-xs"
                      data-testid="search-assignedUserName"
                    />
                  </th>
                )}

                {columnVisibility.assignedUserEmail && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[180px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('assignedUserEmail')}
                        data-testid="sort-assignedUserEmail"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email ID
                        {React.createElement(getSortIcon('assignedUserEmail'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Input
                      placeholder="Search email..."
                      value={columnSearch.assignedUserEmail || ''}
                      onChange={(e) => handleColumnSearch('assignedUserEmail', e.target.value)}
                      className="mt-1 h-7 text-xs"
                      data-testid="search-assignedUserEmail"
                    />
                  </th>
                )}

                {columnVisibility.assignedUserEmployeeId && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[140px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('assignedUserEmployeeId')}
                        data-testid="sort-assignedUserEmployeeId"
                      >
                        <BadgeCheck className="h-4 w-4 mr-1" />
                        Employee ID
                        {React.createElement(getSortIcon('assignedUserEmployeeId'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Input
                      placeholder="Search ID..."
                      value={columnSearch.assignedUserEmployeeId || ''}
                      onChange={(e) => handleColumnSearch('assignedUserEmployeeId', e.target.value)}
                      className="mt-1 h-7 text-xs"
                      data-testid="search-assignedUserEmployeeId"
                    />
                  </th>
                )}

                {columnVisibility.purchaseDate && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[140px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('purchaseDate')}
                        data-testid="sort-purchaseDate"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Purchase Date
                        {React.createElement(getSortIcon('purchaseDate'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-1 h-7 text-xs justify-start" data-testid="filter-purchaseDate">
                          <Calendar className="h-3 w-3 mr-1" />
                          Date Range
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="range"
                          selected={{
                            from: dateRanges.purchaseDate?.from,
                            to: dateRanges.purchaseDate?.to,
                          }}
                          onSelect={(range) => 
                            handleDateRangeChange('purchaseDate', range?.from, range?.to)
                          }
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </th>
                )}

                {columnVisibility.warrantyExpiry && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[140px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('warrantyExpiry')}
                        data-testid="sort-warrantyExpiry"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Warranty Expiry
                        {React.createElement(getSortIcon('warrantyExpiry'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-1 h-7 text-xs justify-start" data-testid="filter-warrantyExpiry">
                          <Calendar className="h-3 w-3 mr-1" />
                          Date Range
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="range"
                          selected={{
                            from: dateRanges.warrantyExpiry?.from,
                            to: dateRanges.warrantyExpiry?.to,
                          }}
                          onSelect={(range) => 
                            handleDateRangeChange('warrantyExpiry', range?.from, range?.to)
                          }
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </th>
                )}

                {columnVisibility.purchaseCost && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm min-w-[120px]">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => handleSort('purchaseCost')}
                        data-testid="sort-purchaseCost"
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Purchase Cost
                        {React.createElement(getSortIcon('purchaseCost'), { className: "h-3 w-3 ml-1" })}
                      </Button>
                    </div>
                    <Input
                      placeholder="Min cost..."
                      type="number"
                      value={columnSearch.purchaseCost || ''}
                      onChange={(e) => handleColumnSearch('purchaseCost', e.target.value)}
                      className="mt-1 h-7 text-xs"
                      data-testid="search-purchaseCost"
                    />
                  </th>
                )}

                {columnVisibility.actions && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm w-24">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {processedAssets.map((asset: Asset) => {
                const Icon = getAssetIcon(asset.type, asset.category || undefined);
                
                return (
                  <tr 
                    key={asset.id}
                    className="border-b border-border hover:bg-muted/25 transition-colors"
                    data-testid={`asset-row-${asset.id}`}
                  >
                    {columnVisibility.name && (
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon className="text-muted-foreground h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate" title={asset.name}>{asset.name}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    
                    {columnVisibility.serialNumber && (
                      <td className="py-3 px-4">
                        <span className="text-foreground font-mono text-sm" data-testid={`text-serial-${asset.id}`}>
                          {asset.serialNumber || "N/A"}
                        </span>
                      </td>
                    )}

                    {columnVisibility.model && (
                      <td className="py-3 px-4">
                        <span className="text-foreground" data-testid={`text-model-${asset.id}`}>
                          {asset.model || "N/A"}
                        </span>
                      </td>
                    )}

                    {columnVisibility.manufacturer && (
                      <td className="py-3 px-4">
                        <span className="text-foreground" data-testid={`text-manufacturer-${asset.id}`}>
                          {asset.manufacturer || "N/A"}
                        </span>
                      </td>
                    )}

                    {columnVisibility.category && (
                      <td className="py-3 px-4">
                        <span className="text-foreground capitalize" data-testid={`text-category-${asset.id}`}>
                          {asset.category || "N/A"}
                        </span>
                      </td>
                    )}

                    {columnVisibility.type && (
                      <td className="py-3 px-4">
                        <span className="text-foreground" data-testid={`text-type-${asset.id}`}>
                          {asset.type}
                        </span>
                      </td>
                    )}

                    {columnVisibility.status && (
                      <td className="py-3 px-4">
                        <Badge className={`${getStatusBadgeClass(asset.status)} border`} data-testid={`badge-status-${asset.id}`}>
                          {asset.status.replace('-', ' ')}
                        </Badge>
                      </td>
                    )}

                    {columnVisibility.location && (
                      <td className="py-3 px-4">
                        <span className="text-foreground" data-testid={`text-location-${asset.id}`}>
                          {asset.location || "N/A"}
                        </span>
                      </td>
                    )}

                    {columnVisibility.assignedUserName && (
                      <td className="py-3 px-4">
                        {asset.assignedUserName ? (
                          <span 
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer underline" 
                            data-testid={`link-assigned-${asset.id}`}
                            onClick={() => navigateToUserProfile(asset.assignedUserEmail, asset.assignedUserEmployeeId)}
                          >
                            {asset.assignedUserName}
                          </span>
                        ) : (
                          <span className="text-foreground" data-testid={`text-assigned-${asset.id}`}>
                            Unassigned
                          </span>
                        )}
                      </td>
                    )}

                    {columnVisibility.assignedUserEmail && (
                      <td className="py-3 px-4">
                        {asset.assignedUserEmail ? (
                          <span 
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer underline" 
                            data-testid={`link-email-${asset.id}`}
                            onClick={() => navigateToUserProfile(asset.assignedUserEmail, asset.assignedUserEmployeeId)}
                          >
                            {asset.assignedUserEmail}
                          </span>
                        ) : (
                          <span className="text-foreground" data-testid={`text-email-${asset.id}`}>
                            N/A
                          </span>
                        )}
                      </td>
                    )}

                    {columnVisibility.assignedUserEmployeeId && (
                      <td className="py-3 px-4">
                        {asset.assignedUserEmployeeId ? (
                          <span 
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer underline font-mono text-sm" 
                            data-testid={`link-employee-id-${asset.id}`}
                            onClick={() => navigateToUserProfile(asset.assignedUserEmail, asset.assignedUserEmployeeId)}
                          >
                            {asset.assignedUserEmployeeId}
                          </span>
                        ) : (
                          <span className="text-foreground font-mono text-sm" data-testid={`text-employee-id-${asset.id}`}>
                            N/A
                          </span>
                        )}
                      </td>
                    )}

                    {columnVisibility.purchaseDate && (
                      <td className="py-3 px-4">
                        <span className="text-foreground text-sm" data-testid={`text-purchase-date-${asset.id}`}>
                          {formatDate(asset.purchaseDate)}
                        </span>
                      </td>
                    )}

                    {columnVisibility.warrantyExpiry && (
                      <td className="py-3 px-4">
                        <span 
                          className={`text-sm ${
                            asset.warrantyExpiry && new Date(asset.warrantyExpiry) < new Date() 
                              ? 'text-red-600' 
                              : 'text-foreground'
                          }`}
                          data-testid={`text-warranty-${asset.id}`}
                        >
                          {formatDate(asset.warrantyExpiry)}
                        </span>
                      </td>
                    )}

                    {columnVisibility.purchaseCost && (
                      <td className="py-3 px-4">
                        <span className="text-foreground font-medium" data-testid={`text-cost-${asset.id}`}>
                          {formatCurrency(asset.purchaseCost)}
                        </span>
                      </td>
                    )}

                    {columnVisibility.actions && (
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditAsset(asset)}
                            data-testid={`button-edit-${asset.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteAsset(asset.id)}
                            data-testid={`button-delete-${asset.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              
              {processedAssets.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center space-y-2">
                      <Monitor className="h-12 w-12 text-muted-foreground/50" />
                      <p>No assets found</p>
                      <p className="text-sm">
                        Try adjusting your search filters or column filters
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Assets() {
  const search = useSearch();
  const [location] = useLocation();
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detect if we're in "new" mode and auto-open the form
  useEffect(() => {
    if (location === '/assets/new') {
      setIsAssetFormOpen(true);
    }
  }, [location]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();


  // Initialize filters based on URL parameters
  // Main /assets route shows ALL assets, only subsection routes filter by type
  useEffect(() => {
    const urlParams = new URLSearchParams(search);
    const typeParam = urlParams.get('type');
    const categoryParam = urlParams.get('category');
    
    // Only apply type filtering if a valid type parameter is explicitly provided
    // This ensures /assets shows all items, while /assets?type=Hardware filters to hardware
    if (typeParam && AssetTypeEnum.safeParse(typeParam).success) {
      setTypeFilter(typeParam);
    } else {
      // Default to showing all assets (no type filtering)
      setTypeFilter("all");
    }
    
    // Only apply category filtering if a category parameter is explicitly provided
    if (categoryParam && categoryParam.trim()) {
      setCategoryFilter(categoryParam);
    } else {
      // Default to showing all categories
      setCategoryFilter("all");
    }
  }, [search]);

  // Get dynamic page title based on filter
  const getPageTitle = () => {
    const urlParams = new URLSearchParams(search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
      // Create title from category (e.g., "pc" -> "PC Assets")
      const categoryName = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1).replace('-', ' ');
      return `${categoryName} Assets`;
    }
    
    switch (typeFilter) {
      case 'Hardware': return 'Hardware Assets';
      case 'Software': return 'Software Assets'; 
      case 'Peripherals': return 'Peripheral Assets';
      case 'Others': return 'Other Assets';
      default: return 'Assets';
    }
  };

  const getPageDescription = () => {
    const urlParams = new URLSearchParams(search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
      const categoryDescriptions: Record<string, string> = {
        'pc': 'Manage desktop computers and workstations',
        'laptop': 'Manage portable computers and notebooks',
        'server': 'Manage server hardware and infrastructure',
        'rack': 'Manage server racks and data center equipment',
        'mobile': 'Manage mobile phones and cellular devices',
        'tablet': 'Manage tablets and portable touch devices',
        'printer': 'Manage printing devices and equipment',
        '3d-printer': 'Manage 3D printing equipment',
        'scanner': 'Manage scanning devices and equipment',
        'mouse': 'Manage computer mice and pointing devices',
        'router': 'Manage network routing equipment',
        'switch': 'Manage network switching equipment',
        'hub': 'Manage network hub equipment',
        'cctv': 'Manage CCTV cameras and surveillance equipment',
        'access-control': 'Manage access control hardware and systems'
      };
      return categoryDescriptions[categoryParam] || 'Manage specific asset category';
    }
    
    switch (typeFilter) {
      case 'Hardware': return 'Manage hardware assets like laptops, desktops, and servers';
      case 'Software': return 'Manage software licenses and applications';
      case 'Peripherals': return 'Manage peripheral devices like printers and accessories';
      case 'Others': return 'Manage other miscellaneous assets';
      default: return 'Manage your IT assets and equipment';
    }
  };

  // Fetch assets
  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["/api/assets", typeFilter, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      
      const response = await authenticatedRequest("GET", `/api/assets?${params}`);
      return response.json();
    },
  });

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async (assetData: InsertAsset) => {
      console.log("Creating asset with data:", assetData);
      try {
        const response = await authenticatedRequest("POST", "/api/assets", assetData);
        console.log("Create asset response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error("API Error Response:", errorData);
          throw new Error(`API Error ${response.status}: ${errorData}`);
        }
        
        const result = await response.json();
        console.log("Create asset response data:", result);
        return result;
      } catch (error) {
        console.error("Request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Asset creation successful:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsAssetFormOpen(false);
      setEditingAsset(undefined);
      toast({
        title: "Asset created",
        description: "The asset has been created successfully.",
      });
    },
    onError: (error) => {
      console.error("Asset creation failed:", error);
      let errorMessage = "Failed to create asset. Please try again.";
      
      if (error.message.includes("Authentication expired") || error.message.includes("No authentication token")) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (error.message.includes("400")) {
        errorMessage = "Please check all required fields are filled correctly.";
      } else if (error.message.includes("401")) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error.message.includes("422")) {
        errorMessage = "Invalid data provided. Please check your inputs.";
      } else if (error.message.includes("500")) {
        errorMessage = "Server error. Please try again later.";
      }
      
      toast({
        title: "Asset Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // If it's an auth error, close the form to prevent confusion
      if (error.message.includes("401") || error.message.includes("Authentication")) {
        setIsAssetFormOpen(false);
        setEditingAsset(undefined);
      }
    },
  });

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAsset> }) => {
      const response = await authenticatedRequest("PUT", `/api/assets/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsAssetFormOpen(false);
      setEditingAsset(undefined);
      toast({
        title: "Asset updated",
        description: "The asset has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Asset deleted",
        description: "The asset has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddAsset = () => {
    setEditingAsset(undefined);
    setIsAssetFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsAssetFormOpen(true);
  };

  const handleAssetSubmit = (assetData: Omit<InsertAsset, 'tenantId'> | InsertAsset) => {
    console.log("handleAssetSubmit called with:", assetData);
    console.log("editingAsset:", editingAsset);
    if (editingAsset) {
      console.log("Updating existing asset");
      updateAssetMutation.mutate({ id: editingAsset.id, data: assetData as InsertAsset });
    } else {
      console.log("Creating new asset");
      createAssetMutation.mutate(assetData as InsertAsset);
    }
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      deleteAssetMutation.mutate(id);
    }
  };

  // Handle search functionality - triggers immediate search and focuses input
  const handleSearch = () => {
    // If there's a search term, immediately trigger the search by updating debounced term
    if (searchTerm.trim()) {
      setDebouncedSearchTerm(searchTerm.trim());
    }
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Prevent form submission and immediately trigger search
      e.preventDefault();
      handleSearch();
    }
  };

  // Clear search - immediately clear both terms for instant UX
  const handleClearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm(""); // Immediately clear search results
    searchInputRef.current?.focus();
  };

  // Bulk upload functions
  const handleBulkUpload = () => {
    setIsBulkUploadOpen(true);
    setUploadFile(null);
    setUploadResults(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
        return;
      }
      setUploadFile(file);
      setUploadResults(null);
    }
  };

  const validateFile = async () => {
    if (!uploadFile) return;

    setIsValidating(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await authenticatedRequest(
        "POST", 
        "/api/assets/bulk/upload?validateOnly=true", 
        formData
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Validation failed" }));
        throw new Error(errorData.message || "Validation failed");
      }

      const results = await response.json();
      setUploadResults(results);
    } catch (error) {
      toast({
        title: "Validation failed",
        description: error instanceof Error ? error.message : "Failed to validate the CSV file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const importAssets = async (mode: 'partial' | 'atomic' = 'partial') => {
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await authenticatedRequest(
        "POST", 
        `/api/assets/bulk/upload?mode=${mode}`, 
        formData
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Import failed" }));
        throw new Error(errorData.message || "Import failed");
      }

      const results = await response.json();
      
      if (results.summary.inserted > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
        
        toast({
          title: "Import successful",
          description: `Successfully imported ${results.summary.inserted} assets.`,
        });
        
        setIsBulkUploadOpen(false);
        setUploadFile(null);
        setUploadResults(null);
      } else {
        setUploadResults(results);
        toast({
          title: "No assets imported",
          description: results.message || "No valid assets found to import.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await authenticatedRequest("GET", "/api/assets/bulk/template");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Download failed" }));
        throw new Error(errorData.message || "Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'asset_template_with_samples.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getAssetIcon = (type: string, category?: string) => {
    if (type === "software") return Code;
    if (category === "laptop") return Laptop;
    return Monitor;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "deployed":
        return "status-deployed";
      case "in-stock":
        return "status-in-stock";
      case "in-repair":
        return "status-in-repair";
      case "disposed":
        return "status-disposed";
      default:
        return "status-in-stock";
    }
  };

  // Apply client-side search filter across all columns
  const filteredAssets = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return assets;
    }

    const searchTerm = debouncedSearchTerm.toLowerCase();
    return assets.filter((asset: Asset) => {
      // Search across all visible columns in the table
      const searchableFields = [
        asset.name,
        asset.serialNumber,
        asset.manufacturer,
        asset.model,
        asset.type,
        asset.status,
        asset.vendorName,
        asset.vendorEmail,
        asset.vendorPhone,
        asset.companyName,
        asset.companyGstNumber,
        asset.location,
        asset.assignedUserName,
        asset.assignedUserEmail,
        asset.assignedUserEmployeeId,
        asset.purchaseCost?.toString()
      ];

      // Check if any field contains the search term
      return searchableFields.some(field => 
        field && field.toLowerCase().includes(searchTerm)
      );
    });
  }, [assets, debouncedSearchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 overflow-auto">
        <TopBar
          title={getPageTitle()}
          description={getPageDescription()}
          onAddClick={handleAddAsset}
          addButtonText="Add Asset"
          onBulkUploadClick={handleBulkUpload}
        />
        
        <div className="p-6">
          {/* Active Search Indicator */}
          {debouncedSearchTerm && (
            <div className="mb-4">
              <div className="inline-flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                <span>Searching for: "{debouncedSearchTerm}"</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="ml-2 text-primary hover:text-primary/80 focus:outline-none"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                  data-testid="button-search"
                  title="Search assets"
                  aria-label="Search assets"
                >
                  <Search className="h-4 w-4" />
                </button>
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                  data-testid="input-search-assets"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                    data-testid="button-clear-search"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Hardware">Hardware</SelectItem>
                  <SelectItem value="Software">Software</SelectItem>
                  <SelectItem value="Peripherals">Peripherals</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                  <SelectItem value="in-repair">In Repair</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Enhanced Assets Table */}
          <EnhancedAssetsTable
            assets={filteredAssets}
            isLoading={isLoading}
            onEditAsset={handleEditAsset}
            onDeleteAsset={handleDeleteAsset}
          />
        </div>
      </main>
      
      <AssetForm
        isOpen={isAssetFormOpen}
        onClose={() => {
          setIsAssetFormOpen(false);
          setEditingAsset(undefined);
        }}
        onSubmit={handleAssetSubmit}
        asset={editingAsset}
        isLoading={createAssetMutation.isPending || updateAssetMutation.isPending}
      />

      {/* Bulk Upload Modal */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Upload Assets</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="download" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="download">Download Template</TabsTrigger>
              <TabsTrigger value="upload">Upload CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="download" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Step 1: Download Template</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download a comprehensive CSV template with sample data showing all asset types (hardware, software, peripherals) and statuses.
                  </p>
                  
                  <Button 
                    variant="outline" 
                    onClick={downloadTemplate}
                    data-testid="button-download-template"
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Template with Samples
                  </Button>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Step 2: Customize Your Data</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Template includes sample data for:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Hardware:</strong> Laptops, desktops with deployed/in-stock status</li>
                      <li>• <strong>Software:</strong> Applications with subscription/perpetual licenses</li>
                      <li>• <strong>Peripherals:</strong> Printers, accessories with all statuses</li>
                    </ul>
                    
                    <h4 className="font-medium mb-2 mt-4">Key Guidelines:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Replace sample data with your actual asset information</li>
                      <li>• Keep the same column headers (do not modify)</li>
                      <li>• Required fields: <strong>name, type, status</strong></li>
                      <li>• Date format: <strong>YYYY-MM-DD</strong> (e.g., 2024-01-15)</li>
                      <li>• Software assets should include software_name and version</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Step 3: Upload Your CSV</h3>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="bulk-upload-file"
                      data-testid="input-bulk-file"
                    />
                    <label htmlFor="bulk-upload-file" className="cursor-pointer">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">Choose CSV file</p>
                      <p className="text-sm text-muted-foreground">
                        Click to select your completed CSV file (max 5MB, 5000 rows)
                      </p>
                    </label>
                  </div>

                  {uploadFile && (
                    <div className="mt-4">
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertDescription>
                          Selected file: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                        </AlertDescription>
                      </Alert>

                      <div className="flex gap-2 mt-4">
                        <Button 
                          onClick={validateFile} 
                          disabled={isValidating}
                          data-testid="button-validate"
                        >
                          {isValidating ? "Validating..." : "Validate File"}
                        </Button>
                        
                        {uploadResults && uploadResults.summary.valid > 0 && (
                          <>
                            <Button 
                              onClick={() => importAssets('partial')} 
                              disabled={isUploading}
                              data-testid="button-import-partial"
                            >
                              {isUploading ? "Importing..." : "Import Valid Assets"}
                            </Button>
                            
                            {uploadResults.summary.invalid === 0 && (
                              <Button 
                                onClick={() => importAssets('atomic')} 
                                disabled={isUploading}
                                variant="outline"
                                data-testid="button-import-all"
                              >
                                Import All (Atomic)
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {uploadResults && (
                    <div className="mt-6 space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-muted p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold">{uploadResults.summary.total}</div>
                          <div className="text-sm text-muted-foreground">Total Rows</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">{uploadResults.summary.valid}</div>
                          <div className="text-sm text-muted-foreground">Valid</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-600">{uploadResults.summary.invalid}</div>
                          <div className="text-sm text-muted-foreground">Invalid</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600">{uploadResults.summary.inserted || 0}</div>
                          <div className="text-sm text-muted-foreground">Imported</div>
                        </div>
                      </div>

                      {uploadResults.rows && uploadResults.rows.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr>
                                  <th className="text-left py-2 px-3">Row</th>
                                  <th className="text-left py-2 px-3">Status</th>
                                  <th className="text-left py-2 px-3">Issues</th>
                                </tr>
                              </thead>
                              <tbody>
                                {uploadResults.rows.map((row: any, index: number) => (
                                  <tr key={index} className="border-t">
                                    <td className="py-2 px-3">{row.rowNumber}</td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1">
                                        {row.status === 'valid' ? (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-600" />
                                        )}
                                        <span className={row.status === 'valid' ? 'text-green-600' : 'text-red-600'}>
                                          {row.status}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3">
                                      {row.errors?.length > 0 && (
                                        <div className="text-red-600 text-xs">
                                          {row.errors.join(', ')}
                                        </div>
                                      )}
                                      {row.warnings?.length > 0 && (
                                        <div className="text-yellow-600 text-xs">
                                          {row.warnings.join(', ')}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
