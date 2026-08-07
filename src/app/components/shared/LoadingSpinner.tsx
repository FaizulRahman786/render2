import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-4 border-border border-t-primary',
          sizeClasses[size]
        )}
      />
    </div>
  );
};

export const LoadingScreen: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
      {message && <p className="mt-4 text-muted-foreground">{message}</p>}
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    />
  );
};
