'use client';
import * as React from 'react';
import * as A from '@radix-ui/react-alert-dialog';
import { Button } from './button';

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  return (
    <A.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <A.Trigger asChild>{trigger}</A.Trigger> : null}
      <A.Portal>
        <A.Overlay className="fixed inset-0 z-[90] bg-black/50" />
        <A.Content className="fixed left-1/2 top-1/2 z-[91] w-[calc(100vw-24px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-sheet border border-border bg-surface p-6 shadow-s3">
          <A.Title className="font-display text-xl font-semibold">{title}</A.Title>
          <A.Description className="mt-2 text-sm text-muted">{description}</A.Description>
          <div className="mt-6 flex justify-end gap-2">
            <A.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </A.Cancel>
            <A.Action asChild>
              <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </A.Action>
          </div>
        </A.Content>
      </A.Portal>
    </A.Root>
  );
}
