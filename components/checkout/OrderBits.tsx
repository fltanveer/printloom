'use client';
import * as React from 'react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'framer-motion';
import { PartyPopper, Store, Truck } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Textarea } from '@/components/ui/input';
import { MoneyText } from '@/components/shared/MoneyText';
import { Avatar, EmptyState, Rating, StarInput } from '@/components/shared/bits';
import { useStore } from '@/lib/store';
import { matchForCustomization } from '@/lib/selectors';
import { relativeDay } from '@/lib/dates';
import type { SubOrder } from '@/lib/types';

export function ReviewDialog({ sub, open, onOpenChange }: { sub: SubOrder; open: boolean; onOpenChange: (o: boolean) => void }) {
  const reviewSubOrder = useStore((s) => s.reviewSubOrder);
  const vendor = useStore((s) => s.vendors[sub.vendorId]);
  const [rating, setRating] = React.useState(5);
  const [text, setText] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Review ${vendor?.shopName ?? 'the shop'}`} description="Your review helps other customers pick a shop.">
        <div className="space-y-4">
          <StarInput value={rating} onChange={setRating} />
          <Field label="How was it?" htmlFor="review-text" error={err}>
            <Textarea id="review-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Print looks sharp and it arrived a day early." />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (text.trim().length < 3) return setErr('Write a few words about your order');
                reviewSubOrder(sub.id, rating, text.trim());
                onOpenChange(false);
                toast.success('Thanks for your review');
              }}
            >
              Post review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Rejected by the shop: pre-quoted alternatives (one click reassign) or refund. */
export function RejectedPanel({ sub }: { sub: SubOrder }) {
  const data = useStore();
  const reassignSubOrder = useStore((s) => s.reassignSubOrder);
  const refundRejected = useStore((s) => s.refundRejected);
  const line = sub.lines[0];
  const match = React.useMemo(
    () => (line ? matchForCustomization(data, sub.customerId, line.customization, line.method, line.sizeBreakdown, line.rush) : null),
    [data, sub.customerId, line],
  );
  const options = (match?.options ?? []).filter((o) => o.vendor.id !== sub.vendorId);
  return (
    <div className="space-y-3 rounded-card border border-danger/30 bg-danger/5 p-4">
      <div>
        <p className="font-semibold">{data.vendors[sub.vendorId]?.shopName} couldn&apos;t take this order.</p>
        {sub.rejectReason ? <p className="text-sm text-muted">&ldquo;{sub.rejectReason}&rdquo;</p> : null}
        <p className="mt-1 text-sm text-muted">Choose another shop in one click, or get a full refund.</p>
      </div>
      {options.length ? (
        <ul className="space-y-2">
          {options.map((o) => (
            <li key={o.offering.id} className="flex flex-wrap items-center gap-3 rounded-input border border-border bg-surface p-3">
              <Avatar src={o.vendor.logo} name={o.vendor.shopName} color={o.vendor.logoColor} size={36} square />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">{o.vendor.shopName}</span>
                  {o.badges.map((b) => (
                    <Badge key={b} tone="accent">
                      {b}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                  <Rating value={o.vendor.rating} count={o.vendor.reviewCount} />
                  <span className="inline-flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> {relativeDay(o.deliveryDate)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <MoneyText value={o.quote.lineTotal} className="font-display font-bold" />
                <div className="text-xs text-muted">
                  was <MoneyText value={line.quote.lineTotal} />
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const res = reassignSubOrder(sub.id, o.offering.id);
                  if (res.ok) toast.success(`Moved to ${o.vendor.shopName}. They have your order now.`);
                  else toast.error(res.reasons[0]);
                }}
              >
                <Store className="h-4 w-4" /> Choose
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState kind="search" body="No other shop can make this exact item right now. You can get a full refund." className="py-6" />
      )}
      <Button
        variant="secondary"
        onClick={() => {
          refundRejected(sub.id);
          toast.success('Refund issued. It shows up in 3 to 5 working days.');
        }}
      >
        Get a refund of <MoneyText value={sub.total} />
      </Button>
    </div>
  );
}

/** Success sheet shown after checkout, with confetti. */
export function OrderSuccessSheet({ open, onOpenChange, orderNumber, subs, onTrack }: { open: boolean; onOpenChange: (o: boolean) => void; orderNumber: string; subs: SubOrder[]; onTrack: () => void }) {
  const vendors = useStore((s) => s.vendors);
  const reduce = useReducedMotion();
  React.useEffect(() => {
    if (!open || reduce) return;
    const colors = ['#6D4AFF', '#FF7A1A', '#FF3D8B', '#0FB5A6'];
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 }, colors, zIndex: 200 });
    const t = window.setTimeout(() => confetti({ particleCount: 60, spread: 110, origin: { y: 0.5 }, colors, zIndex: 200 }), 250);
    return () => window.clearTimeout(t);
  }, [open, reduce]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Order placed" description={`Order ${orderNumber} is confirmed. We will keep you posted.`}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-card bg-accent-soft p-4">
            <PartyPopper className="h-8 w-8 text-accent-text" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted">Order number</div>
              <div className="font-display text-2xl font-bold">{orderNumber}</div>
            </div>
          </div>
          <ul className="space-y-2">
            {subs.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-input border border-border p-3 text-sm">
                <span className="font-medium">{vendors[s.vendorId]?.shopName}</span>
                <span className="text-muted">
                  {s.shipping.mode === 'pickup' ? 'Ready ' : 'Arrives '}
                  <span className="font-semibold text-text">{relativeDay(s.shipping.mode === 'pickup' ? s.estShip : s.estDelivery)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Button size="lg" className="w-full" onClick={onTrack}>
            <Truck className="h-4 w-4" /> Track order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
