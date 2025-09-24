import { Card, CardContent } from "@/components/ui/card";
import { HardDrive } from "lucide-react";

interface UnusedHardwareTileProps {
  metrics: any;
}

export function UnusedHardwareTile({ metrics }: UnusedHardwareTileProps) {
  const count = metrics?.itamInsights?.summary?.totalUnusedHardware || 0;

  return (
    <Card data-testid="card-unused-hardware" className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center">
          <HardDrive className="h-8 w-8 text-orange-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Unused Hardware</p>
            <p className="text-2xl font-bold" data-testid="count-unused-hardware">
              {count}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}