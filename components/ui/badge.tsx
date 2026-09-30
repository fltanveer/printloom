import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-surface-2 text-muted',
      accent: 'bg-accent-soft text-accent-text',
      success: 'bg-success/10 text-green-700 dark:text-green-400',
      warning: 'bg-warning/15 text-amber-700 dark:text-amber-300',
      danger: 'bg-danger/10 text-red-600 dark:text-red-400',
      info: 'bg-info/10 text-blue-700 dark:text-blue-300',
      solid: 'bg-accent text-white',
      dark: 'bg-text text-bg',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export function Badge({ className, tone, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...p} />;
}
