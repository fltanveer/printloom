'use client';
import * as React from 'react';
import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './cn';

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  wide,
  ...p
}: Omit<D.DialogContentProps, 'title'> & { title: string; description?: string; wide?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px]" />
      <D.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[81] max-h-[90vh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-sheet border border-border bg-surface p-5 shadow-s3 sm:p-6',
          wide ? 'max-w-4xl' : 'max-w-lg',
          className,
        )}
        {...p}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <D.Title className="font-display text-xl font-semibold">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Close">
            <X className="h-5 w-5" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

/** Side sheet: right side on desktop, bottom sheet on mobile. */
export function SheetContent({
  className,
  children,
  title,
  description,
  side = 'right',
  footer,
  ...p
}: Omit<D.DialogContentProps, 'title'> & { title: string; description?: string; side?: 'right' | 'bottom'; footer?: React.ReactNode }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px]" />
      <D.Content
        className={cn(
          'fixed z-[81] flex flex-col border-border bg-surface shadow-s3',
          side === 'right'
            ? 'inset-x-0 bottom-0 max-h-[92vh] rounded-t-sheet border-t md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[480px] md:rounded-none md:rounded-l-sheet md:border-l md:border-t-0'
            : 'inset-x-0 bottom-0 max-h-[92vh] rounded-t-sheet border-t',
          className,
        )}
        {...p}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div className="min-w-0">
            <D.Title className="font-display text-xl font-semibold">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Close">
            <X className="h-5 w-5" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer ? <div className="border-t border-border p-4 sm:p-5">{footer}</div> : null}
      </D.Content>
    </D.Portal>
  );
}
