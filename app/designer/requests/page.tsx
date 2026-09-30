'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Send, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { relativeDay } from '@/lib/dates';
import type { DesignRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { Ago, EmptyState, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { RequestBrief, useActiveDesigner } from '@/components/designer/bits';
import { ProposalForm } from '@/components/designer/ProposalForm';

type Tab = 'direct' | 'open' | 'active' | 'completed';
const TABS: Tab[] = ['direct', 'open', 'active', 'completed'];
const ACTIVE = ['accepted', 'in_progress', 'delivered', 'revision_requested'];

export default function DesignerRequestsPage() {
  return (
    <React.Suspense fallback={<ListSkeleton />}>
      <Inner />
    </React.Suspense>
  );
}

function Inner() {
  const loading = useFakeLoading();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params?.get('tab') as Tab | null;
  const tab: Tab = raw && TABS.includes(raw) ? raw : 'direct';
  const { id, designer } = useActiveDesigner();
  const requests = useStore((s) => s.requests);
  const declineRequest = useStore((s) => s.declineRequest);
  const [proposalFor, setProposalFor] = React.useState<DesignRequest | null>(null);
  const [matchOnly, setMatchOnly] = React.useState(true);
  const [selected, setSelected] = React.useState<string | null>(null);

  const all = React.useMemo(() => Object.values(requests).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [requests]);
  if (!designer) return <EmptyState body="Pick a designer persona in the Demo Bar to see requests." />;

  const direct = all.filter((r) => r.designerId === id && r.status === 'sent');
  const openAll = all.filter((r) => !r.designerId && (r.status === 'open' || r.status === 'proposals_received'));
  const open = matchOnly ? openAll.filter((r) => r.styleTags.some((t) => designer.tags.includes(t))) : openAll;
  const active = all.filter((r) => r.designerId === id && ACTIVE.includes(r.status));
  const completed = all.filter((r) => r.designerId === id && (r.status === 'approved' || r.status === 'completed'));
  const sel = open.find((r) => r.id === selected) ?? open[0] ?? null;

  const setTab = (t: string) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  return (
    <div>
      <PageHeader title="Requests" subtitle={designer.acceptsRequests ? 'Custom work from customers. Proposals are free to send.' : 'You are not taking direct requests. You can still send proposals on the open board.'} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="direct">Direct {direct.length ? <Badge tone="solid">{direct.length}</Badge> : null}</TabsTrigger>
          <TabsTrigger value="open">Open board <span className="text-xs text-muted">{openAll.length}</span></TabsTrigger>
          <TabsTrigger value="active">Active <span className="text-xs text-muted">{active.length}</span></TabsTrigger>
          <TabsTrigger value="completed">Completed <span className="text-xs text-muted">{completed.length}</span></TabsTrigger>
        </TabsList>

        <TabsContent value="direct">
          {loading ? (
            <ListSkeleton />
          ) : direct.length ? (
            <ul className="space-y-3">
              {direct.map((r) => {
                const mine = r.proposals.find((p) => p.designerId === id && p.status === 'pending');
                return (
                  <li key={r.id}>
                    <Card className="p-4">
                      <RequestRow r={r} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {mine ? (
                          <Badge tone="accent">
                            Proposal sent: <MoneyText value={mine.price} />, {mine.days} days
                          </Badge>
                        ) : (
                          <Button size="sm" onClick={() => setProposalFor(r)}>
                            <Send className="h-4 w-4" /> Send proposal
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" asChild>
                          <Link href={`/designer/requests/${r.id}`}>Open brief</Link>
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button size="sm" variant="ghost">
                              <X className="h-4 w-4" /> Decline
                            </Button>
                          }
                          title="Decline this request?"
                          description="The customer will be offered to post it publicly instead."
                          confirmLabel="Decline"
                          danger
                          onConfirm={() => {
                            declineRequest(r.id);
                            toast.success('Declined. The customer has been told.');
                          }}
                        />
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState kind="inbox" body="No direct requests right now. A complete profile and portfolio bring more of them." action={<Button variant="secondary" onClick={() => setTab('open')}>Browse the open board</Button>} />
          )}
        </TabsContent>

        <TabsContent value="open">
          <label className="mb-3 flex min-h-[44px] w-fit items-center gap-3 text-sm">
            <Switch checked={matchOnly} onCheckedChange={setMatchOnly} aria-label="Only requests matching my tags" />
            Only requests matching my tags ({designer.tags.join(', ') || 'none'})
          </label>
          {loading ? (
            <ListSkeleton />
          ) : open.length ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
              <ul className="space-y-2">
                {open.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r.id);
                        if (window.matchMedia('(max-width: 1023px)').matches) router.push(`/designer/requests/${r.id}`);
                      }}
                      aria-current={sel?.id === r.id}
                      className={cn('block w-full rounded-card border p-3 text-left transition-colors', sel?.id === r.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-accent/50')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{r.title}</span>
                        <StatusPill status={r.status} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                        <span className="font-semibold text-text">
                          <MoneyText value={r.budget.min} /> to <MoneyText value={r.budget.max} />
                        </span>
                        <span>Due {relativeDay(r.deadline)}</span>
                        <span>{r.proposals.length} proposals</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {sel ? (
                <Card className="relative hidden flex-col lg:flex">
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-xl font-semibold">{sel.title}</h2>
                        <p className="text-xs text-muted">
                          Posted <Ago at={sel.createdAt} />
                        </p>
                      </div>
                      <Link href={`/designer/requests/${sel.id}`} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-accent-text">
                        Full page <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <RequestBrief request={sel} />
                  </div>
                  <div className="sticky bottom-0 mt-auto border-t border-border bg-surface/95 p-4 backdrop-blur">
                    {sel.proposals.some((p) => p.designerId === id && p.status === 'pending') ? (
                      <p className="text-center text-sm font-medium text-muted">You sent a proposal. We will notify you when the customer decides.</p>
                    ) : (
                      <Button className="w-full" onClick={() => setProposalFor(sel)}>
                        <Send className="h-4 w-4" /> Send proposal
                      </Button>
                    )}
                  </div>
                </Card>
              ) : null}
            </div>
          ) : (
            <EmptyState kind="search" body={matchOnly ? 'No open requests match your tags right now.' : 'The open board is empty right now.'} action={matchOnly ? <Button variant="secondary" onClick={() => setMatchOnly(false)}>Show all open requests</Button> : undefined} />
          )}
        </TabsContent>

        <TabsContent value="active">
          {loading ? <ListSkeleton /> : active.length ? <LinkList list={active} designerId={id} /> : <EmptyState kind="inbox" body="No active work. Accepted proposals show up here." action={<Button variant="secondary" onClick={() => setTab('open')}>Find a request</Button>} />}
        </TabsContent>
        <TabsContent value="completed">
          {loading ? <ListSkeleton /> : completed.length ? <LinkList list={completed} designerId={id} /> : <EmptyState kind="spark" body="Finished requests will be listed here with what you earned." />}
        </TabsContent>
      </Tabs>

      <Dialog open={!!proposalFor} onOpenChange={(o) => !o && setProposalFor(null)}>
        {proposalFor ? (
          <DialogContent title="Send a proposal" description={proposalFor.title}>
            <ProposalForm request={requests[proposalFor.id] ?? proposalFor} designerId={id} onSent={() => setProposalFor(null)} />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function RequestRow({ r }: { r: DesignRequest }) {
  const customer = useStore((s) => s.customers[r.customerId]);
  const product = useStore((s) => s.products[r.productId]);
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/designer/requests/${r.id}`} className="font-semibold hover:underline">
            {r.title}
          </Link>
          <p className="text-xs text-muted">
            {customer?.name} · {product?.name} · <Ago at={r.createdAt} />
          </p>
        </div>
        <StatusPill status={r.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted">{r.brief}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold">
          <MoneyText value={r.budget.min} /> to <MoneyText value={r.budget.max} />
        </span>
        <span className="text-muted">Due {relativeDay(r.deadline)}</span>
        {r.styleTags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
    </div>
  );
}

function LinkList({ list, designerId }: { list: DesignRequest[]; designerId: string }) {
  return (
    <ul className="space-y-3">
      {list.map((r) => {
        const p = r.proposals.find((x) => x.id === r.acceptedProposalId && x.designerId === designerId);
        return (
          <li key={r.id}>
            <Link href={`/designer/requests/${r.id}`} className="block rounded-card border border-border bg-surface p-4 transition-colors hover:border-accent/60">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{r.title}</span>
                <StatusPill status={r.status} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
                {p ? (
                  <span>
                    Price <MoneyText value={p.price} className="font-semibold text-text" />
                  </span>
                ) : null}
                <span>
                  Revision {r.revisionsUsed} of {r.revisionLimit + r.extraRevisionsPaid}
                </span>
                <span>{r.deliveries.length} deliveries</span>
                <span>{r.messages.length} messages</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
