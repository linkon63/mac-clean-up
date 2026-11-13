import React from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-white/10 text-zinc-200 border-white/15',
  cyan: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  violet: 'bg-violet-500/15 text-violet-200 border-violet-400/30',
  emerald: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
  amber: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  rose: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
};

export function Badge({ variant = 'default', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-md',
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}

