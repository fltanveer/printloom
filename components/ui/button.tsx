'use client';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all disabled:pointer-events-none disabled:opacity-45 active:scale-[.98] select-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white shadow-s1 hover:shadow-glow hover:brightness-105',
        secondary: 'bg-surface text-text border border-border shadow-s1 hover:border-accent/50 hover:bg-surface-2',
        ghost: 'text-text hover:bg-surface-2',
        soft: 'bg-accent-soft text-accent-text hover:brightness-95',
        danger: 'bg-danger text-white hover:brightness-105',
        outline: 'border border-accent text-accent-text hover:bg-accent-soft',
        link: 'text-accent-text underline-offset-4 hover:underline !px-0 !h-auto',
        dark: 'bg-text text-bg hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-3 text-sm rounded-input',
        md: 'h-11 px-4 text-sm rounded-input',
        lg: 'h-12 px-6 text-base rounded-card',
        icon: 'h-11 w-11 rounded-input',
        'icon-sm': 'h-9 w-9 rounded-input',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, type, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} type={asChild ? undefined : type ?? 'button'} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = 'Button';
