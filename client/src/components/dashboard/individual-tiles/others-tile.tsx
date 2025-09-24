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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">Others</CardTitle>
          <p className="text-sm text-muted-foreground">CCTV, access control, misc</p>
        </div>
        <Package className="h-8 w-8 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4" data-testid="text-Others-total">
          {count}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigateToAssets('Others')}
          data-testid="button-view-all-Others"
          className="w-full"
        >
          View All
        </Button>
      </CardContent>
    </Card>
  );
}