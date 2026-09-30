'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Ban, RefreshCcw, ShieldAlert, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Field, Textarea } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ago, EmptyState, ListSkeleton, PageHeader, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { useVendor } from '@/components/vendor/useVendor';
import { NumInput } from '@/components/vendor/fields';
import { ISSUE_LABEL } from '@/components/vendor/helpers';
import { subOrdersForVendor } from '@/lib/selectors';
import type { IssueResolution, SubOrder } from '@/lib/types';

const RESOLUTION_LABEL: Record<IssueResolution, string> = { refund: 'Full refund', partial_refund: 'Partial refund', reprint: 'Reprint', rejected: 'Rejected' };

export default function IssuesPage() {
  const loading = useFakeLoading();
  const { data, vendorId } = useVendor();
  const [filter, setFilter] = React.useState<'open' | 'all'>('open');
  const [partial, setPartial] = React.useState<SubOrder | null>(null);
  const [amount, setAmount] = React.useState<number | undefined>(undefined);
  const [rejecting, setRejecting] = React.useState<SubOrder | null>(null);
  const [reason, setReason] = React.useState('');
  const [refunding, setRefunding] = React.useState<SubOrder | null>(null);

  const withIssue = React.useMemo(
    () => subOrdersForVendor(data, vendorId).filter((s) => s.issue).sort((a, b) => (b.issue?.reportedAt ?? '').localeCompare(a.issue?.reportedAt ?? '')),
    [data, vendorId],
  );
  const shown = filter === 'open' ? withIssue.filter((s) => s.issue?.status === 'open') : withIssue;

  if (loading) return <ListSkeleton rows={3} />;

  const run = (s: SubOrder, res: IssueResolution, opts?: { amount?: number; reason?: string }) => {
    const r = data.resolveIssue(s.id, res, opts);
    if (!r.ok) return toast.error(r.reasons.join('. '));
    toast.success(res === 'reprint' ? 'Reprint approved. The order is back in production.' : res === 'rejected' ? 'Issue rejected. The customer can escalate to Printloom.' : 'Refund issued. The customer has been told.');
  };

  return (
    <div>
      <PageHeader title="Issues" subtitle="Problems customers reported after delivery. Quick, fair answers keep your rating high." />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'open' | 'all')}>
        <TabsList className="mb-4 w-fit">
          <TabsTrigger value="open">Needs answer ({withIssue.filter((s) => s.issue?.status === 'open').length})</TabsTrigger>
          <TabsTrigger value="all">All ({withIssue.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {!shown.length ? (
        <EmptyState
          kind="spark"
          body={filter === 'open' ? 'No open issues. Happy customers all round.' : 'No issues reported yet.'}
          action={filter === 'open' && withIssue.length ? <Button variant="secondary" onClick={() => setFilter('all')}>See past issues</Button> : undefined}
        />
      ) : (
        <div className="space-y-4">
          {shown.map((s) => {
            const issue = s.issue!;
            const order = data.orders[s.orderId];
            const customer = data.customers[s.customerId];
            const product = data.products[s.lines[0]?.customization.productId];
            return (
              <Card key={s.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/vendor/orders/${s.id}`} className="font-display text-lg font-semibold hover:underline">
                        {order?.number}
                      </Link>
                      <Badge tone="warning">{ISSUE_LABEL[issue.type]}</Badge>
                      <StatusPill status={issue.status} />
                    </div>
                    <p className="text-sm text-muted">
                      {customer?.name}, {product?.name}, reported <Ago at={issue.reportedAt} />. Wants a {issue.desired}.
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-muted">Order total</div>
                    <MoneyText value={s.total} className="font-semibold" />
                  </div>
                </div>
                <blockquote className="mt-3 rounded-input bg-surface-2 p-3 text-sm">&ldquo;{issue.note}&rdquo;</blockquote>
                {issue.photos.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {issue.photos.map((p, i) => (
                      <a key={i} href={p} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-input border border-border">
                        <SafeImage src={p} alt={`Customer photo ${i + 1}`} className="h-24 w-24" />
                      </a>
                    ))}
                  </div>
                ) : null}

                {issue.status === 'open' ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => run(s, 'reprint')}>
                      <RefreshCcw className="h-4 w-4" /> Approve reprint
                    </Button>
                    <Button variant="secondary" onClick={() => setRefunding(s)}>
                      <Wallet className="h-4 w-4" /> Refund in full
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setAmount(Math.round(s.total / 2));
                        setPartial(s);
                      }}
                    >
                      Partial refund
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setReason('');
                        setRejecting(s);
                      }}
                    >
                      <Ban className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-input border border-border p-3 text-sm">
                    {issue.status === 'escalated' ? (
                      <p className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-danger" /> The customer escalated this. Printloom is reviewing and will decide.
                      </p>
                    ) : (
                      <p>
                        You chose <strong>{issue.resolution ? RESOLUTION_LABEL[issue.resolution] : 'a resolution'}</strong>
                        {issue.refundAmount ? (
                          <>
                            {' '}
                            of <MoneyText value={issue.refundAmount} />
                          </>
                        ) : null}
                        {issue.rejectReason ? `: ${issue.rejectReason}` : '.'}
                      </p>
                    )}
                    {issue.adminDecision ? (
                      <p className="mt-1 text-muted">
                        Printloom decided: <strong>{RESOLUTION_LABEL[issue.adminDecision]}</strong>.
                      </p>
                    ) : null}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!refunding}
        onOpenChange={(o) => !o && setRefunding(null)}
        title="Refund in full?"
        description={refunding ? `The customer gets back the full order total. This can't be undone.` : ''}
        confirmLabel="Refund in full"
        danger
        onConfirm={() => refunding && run(refunding, 'refund')}
      />

      <Dialog open={!!partial} onOpenChange={(o) => !o && setPartial(null)}>
        <DialogContent title="Partial refund" description="Refund part of the order, for example for one damaged piece.">
          {partial ? (
            <>
              <Field label="Amount to refund" hint={`Up to the order total.`} error={amount !== undefined && (amount <= 0 || amount > partial.total) ? 'Enter an amount above 0 and up to the order total' : null}>
                <NumInput value={amount} allowEmpty min={1} max={partial.total} prefix="৳" onChange={setAmount} aria-label="Refund amount" />
              </Field>
              <p className="mt-2 text-sm text-muted">
                Order total <MoneyText value={partial.total} />
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPartial(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={!amount || amount <= 0 || amount > partial.total}
                  onClick={() => {
                    run(partial, 'partial_refund', { amount });
                    setPartial(null);
                  }}
                >
                  Refund
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent title="Reject this issue" description="Explain why. The customer can still escalate to Printloom.">
          <Field label="Reason" error={reason && reason.trim().length < 5 ? 'A few more words please' : null}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The photo shows normal fading after a hot wash. Our care card says cold wash." />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={reason.trim().length < 5}
              onClick={() => {
                if (rejecting) run(rejecting, 'rejected', { reason: reason.trim() });
                setRejecting(null);
              }}
            >
              Reject issue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
