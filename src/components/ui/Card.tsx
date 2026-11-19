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
          'bg-slate-850 rounded-xl border border-white/10 p-4 transition-colors duration-150',
          hoverable && 'hover:border-slate-700 hover:bg-slate-800/80 cursor-pointer',
          selected && 'border-sky-500/50 bg-slate-800',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
