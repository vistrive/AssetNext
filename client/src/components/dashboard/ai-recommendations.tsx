import { Bot, TrendingDown, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@shared/schema";

interface AIRecommendationsProps {
  recommendations: Recommendation[];
  onViewAll: () => void;
  onViewRecommendation: (id: string) => void;
}

export function AIRecommendations({ 
  recommendations, 
  onViewAll, 
  onViewRecommendation 
}: AIRecommendationsProps) {
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "downgrade":
        return TrendingDown;
      case "license-optimization":
        return AlertTriangle;
      case "reallocation":
        return RotateCcw;
      default:
        return Bot;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "downgrade":
        return "text-yellow-600 bg-yellow-100";
      case "license-optimization":
        return "text-red-600 bg-red-100";
      case "reallocation":
        return "text-green-600 bg-green-100";
      default:
        return "text-blue-600 bg-blue-100";
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-3 h-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">AI Recommendations</h3>
        <div className="w-6 h-6 bg-secondary/10 rounded-lg flex items-center justify-center">
          <Bot className="text-secondary h-3 w-3" />
        </div>
      </div>
      
      <div className="space-y-2 overflow-y-auto max-h-56">
        {recommendations.slice(0, 4).map((recommendation) => {
          const Icon = getRecommendationIcon(recommendation.type);
          const iconColorClass = getIconColor(recommendation.type);
          
          return (
            <div 
              key={recommendation.id}
              className="border border-border rounded p-2 hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => onViewRecommendation(recommendation.id)}
              data-testid={`recommendation-${recommendation.id}`}
            >
              <div className="flex items-start space-x-2">
                <div className={`w-6 h-6 ${iconColorClass} rounded flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground text-xs truncate">{recommendation.title}</h4>
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{recommendation.description}</p>
                  {recommendation.potentialSavings && parseFloat(recommendation.potentialSavings) > 0 && (
                    <p className="text-secondary text-xs mt-1 font-medium">
                      ${parseFloat(recommendation.potentialSavings).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {recommendations.length === 0 && (
          <div className="text-center py-4">
            <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No recommendations</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate AI insights
            </p>
          </div>
        )}
      </div>
      
      {recommendations.length > 4 && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2 text-xs h-7" 
          onClick={onViewAll}
          data-testid="button-view-all-recommendations"
        >
          View All {recommendations.length}
        </Button>
      )}
    </div>
  );
}
