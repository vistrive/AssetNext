import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Package,
  MapPin,
  User
} from 'lucide-react';

interface AssetAgeAnalysisProps {
  assetAgeAnalysis: {
    replacementCandidates: {
      threeYearOld: Array<{
        id: string;
        name: string;
        category: string;
        manufacturer: string;
        model: string;
        purchaseDate: Date | null;
        age: string;
        purchaseCost: number | null;
        location: string | null;
        assignedUser: string | null;
        status: string;
        replacementUrgency: 'moderate' | 'high';
      }>;
      fiveYearOld: Array<{
        id: string;
        name: string;
        category: string;
        manufacturer: string;
        model: string;
        purchaseDate: Date | null;
        age: string;
        purchaseCost: number | null;
        location: string | null;
        assignedUser: string | null;
        status: string;
        replacementUrgency: 'moderate' | 'high';
      }>;
    };
    ageDistribution: Record<string, number>;
    replacementCosts: {
      threeYearOld: number;
      fiveYearOld: number;
    };
    summary: {
      totalAssetsNeedingReplacement: number;
      criticalReplacementAssets: number;
      estimatedReplacementCost: number;
      averageAssetAge: number;
    };
  };
}

export function AssetAgeAnalysis({ assetAgeAnalysis }: AssetAgeAnalysisProps) {
  const { replacementCandidates, ageDistribution, replacementCosts, summary } = assetAgeAnalysis;

  // Calculate age distribution percentages
  const totalAssets = Object.values(ageDistribution).reduce((sum, count) => sum + count, 0);
  const getPercentage = (count: number) => totalAssets > 0 ? (count / totalAssets) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getUrgencyColor = (urgency: 'moderate' | 'high') => {
    return urgency === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 
           'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-replacement-needed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Needs Replacement</p>
                <p className="text-2xl font-bold" data-testid="count-replacement-needed">
                  {summary.totalAssetsNeedingReplacement}
                </p>
                <p className="text-xs text-muted-foreground">3+ years old</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-replacement">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Replacement</p>
                <p className="text-2xl font-bold text-red-600" data-testid="count-critical-replacement">
                  {summary.criticalReplacementAssets}
                </p>
                <p className="text-xs text-muted-foreground">5+ years old</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-replacement-cost">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Cost</p>
                <p className="text-2xl font-bold" data-testid="text-replacement-cost">
                  {formatCurrency(summary.estimatedReplacementCost)}
                </p>
                <p className="text-xs text-muted-foreground">Replacement budget</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-average-age">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Age</p>
                <p className="text-2xl font-bold" data-testid="text-average-age">
                  {summary.averageAssetAge.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">years</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Age Distribution */}
      <Card data-testid="card-age-distribution">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Asset Age Distribution
          </CardTitle>
          <CardDescription>
            Distribution of assets by age categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(ageDistribution).map(([category, count]) => {
              const percentage = getPercentage(count);
              const categoryLabels = {
                new: 'New (< 3 years)',
                aging: 'Aging (3-5 years)',
                old: 'Old (> 5 years)',
                unknown: 'Unknown Age'
              };
              
              const categoryColors = {
                new: 'bg-green-600',
                aging: 'bg-yellow-600',
                old: 'bg-red-600',
                unknown: 'bg-gray-600'
              };

              return (
                <div key={category} className="space-y-1" data-testid={`age-category-${category}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div 
                      className={`h-2 rounded-full ${categoryColors[category as keyof typeof categoryColors]}`}
                      style={{ width: `${Math.max(5, percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3+ Year Old Assets */}
        <Card data-testid="card-three-year-assets">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <Clock className="h-5 w-5" />
              Assets Needing Replacement (3+ Years)
            </CardTitle>
            <CardDescription>
              Assets older than 3 years that may need replacement planning
            </CardDescription>
          </CardHeader>
          <CardContent>
            {replacementCandidates.threeYearOld.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No assets requiring replacement found</p>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {replacementCandidates.threeYearOld.map((asset) => (
                    <div 
                      key={asset.id} 
                      className="border rounded-lg p-3 space-y-2"
                      data-testid={`asset-three-year-${asset.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm" data-testid={`name-${asset.id}`}>
                            {asset.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {asset.manufacturer} {asset.model}
                          </p>
                        </div>
                        <Badge variant="outline" className={getUrgencyColor(asset.replacementUrgency)}>
                          {asset.age}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span data-testid={`purchase-date-${asset.id}`}>
                            {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span data-testid={`cost-${asset.id}`}>
                            {asset.purchaseCost ? formatCurrency(asset.purchaseCost) : 'N/A'}
                          </span>
                        </div>
                        {asset.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span data-testid={`location-${asset.id}`}>{asset.location}</span>
                          </div>
                        )}
                        {asset.assignedUser && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span data-testid={`user-${asset.id}`}>{asset.assignedUser}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* 5+ Year Old Assets */}
        <Card data-testid="card-five-year-assets">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Critical Replacement Assets (5+ Years)
            </CardTitle>
            <CardDescription>
              Assets older than 5 years requiring immediate replacement consideration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {replacementCandidates.fiveYearOld.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No critical replacement assets found</p>
            ) : (
              <>
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>High Priority:</strong> These assets are at end-of-life and should be prioritized for replacement.
                  </AlertDescription>
                </Alert>
                
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {replacementCandidates.fiveYearOld.map((asset) => (
                      <div 
                        key={asset.id} 
                        className="border border-red-200 dark:border-red-800 rounded-lg p-3 space-y-2 bg-red-50 dark:bg-red-950"
                        data-testid={`asset-five-year-${asset.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium text-sm" data-testid={`name-${asset.id}`}>
                              {asset.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {asset.manufacturer} {asset.model}
                            </p>
                          </div>
                          <Badge variant="outline" className={getUrgencyColor(asset.replacementUrgency)}>
                            {asset.age}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span data-testid={`purchase-date-${asset.id}`}>
                              {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span data-testid={`cost-${asset.id}`}>
                              {asset.purchaseCost ? formatCurrency(asset.purchaseCost) : 'N/A'}
                            </span>
                          </div>
                          {asset.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span data-testid={`location-${asset.id}`}>{asset.location}</span>
                            </div>
                          )}
                          {asset.assignedUser && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span data-testid={`user-${asset.id}`}>{asset.assignedUser}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Replacement Cost Summary */}
      <Card data-testid="card-replacement-summary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Replacement Cost Analysis
          </CardTitle>
          <CardDescription>
            Estimated costs for asset replacement planning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>3+ Year Old Assets:</span>
                <span className="font-medium" data-testid="cost-three-year">
                  {formatCurrency(replacementCosts.threeYearOld)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>5+ Year Old Assets:</span>
                <span className="font-medium" data-testid="cost-five-year">
                  {formatCurrency(replacementCosts.fiveYearOld)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total Estimated Cost:</span>
                <span data-testid="cost-total">
                  {formatCurrency(replacementCosts.threeYearOld + replacementCosts.fiveYearOld)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This analysis helps you plan replacement budgets and prioritize asset refresh cycles.
              </p>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>• <strong>3+ years:</strong> Consider for next budget cycle</p>
                <p>• <strong>5+ years:</strong> Immediate replacement planning</p>
                <p>• Costs based on original purchase price</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}