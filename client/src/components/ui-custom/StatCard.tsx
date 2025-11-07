import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  const isPositive = trend ? trend.value > 0 : null;

  return (
    <div
      className={cn(
        'relative rounded-xl p-6 backdrop-blur-md border border-white/10',
        'bg-gradient-to-br from-surface/70 to-surface-light/70',
        'shadow-card hover:shadow-card-hover transition-all duration-300',
        'group cursor-pointer animate-fade-in',
        className
      )}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-primary/0 to-brand-primary/0 group-hover:from-brand-primary/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className="text-3xl font-display font-bold text-text-primary mt-2">
              {value}
            </p>
          </div>
          {icon && (
            <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-primary text-white shadow-glow">
              {icon}
            </div>
          )}
        </div>

        {trend && (
          <div className="flex items-center gap-1 mt-4">
            <span
              className={cn(
                'text-sm font-medium',
                isPositive ? 'text-status-success' : 'text-status-danger'
              )}
            >
              {isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-sm text-text-muted">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
