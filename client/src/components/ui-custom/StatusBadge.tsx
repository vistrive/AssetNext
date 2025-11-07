import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  className?: string;
}

export function StatusBadge({
  children,
  variant = 'default',
  size = 'md',
  glow = false,
  className,
}: StatusBadgeProps) {
  const variants = {
    success: 'bg-[#0B3B24] text-[#4ADE80]', // Deployed - dark green bg with bright green text
    warning: 'bg-[#422006] text-[#FACC15]', // In-Repair - dark yellow/orange bg with bright yellow text
    danger: 'bg-[#3F0A0A] text-[#F87171]', // Disposed/Retired - dark red bg with bright red text
    info: 'bg-[#0B3B24] text-[#4ADE80]', // In-Stock - dark green bg with bright green text
    default: 'bg-surface-lighter text-text-primary border border-white/10',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const glowVariants = {
    success: 'shadow-[0_0_10px_rgba(74,222,128,0.3)]', // #4ADE80 bright green glow
    warning: 'shadow-[0_0_10px_rgba(250,204,21,0.3)]', // #FACC15 bright yellow glow
    danger: 'shadow-[0_0_10px_rgba(248,113,113,0.3)]', // #F87171 bright red glow
    info: 'shadow-[0_0_10px_rgba(74,222,128,0.3)]', // #4ADE80 bright green glow for in-stock
    default: '',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all duration-300',
        variants[variant],
        sizes[size],
        glow && glowVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusDotProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  pulse?: boolean;
  className?: string;
}

export function StatusDot({
  variant = 'default',
  pulse = false,
  className,
}: StatusDotProps) {
  const variants = {
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-danger',
    info: 'bg-status-info',
    default: 'bg-text-muted',
  };

  return (
    <span className="relative inline-flex h-3 w-3">
      {pulse && (
        <span
          className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            variants[variant]
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-3 w-3',
          variants[variant],
          className
        )}
      />
    </span>
  );
}
