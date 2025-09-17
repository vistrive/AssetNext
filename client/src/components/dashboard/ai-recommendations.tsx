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
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">AI Recommendations</h3>
        <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
          <Bot className="text-secondary h-4 w-4" />
        </div>
      </div>
      
      <div className="space-y-4">
        {recommendations.slice(0, 3).map((recommendation) => {
          const Icon = getRecommendationIcon(recommendation.type);
          const iconColorClass = getIconColor(recommendation.type);
          
          return (
            <div 
              key={recommendation.id}
              className="border border-border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => onViewRecommendation(recommendation.id)}
              data-testid={`recommendation-${recommendation.id}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 ${iconColorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground text-sm">{recommendation.title}</h4>
                  <p className="text-muted-foreground text-xs mt-1">{recommendation.description}</p>
                  {recommendation.potentialSavings && parseFloat(recommendation.potentialSavings) > 0 && (
                    <p className="text-secondary text-xs mt-2 font-medium">
                      Potential savings: ${parseFloat(recommendation.potentialSavings).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {recommendations.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recommendations available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate new recommendations to see AI insights
            </p>
          </div>
        )}
      </div>
      
      {recommendations.length > 0 && (
        <Button 
          variant="ghost" 
          className="w-full mt-4" 
          onClick={onViewAll}
          data-testid="button-view-all-recommendations"
        >
          View All Recommendations
        </Button>
      )}
    </div>
  );
}
