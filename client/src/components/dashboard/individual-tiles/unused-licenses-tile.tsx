import { Card, CardContent } from "@/components/ui/card";
import { Key } from "lucide-react";

interface UnusedLicensesTileProps {
  metrics: any;
}

export function UnusedLicensesTile({ metrics }: UnusedLicensesTileProps) {
  const count = metrics?.itamInsights?.summary?.totalUnusedLicenses || 0;

  return (
    <Card data-testid="card-unused-licenses" className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center">
          <Key className="h-8 w-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Unused Licenses</p>
            <p className="text-2xl font-bold" data-testid="count-unused-licenses">
              {count}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}