'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, MapPin, MessageSquareWarning, RefreshCcw, ShieldAlert, Star, Truck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Tip } from '@/components/ui/tooltip';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { PriceBreakdown } from '@/components/shared/PriceBreakdown';
import { EmptyState, ListSkeleton, PageHeader, Timeline, useFakeLoading } from '@/components/shared/bits';
import { LineThumb } from '@/components/checkout/LineThumb';
import { MiniStepper } from '@/components/checkout/MiniStepper';
import { ReportIssueDialog } from '@/components/checkout/ReportIssueDialog';
import { OrderSuccessSheet, RejectedPanel, ReviewDialog } from '@/components/checkout/OrderBits';
import { sizeSummary } from '@/components/checkout/helpers';
import { useStore } from '@/lib/store';
import { isLate } from '@/lib/selectors';
import { METHOD_LABEL } from '@/lib/pricing';
import { canCustomerCancel, canReportIssue, canReview, isOrderOpen } from '@/lib/stateMachines';
import { formatDate, formatDateTime, relativeDay } from '@/lib/dates';
import type { SubOrder } from '@/lib/types';

const PAYMENT_LABEL = { bkash: 'bKash', nagad: 'Nagad', card: 'Card', cod: 'Cash on delivery' } as const;
const ISSUE_LABEL = { damaged: 'Damaged', wrong_item: 'Wrong item', print_quality: 'Print quality', late: 'Late' } as const;

export default function OrderDetailPage() {
  return (
    <React.Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-6"><ListSkeleton rows={4} /></div>}>
      <OrderDetail />
    </React.Suspense>
  );
}

