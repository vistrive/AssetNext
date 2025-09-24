import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ExpiringItemsTileProps {
  metrics: any;
}

export function ExpiringItemsTile({ metrics }: ExpiringItemsTileProps) {
  const totalExpiring = (metrics?.itamInsights?.summary?.totalExpiringWarranties || 0) + 
                       (metrics?.itamInsights?.summary?.totalExpiringLicenses || 0);

  return (
    <Card data-testid="card-expiring-items" className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center">
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Expiring Items</p>
            <p className="text-2xl font-bold" data-testid="count-expiring-items">
              {totalExpiring}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}