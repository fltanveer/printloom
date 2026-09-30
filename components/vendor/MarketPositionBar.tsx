'use client';
import * as React from 'react';
import { Tip } from '@/components/ui/tooltip';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { median, type MarketPoint } from './helpers';

/** Lowest, median and highest of other shops' quotes with this shop's marker. */
export function MarketPositionBar({ others, mine, shopName }: { others: MarketPoint[]; mine: number; shopName: string }) {
  const money = useMoney();
  if (!others.length)
    return <p className="rounded-input bg-surface-2 p-3 text-sm text-muted">No other shop offers this exact setup right now, so there is nothing to compare with.</p>;
  const units = others.map((o) => o.unit);
  const lo = Math.min(...units, mine);
  const hi = Math.max(...units, mine);
  const pad = Math.max(1, (hi - lo) * 0.08);
  const min = lo - pad;
  const max = hi + pad;
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const med = median(units) as number;
  const diff = mine - med;
  return (
    <div>
      <div className="relative mx-2 mb-8 mt-9 h-2 rounded-full bg-gradient-to-r from-success/40 via-surface-2 to-danger/40" role="img" aria-label={`Your price ${money(mine)}. Other shops from ${money(Math.min(...units))} to ${money(Math.max(...units))}, median ${money(med)}.`}>
        {others.map((o) => (
          <Tip key={o.vendorId} content={`${o.name}: ${money(o.unit)} each`}>
            <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-muted" style={{ left: pos(o.unit) }} tabIndex={0} aria-label={`${o.name} ${money(o.unit)}`} />
          </Tip>
        ))}
        <span className="absolute top-full mt-1 h-3 w-px -translate-x-1/2 bg-text/50" style={{ left: pos(med) }} aria-hidden />
        <span className="absolute top-full mt-4 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted" style={{ left: pos(med) }}>
          median
        </span>
        <span className="absolute bottom-full mb-1 flex -translate-x-1/2 flex-col items-center" style={{ left: pos(mine) }}>
          <span className="whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
            {shopName.split(' ')[0]} <MoneyText value={mine} />
          </span>
          <span className="h-3 w-0.5 bg-accent" />
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <dt className="text-muted">Lowest</dt>
          <dd className="font-semibold"><MoneyText value={Math.min(...units)} /></dd>
        </div>
        <div>
          <dt className="text-muted">Median</dt>
          <dd className="font-semibold"><MoneyText value={med} /></dd>
        </div>
        <div>
          <dt className="text-muted">Highest</dt>
          <dd className="font-semibold"><MoneyText value={Math.max(...units)} /></dd>
        </div>
      </dl>
      <p className="mt-2 text-center text-xs text-muted">
        {Math.abs(diff) < 1 ? 'Right at the market median.' : diff < 0 ? <>You are <MoneyText value={-diff} /> below the median per piece.</> : <>You are <MoneyText value={diff} /> above the median per piece.</>} Compared with {others.length} {others.length === 1 ? 'shop' : 'shops'}.
      </p>
    </div>
  );
}
