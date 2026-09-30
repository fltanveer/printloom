'use client';
import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { ORDER_STATUS_LABEL, NEXT_ORDER_STATUS } from '@/lib/stateMachines';
import { relativeDay } from '@/lib/dates';
import { KANBAN_COLUMNS } from './helpers';
import { orderInfo } from './orderInfo';
import type { AppData, SubOrder } from '@/lib/types';

export function OrderKanban({ data, subs, onAdvance }: { data: AppData; subs: SubOrder[]; onAdvance: (sub: SubOrder) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {KANBAN_COLUMNS.map((st) => {
        const col = subs.filter((s) => (st === 'in_production' ? s.status === 'in_production' || s.status === 'reprint' : s.status === st));
        return (
          <section key={st} className="w-[260px] shrink-0 snap-start rounded-card bg-surface-2/60 p-2.5" aria-label={ORDER_STATUS_LABEL[st]}>
            <h3 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold">
              {ORDER_STATUS_LABEL[st]}
              <span className="rounded-full bg-surface px-2 text-xs tabular-nums text-muted">{col.length}</span>
            </h3>
            <div className="space-y-2">
              {col.length === 0 ? <p className="px-1 py-4 text-center text-xs text-muted">Nothing here</p> : null}
              {col.map((s) => {
                const info = orderInfo(data, s);
                const next = NEXT_ORDER_STATUS[s.status];
                return (
                  <article key={s.id} className="rounded-input border border-border bg-surface p-3 shadow-s1">
                    <Link href={`/vendor/orders/${s.id}`} className="font-semibold hover:underline">
                      {info.number}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted">{info.items}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className={cn(info.late || info.dueSoon ? 'font-semibold text-danger' : 'text-muted')}>{info.late ? 'Late' : relativeDay(info.due)}</span>
                      <MoneyText value={s.split.vendor} className="font-semibold" />
                    </div>
                    {next && next !== 'completed' ? (
                      <Button size="sm" variant="soft" className="mt-2 w-full" onClick={() => onAdvance(s)}>
                        {s.status === 'placed' ? 'Accept' : `Move to ${ORDER_STATUS_LABEL[next].toLowerCase()}`} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
