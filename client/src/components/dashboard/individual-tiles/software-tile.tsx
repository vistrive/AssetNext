import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";

interface SoftwareTileProps {
  metrics: any;
  onNavigateToAssets: (type: string, category?: string) => void;
}

export function SoftwareTile({ metrics, onNavigateToAssets }: SoftwareTileProps) {
  const count = metrics?.software?.overview?.total || 0;

  return (
    <Card className="hover:shadow-sm transition-shadow h-36">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <div className="space-y-0 min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold truncate">Software</CardTitle>
          <p className="text-xs text-muted-foreground">Applications</p>
        </div>
        <Code className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="pt-1 pb-2">
        <div className="text-xl font-bold mb-2" data-testid="text-Software-total">
          {count}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigateToAssets('Software')}
          data-testid="button-view-all-Software"
          className="w-full text-xs h-7"
        >
          View All
        </Button>
      </CardContent>
    </Card>
  );
}