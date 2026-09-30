'use client';
import * as React from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { formatMoney } from '@/lib/money';
import { useStore } from '@/lib/store';
import { cn } from '@/components/ui/cn';

/** Formats BDT as ৳1,250 or USD as $12.50 depending on the demo currency. Animates changes (250 ms roll). */
export function MoneyText({
  value,
  className,
  animated = false,
  strike,
  sign,
  decimals,
}: {
  value: number;
  className?: string;
  animated?: boolean;
  strike?: boolean;
  sign?: boolean;
  decimals?: boolean;
}) {
  const currency = useStore((s) => s.currency);
  const rate = useStore((s) => s.settings.usdRate);
  const reduce = useReducedMotion();
  const [shown, setShown] = React.useState(value);
  const prev = React.useRef(value);

  React.useEffect(() => {
    if (!animated || reduce || prev.current === value) {
      setShown(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.25,
      ease: 'easeOut',
      onUpdate: (v) => setShown(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, animated, reduce]);

  const display = animated && shown !== value ? Math.round(shown) : value;
  return <span className={cn('tabular-nums', strike && 'text-muted line-through', className)}>{formatMoney(display, currency, rate, { sign, decimals })}</span>;
}

export function useMoney() {
  const currency = useStore((s) => s.currency);
  const rate = useStore((s) => s.settings.usdRate);
  return React.useCallback((v: number, opts?: { sign?: boolean; decimals?: boolean }) => formatMoney(v, currency, rate, opts), [currency, rate]);
}
