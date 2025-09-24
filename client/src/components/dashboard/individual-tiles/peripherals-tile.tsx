import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PeripheralsTileProps {
  metrics: any;
  onNavigateToAssets: (type: string, category?: string) => void;
}

export function PeripheralsTile({ metrics, onNavigateToAssets }: PeripheralsTileProps) {
  const count = metrics?.peripherals?.overview?.total || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">Peripherals</CardTitle>
          <p className="text-sm text-muted-foreground">Printers, scanners, accessories</p>
        </div>
        <Printer className="h-8 w-8 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4" data-testid="text-Peripherals-total">
          {count}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigateToAssets('Peripherals')}
          data-testid="button-view-all-Peripherals"
          className="w-full"
        >
          View All
        </Button>
      </CardContent>
    </Card>
  );
}