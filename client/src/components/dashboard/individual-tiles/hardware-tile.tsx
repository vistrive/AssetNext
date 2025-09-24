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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">Hardware</CardTitle>
          <p className="text-sm text-muted-foreground">Computers, servers, devices</p>
        </div>
        <Monitor className="h-8 w-8 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4" data-testid="text-Hardware-total">
          {count}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigateToAssets('Hardware')}
          data-testid="button-view-all-Hardware"
          className="w-full"
        >
          View All
        </Button>
      </CardContent>
    </Card>
  );
}