function OrderDetail() {
  const loading = useFakeLoading();
  const { orderId } = useParams<{ orderId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const order = useStore((s) => s.orders[orderId]);
  const subOrders = useStore((s) => s.subOrders);
  const reorder = useStore((s) => s.reorder);
  const money = useMoney();
  const [successOpen, setSuccessOpen] = React.useState(search.get('placed') === '1');
  const timelineRef = React.useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <EmptyState
          kind="search"
          title="Order not found"
          body="This order doesn't exist for the current customer. It may belong to another persona."
          action={
            <Button asChild>
              <Link href="/orders">See your orders</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const subs = order.subOrderIds.map((id) => subOrders[id]).filter(Boolean);

  const closeSuccess = (o: boolean) => {
    setSuccessOpen(o);
    if (!o) router.replace(`/orders/${order.id}`, { scroll: false });
  };

  const doReorder = () => {
    const r = reorder(order.id);
    if (!r.added) return toast.error('Nothing to reorder');
    if (r.newTotal !== r.oldTotal) {
      toast(`Prices changed since you ordered: new total ${money(r.newTotal)} (was ${money(r.oldTotal)})`, { action: { label: 'View cart', onClick: () => router.push('/cart') } });
    } else {
      toast.success(`${r.added} ${r.added === 1 ? 'item' : 'items'} added to your cart at the same price`, { action: { label: 'View cart', onClick: () => router.push('/cart') } });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader
        back={{ href: '/orders', label: 'Orders' }}
        title={`Order ${order.number}`}
        subtitle={`Placed ${formatDateTime(order.createdAt)} · ${PAYMENT_LABEL[order.payment.method]} · ${order.payment.status.replace(/_/g, ' ')}`}
        actions={
          <Button variant="secondary" onClick={doReorder}>
            <RefreshCcw className="h-4 w-4" /> Reorder
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-4 text-sm">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <MapPin className="h-4 w-4" /> Shipping to
          </div>
          <p>
            {order.address.name}, {order.address.phone}
          </p>
          <p className="text-muted">
            {order.address.line}, {order.address.area}, {order.address.city}, {order.address.division}
          </p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Items</span>
            <MoneyText value={order.itemsTotal} />
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Shipping</span>
            <MoneyText value={order.shippingTotal} />
          </div>
          {order.payment.fee ? (
            <div className="flex justify-between">
              <span className="text-muted">Cash on delivery fee</span>
              <MoneyText value={order.payment.fee} />
            </div>
          ) : null}
          <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
            <span>Total</span>
            <MoneyText value={order.total} className="font-display text-lg" />
          </div>
        </div>
      </div>

      <div ref={timelineRef} className="space-y-6">
        {subs.map((s, i) => (
          <SubOrderCard key={s.id} sub={s} index={i} count={subs.length} />
        ))}
      </div>

      <OrderSuccessSheet
        open={successOpen}
        onOpenChange={closeSuccess}
        orderNumber={order.number}
        subs={subs}
        onTrack={() => {
          closeSuccess(false);
          window.setTimeout(() => timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
        }}
      />
    </div>
  );
}

function SubOrderCard({ sub, index, count }: { sub: SubOrder; index: number; count: number }) {
  const vendor = useStore((s) => s.vendors[sub.vendorId]);
  const products = useStore((s) => s.products);
  const cancelSubOrder = useStore((s) => s.cancelSubOrder);
  const escalateIssue = useStore((s) => s.escalateIssue);
  const confirmDelivery = useStore((s) => s.confirmDelivery);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const now = new Date();
  const late = isLate(sub, now);
  const reportable = canReportIssue(sub.status, sub.deliveredAt, now);
  const inTransit = ['placed', 'accepted', 'in_production', 'quality_check', 'shipped'].includes(sub.status);
  const cancelLocked = !canCustomerCancel(sub.status) && isOrderOpen(sub.status) && ['in_production', 'quality_check', 'shipped', 'reprint'].includes(sub.status);

  return (
    <section className="rounded-sheet border border-border bg-surface p-4 shadow-s1 sm:p-5" aria-label={`Package from ${vendor?.shopName}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            Package {index + 1} of {count}
          </div>
          <Link href={`/shop/${sub.vendorId}`} className="font-display text-lg font-semibold hover:underline">
            {vendor?.shopName}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {late ? <StatusPill status="delayed" /> : null}
          <StatusPill status={sub.status} />
        </div>
      </div>

      <MiniStepper status={sub.status} className="mt-4" />

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {inTransit ? (
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-muted" />
            {sub.shipping.mode === 'pickup' ? 'Ready for pickup ' : 'Estimated arrival '}
            <strong className={late ? 'text-danger' : ''}>{relativeDay(sub.shipping.mode === 'pickup' ? sub.estShip : sub.estDelivery)}</strong>
          </span>
        ) : null}
        {sub.deliveredAt ? (
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Delivered {formatDate(sub.deliveredAt)}
          </span>
        ) : null}
        <span className="text-muted">
          {sub.shipping.mode === 'pickup' ? `Pickup from ${vendor?.location.city}` : `Delivery, ${sub.shipping.zoneLabel.toLowerCase()}`}
        </span>
      </div>
      {late ? <p className="mt-2 text-sm text-danger">This package is running late. Sorry about that. You can report it below.</p> : null}

      <ul className="mt-4 space-y-3">
        {sub.lines.map((l) => (
          <li key={l.id} className="flex gap-3">
            <LineThumb customization={l.customization} offeringId={l.offeringId} className="w-16 sm:w-20" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold">{products[l.customization.productId]?.name}</div>
              <div className="text-muted">
                {l.customization.color} · {METHOD_LABEL[l.method]}
                {l.rush ? ' · Rush' : ''}
              </div>
              <div className="text-muted">{sizeSummary(l.sizeBreakdown)}</div>
            </div>
            <div className="text-right text-sm">
              <MoneyText value={l.quote.lineTotal} className="font-semibold" />
              <div className="text-xs text-muted">
                {l.quote.qty} x <MoneyText value={l.quote.unitAvg} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {sub.status === 'rejected_by_vendor' ? (
        <div className="mt-4">
          <RejectedPanel sub={sub} />
        </div>
      ) : null}

      {sub.issue ? (
        <div className="mt-4 rounded-card border border-warning/40 bg-warning/10 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-semibold">
              <MessageSquareWarning className="h-4 w-4" /> Problem: {ISSUE_LABEL[sub.issue.type]}
            </span>
            <StatusPill status={sub.issue.status} />
          </div>
          <p className="mt-1 text-muted">{sub.issue.note}</p>
          <p className="mt-1 text-muted">You asked for a {sub.issue.desired}.</p>
          {sub.issue.photos.length ? (
            <div className="mt-2 flex gap-2">
              {sub.issue.photos.map((p, i) => (
                <img key={i} src={p} alt={`Issue photo ${i + 1}`} className="h-16 w-16 rounded-input object-cover" />
              ))}
            </div>
          ) : null}
          {sub.issue.resolution ? (
            <p className="mt-2 font-medium">
              Shop decision: {sub.issue.resolution.replace('_', ' ')}
              {sub.issue.refundAmount ? <> (<MoneyText value={sub.issue.refundAmount} />)</> : null}
              {sub.issue.rejectReason ? `. "${sub.issue.rejectReason}"` : ''}
            </p>
          ) : null}
          {sub.issue.adminDecision ? <p className="mt-1 font-medium">Printloom decided: {sub.issue.adminDecision.replace('_', ' ')}</p> : null}
          {sub.status === 'issue_rejected' ? (
            <Button
              className="mt-3"
              size="sm"
              onClick={() => {
                const r = escalateIssue(sub.id);
                if (r.ok) toast.success('Escalated. Printloom support will decide within 2 working days.');
                else toast.error(r.reasons[0]);
              }}
            >
              <ShieldAlert className="h-4 w-4" /> Escalate to Printloom
            </Button>
          ) : null}
        </div>
      ) : null}

      {sub.refundAmount && ['refunded', 'cancelled_by_customer', 'partial_refund'].includes(sub.status) ? (
        <p className="mt-3 rounded-input bg-surface-2 px-3 py-2 text-sm">
          Refund of <MoneyText value={sub.refundAmount} className="font-semibold" /> issued to your original payment method.
        </p>
      ) : null}
      {sub.status === 'reassigned' && sub.reassignedTo ? <p className="mt-3 rounded-input bg-surface-2 px-3 py-2 text-sm">This package moved to another shop, see the next package below.</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {canCustomerCancel(sub.status) ? (
          <ConfirmDialog
            trigger={
              <Button variant="secondary">
                <XCircle className="h-4 w-4" /> Cancel
              </Button>
            }
            title="Cancel this package?"
            description={`${vendor?.shopName} hasn't started printing yet, so you get a full refund.`}
            confirmLabel="Cancel package"
            danger
            onConfirm={() => {
              const r = cancelSubOrder(sub.id);
              if (r.ok) toast.success('Cancelled. Your refund is on its way.');
              else toast.error(r.reasons[0]);
            }}
          />
        ) : cancelLocked ? (
          <Tip content="Printing has already started, so this order can no longer be cancelled. Report a problem after delivery if something is wrong.">
            <span tabIndex={0} className="inline-flex">
              <Button variant="secondary" disabled>
                <XCircle className="h-4 w-4" /> Cancel
              </Button>
            </span>
          </Tip>
        ) : null}
        {sub.status === 'shipped' ? (
          <Button
            variant="secondary"
            onClick={() => {
              confirmDelivery(sub.id);
              toast.success('Marked as received');
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> I got it
          </Button>
        ) : null}
        {reportable || late ? (
          <Button variant="secondary" onClick={() => setReportOpen(true)}>
            <AlertTriangle className="h-4 w-4" /> Report a problem
          </Button>
        ) : null}
        {canReview(sub.status) ? (
          sub.reviewed ? (
            <Badge tone="success" className="h-11 px-3">
              <Star className="h-3.5 w-3.5" /> Reviewed
            </Badge>
          ) : (
            <Button variant="soft" onClick={() => setReviewOpen(true)}>
              <Star className="h-4 w-4" /> Review shop
            </Button>
          )
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-3 font-display font-semibold">Timeline</h3>
          <Timeline events={sub.timeline} />
        </div>
        <div>
          <PriceBreakdown quote={sub.lines.map((l) => l.quote)} shipping={sub.shipping} split={sub.split} showSplit title="What you paid" />
        </div>
      </div>

      <ReportIssueDialog subId={sub.id} open={reportOpen} onOpenChange={setReportOpen} canReport={reportable} late={late} />
      <ReviewDialog sub={sub} open={reviewOpen} onOpenChange={setReviewOpen} />
    </section>
  );
}
