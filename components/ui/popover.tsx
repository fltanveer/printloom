'use client';
import * as React from 'react';
import * as P from '@radix-ui/react-popover';
import { cn } from './cn';

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export function PopoverContent({ className, ...p }: P.PopoverContentProps) {
  return (
    <P.Portal>
      <P.Content sideOffset={8} className={cn('z-[95] w-80 max-w-[calc(100vw-24px)] rounded-card border border-border bg-surface p-3 shadow-s3', className)} {...p} />
    </P.Portal>
  );
}
