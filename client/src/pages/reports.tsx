import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Layout } from "@/components/layout/layout";
import { ReportGenerator } from "@/components/dashboard/report-generator";
import { authenticatedRequest } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  User, 
  Clock,
  TrendingUp,
  Filter,
  History
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentReport {
  id: string;
  name: string;
  type: string;
  fields: string[];
  recordCount: number;
  generatedBy: string;
  generatedAt: Date;
  size: number;
}

export default function Reports() {
  const { user } = useAuth();

  // Fetch dashboard metrics for ReportGenerator
  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mock recent reports data - in real app this would come from backend
  const recentReports: RecentReport[] = [
    {
      id: "1",
      name: "Assets Full Report",
      type: "all",
      fields: ["name", "type", "category", "status", "location", "assignedTo", "purchaseDate"],
      recordCount: 245,
      generatedBy: "John Smith",
      generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      size: 1.2 * 1024 * 1024 // 1.2 MB
    },
    {
      id: "2", 
      name: "Hardware Inventory",
      type: "hardware",
      fields: ["name", "serialNumber", "manufacturer", "model", "status", "warrantyExpiry"],
      recordCount: 156,
      generatedBy: "Sarah Johnson", 
      generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      size: 0.8 * 1024 * 1024 // 0.8 MB
    },
    {
      id: "3",
      name: "Financial Report",
      type: "all", 
      fields: ["name", "purchaseDate", "purchasePrice", "status", "location"],
      recordCount: 198,
      generatedBy: "Mike Davis",
      generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      size: 0.5 * 1024 * 1024 // 0.5 MB
    },
    {
      id: "4",
      name: "Software Licenses",
      type: "software",
      fields: ["name", "type", "assignedTo", "status", "notes"],
      recordCount: 89,
      generatedBy: "Emma Wilson",
      generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      size: 0.3 * 1024 * 1024 // 0.3 MB
    }
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hardware':
        return '🖥️';
      case 'software':
        return '💻';
      case 'peripheral':
        return '⌨️';
      default:
        return '📊';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'hardware':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'software':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'peripheral':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Layout title="Reports" description="Generate custom reports and view your recent report history">
      <div className="flex-1 space-y-6 p-4 pt-6">
        {/* Page Header */}
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight" data-testid="page-title-reports">Reports</h2>
            <p className="text-muted-foreground">
              Generate custom reports and view your recent report history
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Generator - Full width on mobile, 2/3 on large screens */}
          <div className="lg:col-span-2">
            <ReportGenerator metrics={metrics} />
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Report Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">This Month</span>
                  </div>
                  <span className="font-medium" data-testid="stats-this-month">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Total Reports</span>
                  </div>
                  <span className="font-medium" data-testid="stats-total-reports">47</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Contributors</span>
                  </div>
                  <span className="font-medium" data-testid="stats-contributors">8</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Reports Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Reports
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Your recently generated reports and downloads
            </div>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <div className="text-center py-8">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No reports generated yet</p>
                <p className="text-sm text-muted-foreground">Generate your first report using the form above</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div 
                      key={report.id} 
                      className="border rounded-lg p-4 space-y-3"
                      data-testid={`report-item-${report.id}`}
                    >
                      {/* Report Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getTypeIcon(report.type)}</span>
                            <h4 className="font-medium" data-testid={`report-name-${report.id}`}>
                              {report.name}
                            </h4>
                            <Badge variant="outline" className={getTypeBadgeColor(report.type)}>
                              {report.type === 'all' ? 'All Assets' : report.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {report.recordCount} records • {formatFileSize(report.size)}
                          </p>
                        </div>
                        <Button
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1"
                          data-testid={`button-redownload-${report.id}`}
                        >
                          <Download className="h-3 w-3" />
                          Re-download
                        </Button>
                      </div>

                      {/* Report Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Generated:</span>
                          <span data-testid={`report-date-${report.id}`}>
                            {formatDistanceToNow(report.generatedAt, { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">By:</span>
                          <span data-testid={`report-user-${report.id}`}>{report.generatedBy}</span>
                        </div>
                      </div>

                      {/* Fields Preview */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Filter className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Fields ({report.fields.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {report.fields.slice(0, 4).map((field) => (
                            <Badge 
                              key={field} 
                              variant="secondary" 
                              className="text-xs"
                              data-testid={`report-field-${report.id}-${field}`}
                            >
                              {field}
                            </Badge>
                          ))}
                          {report.fields.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{report.fields.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}