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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">Software</CardTitle>
          <p className="text-sm text-muted-foreground">Applications, licenses</p>
        </div>
        <Code className="h-8 w-8 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4" data-testid="text-Software-total">
          {count}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigateToAssets('Software')}
          data-testid="button-view-all-Software"
          className="w-full"
        >
          View All
        </Button>
      </CardContent>
    </Card>
  );
}