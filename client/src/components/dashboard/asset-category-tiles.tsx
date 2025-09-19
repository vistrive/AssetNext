import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Monitor, 
  Laptop, 
  Server, 
  HardDrive, 
  Smartphone, 
  Tablet, 
  Code, 
  Printer, 
  Package, 
  Mouse, 
  Router, 
  Wifi, 
  Camera, 
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Scan
} from "lucide-react";

interface AssetCategoryTilesProps {
  metrics: any;
  onNavigateToAssets: (type: string, category?: string) => void;
}

export function AssetCategoryTiles({ metrics, onNavigateToAssets }: AssetCategoryTilesProps) {
  // Hardware categories with their icons
  const hardwareCategories = [
    { key: 'pc', label: 'PC', icon: Monitor },
    { key: 'laptop', label: 'Laptop', icon: Laptop },
    { key: 'server', label: 'Server', icon: Server },
    { key: 'rack', label: 'Racks', icon: HardDrive },
    { key: 'mobile', label: 'Mobile Phone', icon: Smartphone },
    { key: 'tablet', label: 'Tablets', icon: Tablet }
  ];

  // Peripheral categories with their icons
  const peripheralCategories = [
    { key: 'printer', label: 'Printers', icon: Printer },
    { key: '3d-printer', label: '3D Printers', icon: Package },
    { key: 'scanner', label: 'Scanners', icon: Scan },
    { key: 'mouse', label: 'Mouse', icon: Mouse },
    { key: 'router', label: 'Routers', icon: Router },
    { key: 'switch', label: 'Switches', icon: Wifi },
    { key: 'hub', label: 'Hubs', icon: Wifi }
  ];

  // Others categories with their icons
  const otherCategories = [
    { key: 'cctv', label: 'CCTV Cameras', icon: Camera },
    { key: 'access-control', label: 'Access Control', icon: Shield }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigateToAssets('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-assets">{metrics.totalAssets || 0}</div>
            <p className="text-xs text-muted-foreground">All managed assets</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigateToAssets('software')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-licenses">{metrics.activeLicenses || 0}</div>
            <p className="text-xs text-muted-foreground">Software licenses active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-compliance-score">{metrics.complianceScore || 0}%</div>
            <p className="text-xs text-muted-foreground">Asset compliance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-actions">{metrics.pendingActions || 0}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Hardware Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Hardware Assets</h2>
          <Button variant="outline" size="sm" onClick={() => onNavigateToAssets('hardware')} data-testid="button-view-all-hardware">
            View All Hardware
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {hardwareCategories.map(({ key, label, icon: Icon }) => {
            const categoryData = metrics.hardware?.byCategory?.[key];
            const total = categoryData?.total || 0;
            const deployed = categoryData?.deployed || 0;
            const inStock = categoryData?.inStock || 0;
            const inRepair = categoryData?.inRepair || 0;

            return (
              <Card 
                key={key} 
                className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => onNavigateToAssets('hardware', key)}
                data-testid={`card-hardware-${key}`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`text-${key}-total`}>{total}</div>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="default" className="text-xs">
                      {deployed} Deployed
                    </Badge>
                    {inStock > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {inStock} Stock
                      </Badge>
                    )}
                    {inRepair > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {inRepair} Repair
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Hardware Status Indicators */}
        {metrics.hardware?.warrantyStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Hardware Status Overview</CardTitle>
              <CardDescription>Warranty and AMC tracking for hardware assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600" data-testid="text-warranty-expired">
                    {metrics.hardware.warrantyStatus.expired || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Warranty Expired</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600" data-testid="text-warranty-expiring">
                    {metrics.hardware.warrantyStatus.expiring || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Warranty Expiring</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600" data-testid="text-amc-expired">
                    {metrics.hardware.warrantyStatus.amcExpired || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">AMC Expired</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600" data-testid="text-amc-due">
                    {metrics.hardware.warrantyStatus.amcDue || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">AMC Due</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600" data-testid="text-hardware-total">
                    {metrics.hardware.warrantyStatus.total || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Hardware</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Software Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Software & Licenses</h2>
          <Button variant="outline" size="sm" onClick={() => onNavigateToAssets('software')} data-testid="button-view-all-software">
            View All Software
          </Button>
        </div>
        
        {metrics.software?.licenseStatus && (
          <Card>
            <CardHeader>
              <CardTitle>License Management Overview</CardTitle>
              <CardDescription>Software license utilization and renewal tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600" data-testid="text-total-licenses">
                    {metrics.software.licenseStatus.totalLicenses || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Licenses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600" data-testid="text-assigned-licenses">
                    {metrics.software.licenseStatus.assigned || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Assigned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600" data-testid="text-unassigned-licenses">
                    {metrics.software.licenseStatus.unassigned || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Unassigned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600" data-testid="text-unutilized-licenses">
                    {metrics.software.licenseStatus.unutilized || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Unutilized</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600" data-testid="text-renewal-due">
                    {metrics.software.licenseStatus.renewalDue || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Renewal Due</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600" data-testid="text-licenses-expired">
                    {metrics.software.licenseStatus.expired || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Expired</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-lg font-semibold">
                  Utilization: {metrics.software.licenseStatus.utilizationPct || 0}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${metrics.software.licenseStatus.utilizationPct || 0}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Peripherals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Peripheral Devices</h2>
          <Button variant="outline" size="sm" onClick={() => onNavigateToAssets('peripheral')} data-testid="button-view-all-peripherals">
            View All Peripherals
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {peripheralCategories.map(({ key, label, icon: Icon }) => {
            const categoryData = metrics.peripherals?.byCategory?.[key];
            const total = categoryData?.total || 0;
            const deployed = categoryData?.deployed || 0;
            const inStock = categoryData?.inStock || 0;

            return (
              <Card 
                key={key} 
                className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => onNavigateToAssets('peripheral', key)}
                data-testid={`card-peripheral-${key}`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`text-peripheral-${key}-total`}>{total}</div>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="default" className="text-xs">
                      {deployed} Used
                    </Badge>
                    {inStock > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {inStock} Available
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Others Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Other Assets</h2>
          <Button variant="outline" size="sm" onClick={() => onNavigateToAssets('others')} data-testid="button-view-all-others">
            View All Others
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherCategories.map(({ key, label, icon: Icon }) => {
            const categoryData = metrics.others?.byCategory?.[key];
            const total = categoryData?.total || 0;
            const deployed = categoryData?.deployed || 0;
            const inStock = categoryData?.inStock || 0;

            return (
              <Card 
                key={key} 
                className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => onNavigateToAssets('others', key)}
                data-testid={`card-others-${key}`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`text-others-${key}-total`}>{total}</div>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="default" className="text-xs">
                      {deployed} Active
                    </Badge>
                    {inStock > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {inStock} Standby
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}