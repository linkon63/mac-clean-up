import React from 'react';
import { cn } from '@/lib/utils';

export function GlassCard({ className, children, ...props }) {
  return (
    <div
      className={cn('liquid-card rounded-2xl p-5 transition-colors duration-200', className)}
      {...props}
    >
      {children}
    </div>
  );
}

