'use client';
import * as React from 'react';
import Link from 'next/link';
import { CalendarClock, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { Avatar, EmptyState, ListSkeleton, PageHeader, Truncate, useFakeLoading } from '@/components/shared/bits';
import { useCustomerId, useStore } from '@/lib/store';
import { relativeDay } from '@/lib/dates';

export default function RequestsPage() {
  const loading = useFakeLoading();
  const cid = useCustomerId();
  const requests = useStore((s) => s.requests);
  const designers = useStore((s) => s.designers);
  const products = useStore((s) => s.products);
  const list = React.useMemo(
    () =>
      Object.values(requests)
        .filter((r) => r.customerId === cid)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests, cid],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader
        title="Design requests"
        subtitle="Commission a designer for something one of a kind."
        actions={
          <Button asChild>
            <Link href="/requests/new">
              <Plus className="h-4 w-4" /> New request
            </Link>
          </Button>
        }
      />
      {loading ? (
        <ListSkeleton rows={3} />
      ) : !list.length ? (
        <EmptyState
          kind="spark"
          title="No requests yet"
          body="Describe your idea and a designer will make it for you, ready to print."
          action={
            <Button asChild>
              <Link href="/requests/new">Start a request</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((r) => {
            const d = r.designerId ? designers[r.designerId] : null;
            const pending = r.proposals.filter((p) => p.status === 'pending').length;
            return (
              <li key={r.id}>
                <Link href={`/requests/${r.id}`} className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-s1 transition-shadow hover:shadow-s2">
                  {d ? <Avatar src={d.avatar} name={d.name} size={44} /> : <Avatar name="Open" src="🌐" size={44} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Truncate text={r.title} className="font-semibold" />
                      <StatusPill status={r.status} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
                      <span>{products[r.productId]?.name ?? 'Any product'}</span>
                      <span>
                        <MoneyText value={r.budget.min} /> to <MoneyText value={r.budget.max} />
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" /> {relativeDay(r.deadline)}
                      </span>
                      <span>{d ? `With ${d.name}` : 'Posted publicly'}</span>
                    </div>
                    {pending ? <p className="mt-1 text-sm font-medium text-accent-text">{pending} {pending === 1 ? 'proposal' : 'proposals'} waiting for you</p> : null}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
