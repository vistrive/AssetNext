import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";

interface HardwareTileProps {
  metrics: any;
  onNavigateToAssets: (type: string, category?: string) => void;
}

export function HardwareTile({ metrics, onNavigateToAssets }: HardwareTileProps) {
  const count = metrics?.hardware?.overview?.total || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1 min-w-0 flex-1">
          <CardTitle className="text-base sm:text-lg font-semibold truncate">Hardware</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Computers, servers, devices</p>
          <p className="text-xs text-muted-foreground sm:hidden">Devices</p>
        </div>
        <Monitor className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="flex flex-col justify-between flex-1">
        <div className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4" data-testid="text-Hardware-total">
          {count}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigateToAssets('Hardware')}
          data-testid="button-view-all-Hardware"
          className="w-full text-xs sm:text-sm"
        >
          View All
        </Button>
      </CardContent>
    </Card>
  );
}