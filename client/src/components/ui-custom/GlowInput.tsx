import React from 'react';
import { cn } from '@/lib/utils';

interface GlowInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function GlowInput({
  label,
  error,
  icon,
  className,
  ...props
}: GlowInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        <input
          className={cn(
            // Base styles
            'w-full rounded-lg px-4 py-2.5 transition-all duration-300',
            'bg-surface-light/50 backdrop-blur-sm',
            'border border-white/10',
            'text-text-primary placeholder:text-text-muted',
            // Focus styles
            'focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50',
            'focus:shadow-glow',
            // Icon padding
            icon && 'pl-10',
            // Error styles
            error && 'border-status-danger/50 focus:ring-status-danger/50',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-status-danger mt-1">{error}</p>
      )}
    </div>
  );
}

interface GlowTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function GlowTextarea({
  label,
  error,
  className,
  ...props
}: GlowTextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          // Base styles
          'w-full rounded-lg px-4 py-2.5 transition-all duration-300',
          'bg-surface-light/50 backdrop-blur-sm',
          'border border-white/10',
          'text-text-primary placeholder:text-text-muted',
          // Focus styles
          'focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50',
          'focus:shadow-glow',
          // Error styles
          error && 'border-status-danger/50 focus:ring-status-danger/50',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-status-danger mt-1">{error}</p>
      )}
    </div>
  );
}
