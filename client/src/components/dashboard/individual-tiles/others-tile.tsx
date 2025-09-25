import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

interface OthersTileProps {
  metrics: any;
  onNavigateToAssets: (type: string, category?: string) => void;
}

export function OthersTile({ metrics, onNavigateToAssets }: OthersTileProps) {
  const count = metrics?.others?.overview?.total || 0;

  return (
    <Card className="hover:shadow-sm transition-shadow h-36">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <div className="space-y-0 min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold truncate">Others</CardTitle>
          <p className="text-xs text-muted-foreground">Misc Items</p>
        </div>
        <Package className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="pt-1 pb-2">
        <div className="text-xl font-bold mb-2" data-testid="text-Others-total">
          {count}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigateToAssets('Others')}
          data-testid="button-view-all-Others"
          className="w-full text-xs h-7"
        >
          View All
        </Button>
      </CardContent>
    </Card>
  );
}