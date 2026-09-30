'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Store, Truck } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoneyText } from '@/components/shared/MoneyText';
import { Avatar, EmptyState, Rating } from '@/components/shared/bits';
import { useStore } from '@/lib/store';
import { matchForCustomization } from '@/lib/selectors';
import { relativeDay } from '@/lib/dates';
import type { CartLine } from '@/lib/types';

/** Lists other shops that can make this exact line, with exact prices, and switches the line in one click. */
export function SwitchShopDialog({ open, onOpenChange, line, customerId }: { open: boolean; onOpenChange: (o: boolean) => void; line: CartLine; customerId: string }) {
  const data = useStore();
  const switchLineOffering = useStore((s) => s.switchLineOffering);
  const removeCartLine = useStore((s) => s.removeCartLine);
  const current = data.offerings[line.offeringId];

  const match = React.useMemo(
    () => (open ? matchForCustomization(data, customerId, line.customization, line.method, line.sizeBreakdown, line.rush) : null),
    [open, data, customerId, line],
  );
  const options = (match?.options ?? []).filter((o) => o.offering.id !== line.offeringId);
  const unavailable = (match?.unavailable ?? []).filter((u) => u.vendor.id !== current?.vendorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Switch shop" description="Same design, same sizes. Prices below are exact for this line.">
        {options.length === 0 ? (
          <EmptyState
            kind="search"
            body="No other shop can make this line right now. Try editing sizes or color, or remove it."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  removeCartLine(customerId, line.id);
                  onOpenChange(false);
                  toast.success('Removed from cart');
                }}
              >
                Remove line
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {options.map((o) => (
              <li key={o.offering.id} className="rounded-card border border-border p-3">
                <div className="flex items-start gap-3">
                  <Avatar src={o.vendor.logo} name={o.vendor.shopName} color={o.vendor.logoColor} size={40} square />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold">{o.vendor.shopName}</span>
                      {o.badges.map((b) => (
                        <Badge key={b} tone={b === 'Recommended' ? 'solid' : 'accent'}>
                          {b}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <Rating value={o.vendor.rating} count={o.vendor.reviewCount} />
                      <span className="inline-flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" /> {relativeDay(o.deliveryDate)}
                      </span>
                    </div>
                    {o.reason ? <p className="mt-1 text-xs text-muted">{o.reason}</p> : null}
                  </div>
                  <div className="text-right">
                    <MoneyText value={o.quote.lineTotal} className="font-display text-lg font-bold" />
                    <div className="text-xs text-muted">
                      <MoneyText value={o.quote.unitAvg} /> each
                    </div>
                  </div>
                </div>
                <Button
                  className="mt-3 w-full"
                  size="sm"
                  onClick={() => {
                    switchLineOffering(customerId, line.id, o.offering.id);
                    onOpenChange(false);
                    toast.success(`Switched to ${o.vendor.shopName}`);
                  }}
                >
                  <Store className="h-4 w-4" /> Switch to {o.vendor.shopName}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {unavailable.length ? (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Can&apos;t make this</div>
            <ul className="space-y-1.5">
              {unavailable.map((u) => (
                <li key={u.vendor.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="font-medium text-muted">{u.vendor.shopName}</span>
                  <span className="text-right text-xs text-muted">{u.reasons[0]}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
