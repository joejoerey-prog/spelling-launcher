import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'warning' | 'suggestion' | 'info' | 'success' | 'primary' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className,
  onClick,
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-md border transition-colors';

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    warning: 'bg-amber-950/40 text-amber-300 border-amber-500/20',
    suggestion: 'bg-sky-950/40 text-sky-300 border-sky-500/20',
    info: 'bg-slate-800 text-slate-300 border-white/10',
    success: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20',
    primary: 'bg-sky-500/10 text-sky-200 border-sky-400/20',
    neutral: 'bg-slate-800 text-slate-300 border-white/10',
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], onClick && 'cursor-pointer hover:opacity-80', className))}
      onClick={onClick}
    >
      {children}
    </span>
  );
};
