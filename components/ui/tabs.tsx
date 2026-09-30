'use client';
import * as React from 'react';
import * as T from '@radix-ui/react-tabs';
import { cn } from './cn';

export const Tabs = T.Root;
export function TabsList({ className, ...p }: T.TabsListProps) {
  return <T.List className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-input bg-surface-2 p-1', className)} {...p} />;
}
export function TabsTrigger({ className, ...p }: T.TabsTriggerProps) {
  return (
    <T.Trigger
      className={cn(
        'inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-sm font-medium text-muted transition-colors hover:text-text data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-s1',
        className,
      )}
      {...p}
    />
  );
}
export function TabsContent({ className, ...p }: T.TabsContentProps) {
  return <T.Content className={cn('mt-4 focus-visible:outline-none', className)} {...p} />;
}
