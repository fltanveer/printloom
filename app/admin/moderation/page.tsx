'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Flag, RotateCcw, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { Design, Report } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusPill } from '@/components/shared/StatusPill';
import { MoneyText } from '@/components/shared/MoneyText';
import { Ago, Avatar, EmptyState, ListSkeleton, PageHeader, SafeImage, useFakeLoading } from '@/components/shared/bits';

const REASON: Record<Report['reason'], string> = { copyright: 'Copyright', offensive: 'Offensive', other: 'Other' };

export default function ModerationPage() {
  const loading = useFakeLoading();
  const state = useStore();

  const queue = React.useMemo(() => {
    const ids = new Set<string>();
    Object.values(state.designs).forEach((d) => d.status === 'flagged' && ids.add(d.id));
    state.reports.filter((r) => r.status === 'open').forEach((r) => ids.add(r.designId));
    return [...ids].map((id) => state.designs[id]).filter((d): d is Design => !!d);
  }, [state.designs, state.reports]);
  const decided = state.reports.filter((r) => r.status !== 'open').sort((a, b) => b.at.localeCompare(a.at));

  const cartsWith = (designId: string) => Object.values(state.carts).filter((lines) => lines.some((l) => l.customization.layers.some((x) => x.designId === designId))).length;

  const act = (d: Design, action: 'restore' | 'remove') => {
    state.moderateDesign(d.id, action);
    const who = d.designerId ? state.designers[d.designerId]?.name : 'The owner';
    const carts = cartsWith(d.id);
    toast.success(action === 'restore' ? `${d.title} is back in the library. ${who} was notified.` : `${d.title} was removed. ${who} was notified${carts ? ` and ${carts} cart${carts > 1 ? 's were' : ' was'} flagged` : ''}.`);
  };

  return (
    <div>
      <PageHeader title="Moderation" subtitle="Flagged designs and copyright reports. Decisions notify the designer and flag affected carts." />
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            Needs review {queue.length ? <Badge tone="solid">{queue.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="decided">Decided <span className="text-xs text-muted">{decided.length}</span></TabsTrigger>
        </TabsList>
        <TabsContent value="queue">
          {loading ? (
            <ListSkeleton rows={3} />
          ) : queue.length ? (
            <ul className="space-y-4">
              {queue.map((d) => {
                const designer = d.designerId ? state.designers[d.designerId] : null;
                const reports = state.reports.filter((r) => r.designId === d.id && r.status === 'open');
                const carts = cartsWith(d.id);
                return (
                  <li key={d.id}>
                    <Card className="flex flex-col gap-4 p-4 md:flex-row">
                      <div className="aspect-square w-full shrink-0 overflow-hidden rounded-input bg-surface-2 md:w-48">
                        <SafeImage src={d.files.src} alt={d.title} className="h-full w-full" contain />
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h2 className="font-display text-lg font-semibold">{d.title}</h2>
                            {designer ? (
                              <Link href={`/designer-profile/${designer.id}`} className="mt-0.5 inline-flex items-center gap-2 text-sm text-muted hover:text-text">
                                <Avatar src={designer.avatar} name={designer.name} size={20} /> {designer.name}
                              </Link>
                            ) : null}
                          </div>
                          <StatusPill status={d.status} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                          <span>{d.uses} uses</span>
                          <span>
                            Royalty <MoneyText value={d.royalty.amount} />
                          </span>
                          <span>{carts ? `In ${carts} cart${carts > 1 ? 's' : ''}` : 'Not in any cart'}</span>
                        </div>
                        {reports.length ? (
                          <ul className="space-y-2">
                            {reports.map((r) => (
                              <li key={r.id} className="rounded-input border border-border bg-surface-2/60 p-3 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Flag className="h-4 w-4 text-amber-600" />
                                  <span className="font-semibold">{REASON[r.reason]}</span>
                                  <span className="text-muted">
                                    by {state.customers[r.reporterId]?.name ?? r.reporterId}, <Ago at={r.at} />
                                  </span>
                                </div>
                                <p className="mt-1">{r.note}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted">Flagged by the system, no customer report attached.</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <ConfirmDialog
                            trigger={
                              <Button variant="secondary">
                                <RotateCcw className="h-4 w-4" /> Restore
                              </Button>
                            }
                            title={`Restore ${d.title}?`}
                            description="It goes back into the library and the designer is notified. Open reports are closed as restored."
                            confirmLabel="Restore"
                            onConfirm={() => act(d, 'restore')}
                          />
                          <ConfirmDialog
                            trigger={
                              <Button variant="danger">
                                <Trash2 className="h-4 w-4" /> Remove
                              </Button>
                            }
                            title={`Remove ${d.title}?`}
                            description={`It disappears from the library and profile. The designer is notified${carts ? ` and ${carts} cart line${carts > 1 ? 's are' : ' is'} flagged for the customer to replace` : ''}. Existing orders still print.`}
                            confirmLabel="Remove"
                            danger
                            onConfirm={() => act(d, 'remove')}
                          />
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState kind="spark" body="Nothing to review. Reported designs will appear here." />
          )}
        </TabsContent>
        <TabsContent value="decided">
          {loading ? (
            <ListSkeleton rows={2} />
          ) : decided.length ? (
            <ul className="space-y-2">
              {decided.map((r) => {
                const d = state.designs[r.designId];
                return (
                  <li key={r.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 text-sm">
                    <SafeImage src={d?.files.src ?? ''} alt="" className="h-12 w-12 shrink-0 rounded-input" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{d?.title ?? 'Deleted design'}</p>
                      <p className="truncate text-muted">
                        {REASON[r.reason]}: {r.note}
                      </p>
                    </div>
                    <StatusPill status={r.status === 'restored' ? 'published' : 'removed'} label={r.status === 'restored' ? 'Restored' : 'Removed'} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState kind="box" body="No decisions yet." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
