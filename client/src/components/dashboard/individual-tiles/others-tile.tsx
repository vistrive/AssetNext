import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle } from "@/components/ui-custom";
import { GradientButton } from "@/components/ui-custom";
import { Package } from "lucide-react";

interface OthersTileProps {
  metrics: any;
  onNavigateToAssets: (type: string, category?: string) => void;
}

export function OthersTile({ metrics, onNavigateToAssets }: OthersTileProps) {
  const count = metrics?.others?.overview?.total || 0;

  return (
    <GlassCard className="h-36" glow hover gradient>
      <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-5 pt-4">
        <div className="space-y-0 min-w-0 flex-1">
          <GlassCardTitle className="text-sm truncate">Others</GlassCardTitle>
          <p className="text-xs text-text-secondary">Misc Items</p>
        </div>
        <div className="flex-shrink-0 p-2 rounded-lg bg-gradient-warning shadow-glow">
          <Package className="h-5 w-5 text-white" />
        </div>
      </GlassCardHeader>
      <GlassCardContent className="pt-0 pb-4 px-5">
        <div className="text-3xl font-display font-bold mb-3 text-text-primary" data-testid="text-Others-total">
          {count}
        </div>
        <GradientButton 
          variant="ghost" 
          size="sm" 
          onClick={() => onNavigateToAssets('Others')}
          data-testid="button-view-all-Others"
          className="w-full text-xs h-7 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
        >
          View All
        </GradientButton>
      </GlassCardContent>
    </GlassCard>
  );
}