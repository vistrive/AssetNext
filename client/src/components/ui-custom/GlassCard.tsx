import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  gradient?: boolean;
}

export function GlassCard({ 
  children, 
  className, 
  hover = true, 
  glow = false,
  gradient = false 
}: GlassCardProps) {
  return (
    <div
      className={cn(
        // Base glassmorphism styles with premium depth
        'relative rounded-xl backdrop-blur-md border',
        gradient 
          ? 'bg-gradient-to-br from-surface/70 to-surface-light/70' 
          : 'bg-surface/70',
        'border-white/10',
        // Inner border for depth
        'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]',
        // Shadows with ambient glow
        glow ? 'shadow-glow' : 'shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
        // Hover effects with smooth transitions
        hover && 'transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(59,130,246,0.2)] hover:border-white/20 hover:-translate-y-0.5',
        // Animation
        'animate-fade-in',
        className
      )}
    >
      {/* Inner glow effect */}
      {glow && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-primary/10 to-transparent pointer-events-none" />
      )}
      {children}
    </div>
  );
}

interface GlassCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCardHeader({ children, className }: GlassCardHeaderProps) {
  return (
    <div className={cn('p-6 border-b border-white/5', className)}>
      {children}
    </div>
  );
}

interface GlassCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCardContent({ children, className }: GlassCardContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

interface GlassCardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCardTitle({ children, className }: GlassCardTitleProps) {
  return (
    <h3 className={cn('text-xl font-display font-semibold text-text-primary', className)}>
      {children}
    </h3>
  );
}

interface GlassCardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCardDescription({ children, className }: GlassCardDescriptionProps) {
  return (
    <p className={cn('text-sm text-text-secondary mt-1', className)}>
      {children}
    </p>
  );
}
