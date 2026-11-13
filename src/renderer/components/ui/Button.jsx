import React from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary:
    'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20 hover:opacity-95 border border-white/20',
  glass:
    'bg-white/8 text-zinc-100 hover:bg-white/14 border border-white/12 backdrop-blur-md',
  danger:
    'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 border border-rose-400/30 backdrop-blur-md',
  ghost: 'text-zinc-300 hover:bg-white/8 hover:text-white border border-transparent',
};

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-xl',
};

export function Button({
  variant = 'glass',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'no-drag inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        variants[variant] || variants.glass,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

