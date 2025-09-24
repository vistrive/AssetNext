import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface ComplianceRiskTileProps {
  metrics: any;
}

export function ComplianceRiskTile({ metrics }: ComplianceRiskTileProps) {
  const risk = metrics?.itamInsights?.summary?.complianceRisk || 0;

  return (
    <Card data-testid="card-compliance-risk" className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center">
          <Calendar className="h-8 w-8 text-red-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Compliance Risk</p>
            <p className="text-2xl font-bold" data-testid="count-compliance-risk">
              {risk}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}