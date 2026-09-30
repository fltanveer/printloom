'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, Clock, Globe, MessageCircle, PenLine, RefreshCcw, Shirt, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { cn } from '@/components/ui/cn';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { Avatar, EmptyState, ListSkeleton, PageHeader, SafeImage, Timeline, useFakeLoading } from '@/components/shared/bits';
import { ChatSheet, EscrowPaySheet, ProposalCard, RevisionDialog } from '@/components/requests/RequestBits';
import { useCustomerId, useStore } from '@/lib/store';
import { isRequestActive, isRequestPreAccept } from '@/lib/stateMachines';
import { formatDateTime, relativeDay } from '@/lib/dates';
import type { Proposal } from '@/lib/types';

export default function RequestDetailPage() {
  const loading = useFakeLoading();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const cid = useCustomerId();
  const request = useStore((s) => s.requests[id]);
  const designers = useStore((s) => s.designers);
  const products = useStore((s) => s.products);
  const cancelRequest = useStore((s) => s.cancelRequest);
  const acceptProposal = useStore((s) => s.acceptProposal);
  const approveDelivery = useStore((s) => s.approveDelivery);
  const requestRevision = useStore((s) => s.requestRevision);
  const extendRequest = useStore((s) => s.extendRequest);
  const repostPublic = useStore((s) => s.repostPublic);

  const money = useMoney();
  const [chatOpen, setChatOpen] = React.useState(false);
  const [paying, setPaying] = React.useState<Proposal | null>(null);
  const [revOpen, setRevOpen] = React.useState(false);
  const [extraNote, setExtraNote] = React.useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = React.useState<number | null>(null);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <EmptyState
          kind="search"
          title="Request not found"
          body="This request doesn't exist or belongs to another customer."
          action={
            <Button asChild>
              <Link href="/requests">See your requests</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const designer = request.designerId ? designers[request.designerId] : null;
  const product = products[request.productId];
  const preAccept = isRequestPreAccept(request.status);
  const active = isRequestActive(request.status);
  const canCancel = preAccept || request.status === 'expired' || request.status === 'declined';
  const deliveries = [...request.deliveries].sort((a, b) => b.version - a.version);
  const shown = deliveries.find((d) => d.version === selectedVersion) ?? deliveries[0];
  const remaining = Math.max(0, request.revisionLimit + request.extraRevisionsPaid - request.revisionsUsed);
  const useHref = request.resultDesignId ? `/product/${request.productId || 'p_tee'}?design=${request.resultDesignId}` : null;
  const accepted = request.proposals.find((p) => p.id === request.acceptedProposalId);
  const firstName = designer?.name.split(' ')[0] ?? 'The designer';

  const approve = () => {
    const r = approveDelivery(request.id);
    if (!r.ok) return toast.error(r.reasons[0]);
    toast.success('Approved. The design is in My designs now.', {
      action: { label: 'Use on a product', onClick: () => router.push(`/product/${request.productId || 'p_tee'}?design=${r.value}`) },
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader
        back={{ href: '/requests', label: 'Requests' }}
        title={request.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusPill status={request.status} />
            <span>{product?.name ?? 'Any product'}</span>
            <span>{request.use}</span>
            <span>
              <MoneyText value={request.budget.min} /> to <MoneyText value={request.budget.max} />
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> Due {relativeDay(request.deadline)}
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setChatOpen(true)}>
              <MessageCircle className="h-4 w-4" /> Messages{request.messages.length ? ` (${request.messages.length})` : ''}
            </Button>
            {canCancel ? (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" className="text-danger">
                    <XCircle className="h-4 w-4" /> Cancel request
                  </Button>
                }
                title="Cancel this request?"
                description="Designers can no longer send proposals. Nothing has been charged."
                confirmLabel="Cancel request"
                danger
                onConfirm={() => {
                  const r = cancelRequest(request.id);
                  if (r.ok) toast.success('Request cancelled');
                  else toast.error(r.reasons[0]);
                }}
              />
            ) : active ? (
              <Button variant="ghost" className="text-muted" onClick={() => toast.error('Not possible without a dispute, contact support.')}>
                <XCircle className="h-4 w-4" /> Cancel request
              </Button>
            ) : null}
          </>
        }
      />

      <StatusBanner>
        {request.status === 'open' ? <Banner icon={<Globe className="h-5 w-5" />} title="Posted publicly" body="Designers who work in your styles were notified. Proposals show up below." /> : null}
        {request.status === 'sent' && designer ? <Banner icon={<Clock className="h-5 w-5" />} title={`Waiting for ${firstName}`} body={`${designer.name} usually replies within a day.`} /> : null}
        {request.status === 'proposals_received' ? <Banner icon={<PenLine className="h-5 w-5" />} title="Proposals are in" body="Compare them below and accept the one you like. You pay into escrow, released only when you approve." /> : null}
        {request.status === 'in_progress' || request.status === 'accepted' ? (
          <Banner icon={<PenLine className="h-5 w-5" />} title={`${firstName} is working on it`} body={accepted ? `Expected within ${accepted.days} days. ${money(request.escrowAmount)} held in escrow.` : 'Work has started.'} />
        ) : null}
        {request.status === 'revision_requested' ? <Banner icon={<RefreshCcw className="h-5 w-5" />} title="Revision requested" body={`${firstName} is working on the next version.`} /> : null}
        {request.status === 'delivered' ? <Banner tone="accent" icon={<CheckCircle2 className="h-5 w-5" />} title={`v${deliveries[0]?.version ?? 1} is ready`} body="Take a look below. Approve it or ask for a revision." /> : null}
        {request.status === 'expired' ? (
          <Banner
            tone="warning"
            icon={<Clock className="h-5 w-5" />}
            title="This request expired"
            body="No proposal was accepted before the deadline."
            actions={
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    extendRequest(request.id, 7);
                    toast.success('Deadline extended by 7 days');
                  }}
                >
                  Extend deadline
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    repostPublic(request.id);
                    toast.success('Reposted publicly for 7 days');
                  }}
                >
                  Repost publicly
                </Button>
              </>
            }
          />
        ) : null}
        {request.status === 'declined' ? (
          <Banner
            tone="warning"
            icon={<XCircle className="h-5 w-5" />}
            title={`${designer?.name ?? 'The designer'} can't take this one`}
            body="Post it publicly and other designers can send proposals."
            actions={
              <Button
                size="sm"
                onClick={() => {
                  repostPublic(request.id);
                  toast.success('Posted publicly');
                }}
              >
                <Globe className="h-4 w-4" /> Post publicly
              </Button>
            }
          />
        ) : null}
        {request.status === 'completed' || request.status === 'approved' ? (
          <Banner
            tone="success"
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Approved and yours"
            body="The design is saved in My designs and prints with no royalty."
            actions={
              useHref ? (
                <Button size="sm" asChild>
                  <Link href={useHref}>
                    <Shirt className="h-4 w-4" /> Use on a product
                  </Link>
                </Button>
              ) : null
            }
          />
        ) : null}
        {request.status === 'cancelled_by_customer' ? <Banner icon={<XCircle className="h-5 w-5" />} title="Cancelled" body="This request is closed." /> : null}
      </StatusBanner>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {deliveries.length ? (
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">Deliveries</h2>
              <div className="rounded-card border border-border bg-surface p-4">
                {shown ? (
                  <div className="relative overflow-hidden rounded-input bg-surface-2">
                    <SafeImage src={shown.src} alt={`${request.title}, version ${shown.version}`} className="mx-auto aspect-square w-full max-w-md" contain />
                    <Badge tone="dark" className="absolute left-3 top-3">
                      v{shown.version}
                      {shown.version === deliveries[0].version ? ', latest' : ''}
                    </Badge>
                  </div>
                ) : null}
                {shown?.note ? <p className="mt-3 text-sm text-muted">&ldquo;{shown.note}&rdquo; · {formatDateTime(shown.at)}</p> : null}
                {deliveries.length > 1 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {deliveries.map((d) => (
                      <button key={d.id} type="button" onClick={() => setSelectedVersion(d.version)} aria-pressed={shown?.id === d.id} className={cn('relative h-16 w-16 shrink-0 overflow-hidden rounded-input border-2', shown?.id === d.id ? 'border-accent' : 'border-border')}>
                        <SafeImage src={d.src} alt={`Version ${d.version}`} className="h-full w-full bg-surface-2" contain />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-center text-[10px] font-semibold text-white">v{d.version}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {request.status === 'delivered' ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button onClick={approve}>
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                    <Button variant="secondary" onClick={() => setRevOpen(true)}>
                      <RefreshCcw className="h-4 w-4" /> Request revision
                    </Button>
                    <span className="text-sm text-muted">{remaining > 0 ? `${remaining} ${remaining === 1 ? 'revision' : 'revisions'} left` : 'No included revisions left'}</span>
                  </div>
                ) : null}
                {useHref ? (
                  <Button asChild className="mt-4">
                    <Link href={useHref}>
                      <Shirt className="h-4 w-4" /> Use on a product
                    </Link>
                  </Button>
                ) : null}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Proposals</h2>
            {request.proposals.length ? (
              <div className="space-y-3">
                {[...request.proposals]
                  .sort((a, b) => (a.status === 'accepted' ? -1 : b.status === 'accepted' ? 1 : a.price - b.price))
                  .map((p) => (
                    <ProposalCard key={p.id} proposal={p} canAccept={preAccept} onAccept={() => setPaying(p)} />
                  ))}
              </div>
            ) : (
              <EmptyState kind="inbox" body={preAccept ? 'No proposals yet. Designers usually reply within a day.' : 'No proposals on this request.'} />
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Brief</h2>
            <div className="rounded-card border border-border bg-surface p-4">
              <p className="whitespace-pre-wrap text-sm">{request.brief}</p>
              {request.styleTags.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {request.styleTags.map((t) => (
                    <Badge key={t} tone="accent" className="capitalize">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {request.refs.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {request.refs.map((r, i) => (
                    <SafeImage key={i} src={r} alt={`Reference ${i + 1}`} className="h-20 w-20 rounded-input border border-border" />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-border bg-surface p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Designer</div>
            {designer ? (
              <Link href={`/designer-profile/${designer.id}`} className="flex items-center gap-3 hover:underline">
                <Avatar src={designer.avatar} name={designer.name} size={44} />
                <span>
                  <span className="block font-semibold">{designer.name}</span>
                  <span className="block text-xs capitalize text-muted">{designer.tags.join(', ')}</span>
                </span>
              </Link>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Globe className="h-4 w-4" /> Open to all designers
              </p>
            )}
            {request.escrowAmount > 0 ? (
              <div className="mt-3 flex items-center justify-between rounded-input bg-surface-2 px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <ShieldCheck className="h-4 w-4" /> In escrow
                </span>
                <MoneyText value={request.escrowAmount} className="font-semibold" />
              </div>
            ) : null}
            {accepted ? (
              <p className="mt-2 text-xs text-muted">
                Revisions used: {request.revisionsUsed} of {request.revisionLimit + request.extraRevisionsPaid}
              </p>
            ) : null}
          </div>
          <div className="rounded-card border border-border bg-surface p-4">
            <h2 className="mb-3 font-display font-semibold">Activity</h2>
            <Timeline events={request.timeline} />
          </div>
        </aside>
      </div>

      <ChatSheet request={request} open={chatOpen} onOpenChange={setChatOpen} customerId={cid} />
      <EscrowPaySheet
        open={!!paying}
        onOpenChange={(o) => !o && setPaying(null)}
        amount={paying?.price ?? 0}
        title="Accept proposal"
        description={paying ? `${designers[paying.designerId]?.name ?? 'Designer'}, ${paying.days} days` : ''}
        onPaid={() => {
          if (!paying) return false;
          const r = acceptProposal(request.id, paying.id);
          if (!r.ok) {
            toast.error(r.reasons[0]);
            return false;
          }
          toast.success(`Accepted. ${designers[paying.designerId]?.name ?? 'The designer'} is starting work.`);
          return true;
        }}
      />
      <RevisionDialog request={request} open={revOpen} onOpenChange={setRevOpen} onPaidExtra={(note) => setExtraNote(note)} />
      <EscrowPaySheet
        open={extraNote !== null}
        onOpenChange={(o) => !o && setExtraNote(null)}
        amount={request.extraRevisionFee}
        title="Extra revision"
        description="Paid into escrow and released with the final design."
        onPaid={() => {
          const r = requestRevision(request.id, extraNote ?? '', true);
          if (!r.ok) {
            toast.error(r.reasons[0]);
            return false;
          }
          toast.success('Extra revision requested');
          return true;
        }}
      />
    </div>
  );
}

function StatusBanner({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 space-y-3">{children}</div>;
}

function Banner({ icon, title, body, actions, tone = 'neutral' }: { icon: React.ReactNode; title: string; body: string; actions?: React.ReactNode; tone?: 'neutral' | 'accent' | 'warning' | 'success' }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-center',
        tone === 'accent' && 'border-accent/40 bg-accent-soft/60',
        tone === 'warning' && 'border-warning/40 bg-warning/10',
        tone === 'success' && 'border-success/40 bg-success/10',
        tone === 'neutral' && 'border-border bg-surface',
      )}
    >
      <div className="flex flex-1 items-start gap-3">
        <span className="mt-0.5 text-accent-text">{icon}</span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted">{body}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
