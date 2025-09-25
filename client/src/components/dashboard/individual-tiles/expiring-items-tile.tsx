import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ExpiringItemsTileProps {
  metrics: any;
}

export function ExpiringItemsTile({ metrics }: ExpiringItemsTileProps) {
  const expiringWarranties = metrics?.itamInsights?.summary?.totalExpiringWarranties || 0;
  const expiringLicenses = metrics?.itamInsights?.summary?.totalExpiringLicenses || 0;
  const totalExpiring = expiringWarranties + expiringLicenses;

  return (
    <Card data-testid="card-expiring-items" className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center">
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-muted-foreground">Expiring Warranties & Licenses</p>
            <p className="text-2xl font-bold" data-testid="count-expiring-items">
              {totalExpiring}
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              <div className="flex gap-4">
                <span>{expiringWarranties} Warranties</span>
                <span>{expiringLicenses} Licenses</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}