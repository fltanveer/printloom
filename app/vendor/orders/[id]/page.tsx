'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Check, CheckCircle2, MapPin, Printer, StickyNote, Truck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import { EmptyState, ListSkeleton, PageHeader, Timeline, useFakeLoading } from '@/components/shared/bits';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { PriceBreakdown } from '@/components/shared/PriceBreakdown';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { useVendor } from '@/components/vendor/useVendor';
import { RejectDialog } from '@/components/vendor/RejectDialog';
import { PrintFileExport, exportItemsFor } from '@/components/vendor/PrintFileExport';
import { orderInfo } from '@/components/vendor/orderInfo';
import { STITCH_LABEL } from '@/components/vendor/helpers';
import { colorHex, estimateInkColors, METHOD_LABEL, TIER_LABEL } from '@/lib/pricing';
import { VIEW_LABEL } from '@/lib/mockups';
import { layerDpi, DPI_COPY } from '@/lib/dpi';
import { NEXT_ORDER_STATUS, ORDER_STATUS_LABEL } from '@/lib/stateMachines';
import { relativeDay, formatDateTime } from '@/lib/dates';
import type { AppData, OrderLine } from '@/lib/types';

export default function VendorOrderDetail() {
  const loading = useFakeLoading();
  const { id } = useParams<{ id: string }>();
  const { data, vendorId } = useVendor();
  const sub = data.subOrders[id];
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const savedNote = data.vendors[vendorId]?.internalNotes?.[id] ?? '';
  const [note, setNote] = React.useState(savedNote);
  React.useEffect(() => setNote(savedNote), [savedNote]);

  if (loading) return <ListSkeleton rows={6} />;
  if (!sub || sub.vendorId !== vendorId)
    return (
      <EmptyState
        kind="search"
        title="Order not found"
        body="This order doesn't exist or belongs to another shop."
        action={
          <Button asChild>
            <Link href="/vendor/orders">Back to orders</Link>
          </Button>
        }
      />
    );

  const order = data.orders[sub.orderId];
  const info = orderInfo(data, sub);
  const next = NEXT_ORDER_STATUS[sub.status];
  const customer = data.customers[sub.customerId];

  const advance = () => {
    const r = data.advanceSubOrder(sub.id);
    if (r.ok) toast.success(`${r.message ?? 'Updated'}. The customer has been notified.`);
    else toast.error(r.reasons.join('. '));
  };

  const exportItems = sub.lines.flatMap((l, i) => {
    const p = data.products[l.customization.productId];
    return p ? exportItemsFor(p, l.customization.layers, `${info.number}-${sub.lines.length > 1 ? `line${i + 1}-` : ''}${p.category}`) : [];
  });

  return (
    <div>
      <PageHeader
        back={{ href: '/vendor/orders', label: 'Orders' }}
        title={`Order ${info.number}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusPill status={info.late ? 'delayed' : sub.status} /> Placed {formatDateTime(sub.createdAt)} by {customer?.name}
          </span>
        }
        actions={
          <>
            {sub.status === 'placed' ? (
              <>
                <Button variant="secondary" onClick={() => setRejectOpen(true)}>
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button onClick={advance}>
                  <Check className="h-4 w-4" /> Accept order
                </Button>
              </>
            ) : next && next !== 'completed' ? (
              <Button onClick={advance}>
                {next === 'shipped' ? <Truck className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />} Mark as {ORDER_STATUS_LABEL[next].toLowerCase()}
              </Button>
            ) : ['issue_reported', 'escalated', 'issue_rejected'].includes(sub.status) ? (
              <Button asChild>
                <Link href="/vendor/issues">Go to issue</Link>
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => toast.success('Packing slip sent to your printer')}>
              <Printer className="h-4 w-4" /> Packing slip
            </Button>
          </>
        }
      />

      {sub.status === 'rejected_by_vendor' ? (
        <p className="mb-4 rounded-card border border-danger/30 bg-danger/5 p-3 text-sm">You rejected this order: {sub.rejectReason}. The customer was offered other shops or a refund.</p>
      ) : null}
      {sub.status === 'delivered' ? (
        <p className="mb-4 flex items-center gap-2 rounded-card border border-success/30 bg-success/5 p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-success" /> Delivered. It completes when the customer reviews it, or automatically after 3 days. Your payout follows.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          {sub.lines.map((l, i) => (
            <LineCard key={l.id} data={data} line={l} index={i} total={sub.lines.length} />
          ))}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Print files</CardTitle>
                <p className="text-sm text-muted">Each decorated area as a transparent PNG at 300 DPI, at real print size.</p>
              </div>
            </CardHeader>
            <CardContent>
              <PrintFileExport items={exportItems} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
              <MapPin className="h-5 w-5 text-muted" />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-semibold">{order?.address.name}</div>
                <div className="text-muted">
                  {order?.address.line}, {order?.address.area}
                  <br />
                  {order?.address.city}, {order?.address.division}
                  <br />
                  {order?.address.phone}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-2">
                <div className="rounded-input bg-surface-2 p-2.5">
                  <dt className="text-xs text-muted">Ship by</dt>
                  <dd className={info.dueSoon || info.late ? 'font-semibold text-danger' : 'font-semibold'}>{relativeDay(sub.estShip)}</dd>
                </div>
                <div className="rounded-input bg-surface-2 p-2.5">
                  <dt className="text-xs text-muted">Customer expects</dt>
                  <dd className="font-semibold">{relativeDay(sub.estDelivery)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge tone="neutral">{sub.shipping.mode === 'pickup' ? 'Pickup from shop' : sub.shipping.zoneLabel}</Badge>
                <Badge tone={order?.payment.method === 'cod' ? 'warning' : 'success'}>{order?.payment.method === 'cod' ? 'Cash on delivery' : 'Paid online'}</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between rounded-card border border-accent/40 bg-accent-soft p-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-accent-text">Your payout</div>
              <div className="text-xs text-muted">After {data.settings.commissionPct}% commission, delivery included</div>
            </div>
            <MoneyText value={sub.split.vendor} className="font-display text-2xl font-bold" />
          </div>
          <PriceBreakdown quote={sub.lines.map((l) => l.quote)} shipping={sub.shipping} split={sub.split} showSplit title="Customer paid" defaultOpen />

          <Card>
            <CardHeader>
              <CardTitle>Internal notes</CardTitle>
              <StickyNote className="h-5 w-5 text-muted" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only your team sees this. For example: use the new DTF film." aria-label="Internal notes" />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={note === savedNote}
                  onClick={() => {
                    data.setInternalNote(sub.id, note);
                    toast.success('Note saved');
                  }}
                >
                  Save note
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline events={sub.timeline} />
            </CardContent>
          </Card>
        </div>
      </div>

      <RejectDialog subId={sub.id} orderNumber={info.number} open={rejectOpen} onOpenChange={setRejectOpen} />
    </div>
  );
}

function LineCard({ data, line, index, total }: { data: AppData; line: OrderLine; index: number; total: number }) {
  const product = data.products[line.customization.productId];
  const offering = data.offerings[line.offeringId];
  if (!product) return null;
  const hex = (offering && colorHex(offering, line.customization.color)) ?? '#FFFFFF';
  const layers = line.customization.layers;
  const views = product.views.filter((v) => product.printAreas.some((a) => a.view === v && layers.some((l) => l.printAreaId === a.id && !l.hidden)));
  const shownViews = views.length ? views : [product.views[0]];
  const inks = line.method === 'screen' ? line.customization.inkColors ?? estimateInkColors(line.customization, data.designs) : null;
  const dpi = layers
    .filter((l) => !l.hidden && l.kind !== 'text')
    .map((l) => {
      const d = l.designId ? data.designs[l.designId] : undefined;
      const vector = d?.files.kind === 'svg' || !!l.src?.endsWith('.svg');
      return { layer: l, ...layerDpi(l, vector), name: d?.title ?? 'Uploaded image' };
    })
    .filter((x) => x.level !== 'good');

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            {total > 1 ? `Line ${index + 1}: ` : ''}
            {product.name}
          </CardTitle>
          <p className="text-sm text-muted">
            {line.customization.color}, {METHOD_LABEL[line.method]}
            {line.rush ? ', rush' : ''}
          </p>
        </div>
        <Badge tone="accent">{line.quote.qty} pieces</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shownViews.map((v) => (
            <figure key={v} className="rounded-card bg-surface-2 p-2">
              <MockupRenderer product={product} colorHex={hex} view={v} layers={layers} />
              <figcaption className="mt-1 text-center text-xs text-muted">{VIEW_LABEL[v]}</figcaption>
            </figure>
          ))}
        </div>
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Sizes</div>
          <div className="flex flex-wrap gap-2">
            {line.quote.sizes.map((s) => (
              <span key={s.size} className="inline-flex h-10 items-center gap-2 rounded-input border border-border px-3 text-sm">
                <strong>{s.size}</strong> <span className="tabular-nums text-muted">x {s.qty}</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Print areas</div>
          <ul className="divide-y divide-border rounded-input border border-border text-sm">
            {line.quote.areas.map((a) => (
              <li key={a.areaId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="font-medium">{a.name}</span>
                <span className="text-muted">
                  {TIER_LABEL[a.tier]}
                  {inks ? `, ${inks} ink ${inks === 1 ? 'color' : 'colors'}` : ''}
                  {a.stitchBand ? `, ${STITCH_LABEL[a.stitchBand].toLowerCase()}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {dpi.length ? (
          <div className="space-y-1.5">
            {dpi.map((x) => (
              <p key={x.layer.id} className="flex items-start gap-2 rounded-input border border-warning/40 bg-warning/10 p-2.5 text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {x.name}: {x.dpi} DPI. {DPI_COPY[x.level]}.
                  {line.acceptedLowQuality ? ' The customer accepted lower print quality at checkout.' : ''}
                </span>
              </p>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" /> All artwork looks sharp at print size.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
