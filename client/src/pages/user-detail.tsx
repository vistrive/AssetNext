import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Asset, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  User as UserIcon, 
  Mail, 
  Hash, 
  HardDrive, 
  Server, 
  Laptop, 
  Smartphone, 
  Tablet,
  Printer,
  Camera,
  Router,
  Monitor,
  Package
} from "lucide-react";
import { format } from "date-fns";

// Icon mapping for asset types
const getAssetTypeIcon = (type: string, category?: string | null) => {
  if (type === "Hardware") {
    switch (category?.toLowerCase()) {
      case "server": return <Server className="h-4 w-4" />;
      case "laptop": return <Laptop className="h-4 w-4" />;
      case "mobile phone": return <Smartphone className="h-4 w-4" />;
      case "tablet": return <Tablet className="h-4 w-4" />;
      case "monitor": return <Monitor className="h-4 w-4" />;
      default: return <HardDrive className="h-4 w-4" />;
    }
  } else if (type === "Peripherals") {
    switch (category?.toLowerCase()) {
      case "printer": return <Printer className="h-4 w-4" />;
      case "cctv camera": return <Camera className="h-4 w-4" />;
      case "router": case "switch": case "hub": return <Router className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  }
  return <Package className="h-4 w-4" />;
};

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "deployed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "in-stock": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case "maintenance": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    case "repair": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case "retired": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
  }
};

export default function UserDetail() {
  const params = useParams();
  const userId = params?.userId;

  // Fetch user details
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ['/api/users', userId],
    enabled: !!userId
  });

  // Fetch user assets
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ['/api/assets/user', userId],
    enabled: !!userId
  });

  if (!userId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid User ID</h1>
          <p className="text-gray-600 mt-2">The user ID is missing or invalid.</p>
          <Link href="/users">
            <Button className="mt-4" data-testid="button-back-to-users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoadingUser || isLoadingAssets) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">User Not Found</h1>
          <p className="text-gray-600 mt-2">The user with ID "{userId}" could not be found.</p>
          <Link href="/users">
            <Button className="mt-4" data-testid="button-back-to-users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/users">
            <Button variant="outline" size="sm" data-testid="button-back-to-users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-user-detail">
              User Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View user information and assigned assets
            </p>
          </div>
        </div>
      </div>

      {/* User Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="card-user-name">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Full Name</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-user-name">
              {user.firstName} {user.lastName}
            </div>
            <p className="text-xs text-muted-foreground">
              {user.role === "admin" ? "Administrator" : 
               user.role === "it-manager" ? "IT Manager" : 
               user.role === "technician" ? "Technician" : "Read Only"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-user-email">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Address</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold break-all" data-testid="text-user-email">
              {user.email}
            </div>
            <p className="text-xs text-muted-foreground">
              {user.isActive ? "Active Account" : "Inactive Account"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-user-id">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User ID</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-user-id">
              {user.userID || "Not assigned"}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique identifier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assets Summary */}
      <Card data-testid="card-assets-summary">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Assigned Assets ({assets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No Assets Assigned</h3>
              <p className="text-gray-500">This user currently has no assets assigned to them.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Purchase Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id} data-testid={`row-asset-${asset.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getAssetTypeIcon(asset.type, asset.category)}
                        <span className="font-medium" data-testid={`text-asset-name-${asset.id}`}>
                          {asset.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-asset-type-${asset.id}`}>
                      {asset.type}
                    </TableCell>
                    <TableCell data-testid={`text-asset-category-${asset.id}`}>
                      {asset.category || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={getStatusColor(asset.status)} 
                        data-testid={`badge-asset-status-${asset.id}`}
                      >
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-asset-serial-${asset.id}`}>
                      {asset.serialNumber || "—"}
                    </TableCell>
                    <TableCell data-testid={`text-asset-location-${asset.id}`}>
                      {asset.location || "—"}
                    </TableCell>
                    <TableCell data-testid={`text-asset-purchase-date-${asset.id}`}>
                      {asset.purchaseDate ? format(new Date(asset.purchaseDate), "MMM dd, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}