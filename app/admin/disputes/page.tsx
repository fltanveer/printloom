'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Gavel } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { IssueResolution, IssueType, SubOrder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Field, Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/components/ui/cn';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { Ago, EmptyState, ListSkeleton, PageHeader, SafeImage, Timeline, useFakeLoading } from '@/components/shared/bits';

const ISSUE_LABEL: Record<IssueType, string> = { damaged: 'Damaged', wrong_item: 'Wrong item', print_quality: 'Poor print quality', late: 'Late delivery' };
const DECISIONS: { id: IssueResolution; label: string; hint: string }[] = [
  { id: 'refund', label: 'Full refund', hint: 'Customer gets the whole shop order back.' },
  { id: 'partial_refund', label: 'Partial refund', hint: 'Pick an amount up to the order total.' },
  { id: 'reprint', label: 'Reprint', hint: 'The shop prints and ships it again.' },
  { id: 'rejected', label: 'Reject', hint: 'Uphold the shop decision, the order completes.' },
];
const DECISION_LABEL: Record<IssueResolution, string> = { refund: 'Full refund', partial_refund: 'Partial refund', reprint: 'Reprint', rejected: 'Rejected' };

export default function DisputesPage() {
  const loading = useFakeLoading();
  const subOrders = useStore((s) => s.subOrders);
  const all = React.useMemo(() => Object.values(subOrders), [subOrders]);
  const open = all.filter((s) => s.status === 'escalated').sort((a, b) => (b.issue?.reportedAt ?? '').localeCompare(a.issue?.reportedAt ?? ''));
  const decided = all.filter((s) => s.issue?.adminDecision);

  return (
    <div>
      <PageHeader title="Disputes" subtitle="Escalated issues where the customer and the shop disagree. Your decision is shown to both." />
      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Waiting {open.length ? <Badge tone="solid">{open.length}</Badge> : null}</TabsTrigger>
          <TabsTrigger value="decided">Decided <span className="text-xs text-muted">{decided.length}</span></TabsTrigger>
        </TabsList>
        <TabsContent value="open">
          {loading ? (
            <ListSkeleton rows={2} />
          ) : open.length ? (
            <ul className="space-y-4">
              {open.map((s) => (
                <li key={s.id}>
                  <DisputeCard sub={s} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState kind="spark" body="No disputes waiting. When a customer escalates a rejected issue, it lands here." />
          )}
        </TabsContent>
        <TabsContent value="decided">
          {loading ? (
            <ListSkeleton rows={2} />
          ) : decided.length ? (
            <ul className="space-y-2">
              {decided.map((s) => (
                <DecidedRow key={s.id} sub={s} />
              ))}
            </ul>
          ) : (
            <EmptyState kind="box" body="No decisions yet." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DisputeCard({ sub }: { sub: SubOrder }) {
  const order = useStore((s) => s.orders[sub.orderId]);
  const customer = useStore((s) => s.customers[sub.customerId]);
  const vendor = useStore((s) => s.vendors[sub.vendorId]);
  const decideDispute = useStore((s) => s.decideDispute);
  const money = useMoney();
  const [decision, setDecision] = React.useState<IssueResolution>(sub.issue?.desired === 'reprint' ? 'reprint' : 'refund');
  const [amount, setAmount] = React.useState(String(Math.round(sub.total / 2)));
  const issue = sub.issue;
  if (!issue) return null;
  const amt = Number(amount);
  const amountError = decision === 'partial_refund' && (!Number.isFinite(amt) || amt <= 0 || amt > sub.total) ? `Enter an amount between ${money(1)} and ${money(sub.total)}.` : null;

  const confirm = () => {
    if (amountError) {
      toast.error(amountError);
      return;
    }
    decideDispute(sub.id, decision, decision === 'partial_refund' ? Math.round(amt) : undefined);
    toast.success(`Decided: ${DECISION_LABEL[decision].toLowerCase()}. ${customer?.name ?? 'The customer'} and ${vendor?.shopName ?? 'the shop'} were notified.`);
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">
            Order {order?.number} · {ISSUE_LABEL[issue.type]}
          </h2>
          <p className="text-sm text-muted">
            {customer?.name} vs {vendor?.shopName} · reported <Ago at={issue.reportedAt} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={sub.status} />
          <MoneyText value={sub.total} className="font-semibold" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-input bg-surface-2 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Customer says</p>
            <p className="mt-1">{issue.note || 'No note.'}</p>
            <p className="mt-1 text-muted">Wants a {issue.desired}.</p>
          </div>
          {issue.photos.length ? (
            <div className="grid grid-cols-3 gap-2">
              {issue.photos.map((p, i) => (
                <a key={i} href={p} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-input border border-border">
                  <SafeImage src={p} alt={`Customer photo ${i + 1}`} className="h-full w-full" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No photos attached.</p>
          )}
          <div className="rounded-input border border-border p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Shop rejected because</p>
            <p className="mt-1">{issue.rejectReason || 'No reason given.'}</p>
          </div>
          <details>
            <summary className="min-h-[44px] cursor-pointer py-2 text-sm font-semibold">Order timeline</summary>
            <Timeline events={sub.timeline} className="mt-2" />
          </details>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Your decision</p>
          <div role="radiogroup" aria-label="Decision" className="grid gap-2 sm:grid-cols-2">
            {DECISIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={decision === d.id}
                onClick={() => setDecision(d.id)}
                className={cn('rounded-card border p-3 text-left transition-colors', decision === d.id ? 'border-accent bg-accent-soft' : 'border-border hover:border-accent/50')}
              >
                <span className="block font-semibold">{d.label}</span>
                <span className="text-xs text-muted">{d.hint}</span>
              </button>
            ))}
          </div>
          {decision === 'partial_refund' ? (
            <Field label="Refund amount (৳)" htmlFor={`amt-${sub.id}`} error={amountError} hint={`Order total ${money(sub.total)}`}>
              <Input id={`amt-${sub.id}`} type="number" min={1} max={sub.total} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
          ) : null}
          <ConfirmDialog
            trigger={
              <Button className="w-full" disabled={!!amountError}>
                <Gavel className="h-4 w-4" /> Decide: {DECISION_LABEL[decision]}
              </Button>
            }
            title={`${DECISION_LABEL[decision]} for order ${order?.number}?`}
            description={`This closes the dispute. The decision is added to the order timeline and both ${customer?.name ?? 'the customer'} and ${vendor?.shopName ?? 'the shop'} are notified.`}
            confirmLabel="Confirm decision"
            onConfirm={confirm}
          />
          <Link href={`/orders/${sub.orderId}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-accent-text">
            Open customer view of the order
          </Link>
        </div>
      </div>
    </Card>
  );
}

function DecidedRow({ sub }: { sub: SubOrder }) {
  const order = useStore((s) => s.orders[sub.orderId]);
  const vendor = useStore((s) => s.vendors[sub.vendorId]);
  const d = sub.issue?.adminDecision;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface p-3 text-sm">
      <div>
        <p className="font-semibold">
          Order {order?.number} · {vendor?.shopName}
        </p>
        <p className="text-muted">{sub.issue ? ISSUE_LABEL[sub.issue.type] : ''}</p>
      </div>
      <div className="flex items-center gap-2">
        {d ? <Badge tone="accent">{DECISION_LABEL[d]}</Badge> : null}
        {sub.refundAmount ? <MoneyText value={sub.refundAmount} className="font-semibold" /> : null}
        <StatusPill status={sub.status} />
      </div>
    </li>
  );
}
