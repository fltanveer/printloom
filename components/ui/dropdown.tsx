'use client';
import * as React from 'react';
import * as M from '@radix-ui/react-dropdown-menu';
import { cn } from './cn';

export const Dropdown = M.Root;
export const DropdownTrigger = M.Trigger;
export function DropdownContent({ className, ...p }: M.DropdownMenuContentProps) {
  return (
    <M.Portal>
      <M.Content sideOffset={6} className={cn('z-[95] max-h-[80vh] min-w-[200px] overflow-y-auto rounded-card border border-border bg-surface p-1.5 text-text shadow-s3', className)} {...p} />
    </M.Portal>
  );
}
export function DropdownItem({ className, ...p }: M.DropdownMenuItemProps) {
  return <M.Item className={cn('flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface-2', className)} {...p} />;
}
export function DropdownLabel({ className, ...p }: M.DropdownMenuLabelProps) {
  return <M.Label className={cn('px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted', className)} {...p} />;
}
export const DropdownSeparator = () => <M.Separator className="my-1 h-px bg-border" />;
