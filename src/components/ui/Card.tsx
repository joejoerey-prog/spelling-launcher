import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  selected?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  selected = false,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-ink-850 rounded-xl border border-white/10 p-4 transition-colors duration-150',
          hoverable && 'hover:border-ink-700 hover:bg-ink-800/80 cursor-pointer',
          selected && 'border-accent-500/50 bg-ink-800',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
