import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  RotateCcw, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles
} from "lucide-react";
import type { Recommendation } from "@shared/schema";

export default function Recommendations() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch recommendations
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["/api/recommendations", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await authenticatedRequest("GET", `/api/recommendations?${params}`);
      return response.json();
    },
  });

  // Generate recommendations mutation
  const generateRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedRequest("POST", "/api/recommendations/generate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Recommendations generated",
        description: "New AI recommendations have been generated based on your current asset data.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate recommendations. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update recommendation status mutation
  const updateRecommendationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await authenticatedRequest("PUT", `/api/recommendations/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Recommendation updated",
        description: "The recommendation status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update recommendation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "downgrade":
        return TrendingDown;
      case "upgrade":
        return TrendingUp;
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
      case "upgrade":
        return "text-blue-600 bg-blue-100";
      case "license-optimization":
        return "text-red-600 bg-red-100";
      case "reallocation":
        return "text-green-600 bg-green-100";
      default:
        return "text-purple-600 bg-purple-100";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return CheckCircle;
      case "dismissed":
        return XCircle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "text-green-600 bg-green-100";
      case "dismissed":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const handleAcceptRecommendation = (id: string) => {
    updateRecommendationMutation.mutate({ id, status: "accepted" });
  };

  const handleDismissRecommendation = (id: string) => {
    updateRecommendationMutation.mutate({ id, status: "dismissed" });
  };

  const handleGenerateRecommendations = () => {
    generateRecommendationsMutation.mutate();
  };

  // Filter recommendations
  const filteredRecommendations = recommendations.filter((rec: Recommendation) => {
    if (typeFilter !== "all" && rec.type !== typeFilter) return false;
    return true;
  });

  // Calculate total potential savings
  const totalSavings = filteredRecommendations
    .filter((rec: Recommendation) => rec.status === "pending")
    .reduce((sum: number, rec: Recommendation) => 
      sum + parseFloat(rec.potentialSavings || "0"), 0
    );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <TopBar
          title="AI Recommendations"
          description="Optimize your IT infrastructure with AI-powered insights"
          onAddClick={handleGenerateRecommendations}
          addButtonText="Generate New Recommendations"
          showAddButton={true}
        />
        
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Pending Recommendations</p>
                    <p className="text-3xl font-bold text-foreground">
                      {filteredRecommendations.filter((r: Recommendation) => r.status === "pending").length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Bot className="text-purple-600 h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Potential Savings</p>
                    <p className="text-3xl font-bold text-foreground">
                      ${totalSavings.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-green-600 h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Accepted This Month</p>
                    <p className="text-3xl font-bold text-foreground">
                      {filteredRecommendations.filter((r: Recommendation) => r.status === "accepted").length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-blue-600 h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="downgrade">Downgrade</SelectItem>
                <SelectItem value="upgrade">Upgrade</SelectItem>
                <SelectItem value="license-optimization">License Optimization</SelectItem>
                <SelectItem value="reallocation">Reallocation</SelectItem>
              </SelectContent>
            </Select>

            {generateRecommendationsMutation.isPending && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating recommendations...</span>
              </div>
            )}
          </div>

          {/* Recommendations List */}
          <div className="space-y-4">
            {filteredRecommendations.map((recommendation: Recommendation) => {
              const Icon = getRecommendationIcon(recommendation.type);
              const iconColorClass = getIconColor(recommendation.type);
              const StatusIcon = getStatusIcon(recommendation.status);
              const statusColorClass = getStatusColor(recommendation.status);
              
              return (
                <Card key={recommendation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`w-12 h-12 ${iconColorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">
                              {recommendation.title}
                            </h3>
                            <Badge className={`text-xs ${getPriorityColor(recommendation.priority)}`}>
                              {recommendation.priority}
                            </Badge>
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${statusColorClass}`}>
                              <StatusIcon className="h-3 w-3" />
                              <span className="capitalize">{recommendation.status}</span>
                            </div>
                          </div>
                          
                          <p className="text-muted-foreground mb-3">
                            {recommendation.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="capitalize">Type: {recommendation.type.replace('-', ' ')}</span>
                            {recommendation.potentialSavings && parseFloat(recommendation.potentialSavings) > 0 && (
                              <span className="text-secondary font-medium">
                                Potential savings: ${parseFloat(recommendation.potentialSavings).toLocaleString()}
                              </span>
                            )}
                            <span>
                              Generated: {new Date(recommendation.generatedAt!).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {recommendation.status === "pending" && (
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDismissRecommendation(recommendation.id)}
                            disabled={updateRecommendationMutation.isPending}
                            data-testid={`button-dismiss-${recommendation.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRecommendation(recommendation.id)}
                            disabled={updateRecommendationMutation.isPending}
                            data-testid={`button-accept-${recommendation.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {filteredRecommendations.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No recommendations available
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Generate new recommendations to get AI-powered insights about your IT infrastructure.
                  </p>
                  <Button 
                    onClick={handleGenerateRecommendations}
                    disabled={generateRecommendationsMutation.isPending}
                    data-testid="button-generate-recommendations"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Recommendations
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
