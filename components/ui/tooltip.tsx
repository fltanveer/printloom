'use client';
import * as React from 'react';
import * as T from '@radix-ui/react-tooltip';

export const TooltipProvider = T.Provider;

/** Tooltip wrapper. Children must accept a ref (wrap disabled buttons in a span). */
export function Tip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  if (!content) return <>{children}</>;
  return (
    <T.Root delayDuration={150}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className="z-[100] max-w-[260px] rounded-lg bg-text px-2.5 py-1.5 text-xs font-medium text-bg shadow-s2">
          {content}
          <T.Arrow className="fill-text" />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
