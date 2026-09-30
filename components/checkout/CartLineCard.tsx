'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, Copy, Pencil, Store, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { useStore } from '@/lib/store';
import { METHOD_LABEL } from '@/lib/pricing';
import type { CartLineStatus } from '@/lib/selectors';
import { LineThumb } from './LineThumb';
import { SwitchShopDialog } from './SwitchShopDialog';
import { sizeSummary, totalQty } from './helpers';

export function CartLineCard({ status, customerId }: { status: CartLineStatus; customerId: string }) {
  const { line, quote, flags, priceChanged } = status;
  const product = useStore((s) => s.products[line.customization.productId]);
  const offering = useStore((s) => s.offerings[line.offeringId]);
  const vendor = useStore((s) => (offering ? s.vendors[offering.vendorId] : undefined));
  const designs = useStore((s) => s.designs);
  const removeCartLine = useStore((s) => s.removeCartLine);
  const duplicateCartLine = useStore((s) => s.duplicateCartLine);
  const acceptNewPrice = useStore((s) => s.acceptNewPrice);
  const removeDesignFromLine = useStore((s) => s.removeDesignFromLine);
  const money = useMoney();
  const [switchOpen, setSwitchOpen] = React.useState(false);

  const qty = totalQty(line.sizeBreakdown);
  const lineTotal = quote.available ? quote.lineTotal : line.priceSnapshot.lineTotal;
  const unit = quote.available ? quote.unitAvg : line.priceSnapshot.unitAvg;
  const needsSwitch = flags.some((f) => f.type === 'vendor_paused' || f.type === 'unavailable' || f.type === 'zone');
  const stockIssue = flags.some((f) => f.type === 'unavailable' && /left in|out of stock|No .* in /.test(f.message));
  const firstSwitch = flags.findIndex((f) => f.type === 'vendor_paused' || f.type === 'unavailable' || f.type === 'zone');
  const firstNonPrice = flags.findIndex((f) => f.type !== 'price_changed');

  const remove = () => {
    removeCartLine(customerId, line.id);
    toast.success('Removed from cart');
  };

  return (
    <div className="rounded-card border border-border bg-surface p-3 sm:p-4">
      <div className="flex gap-3 sm:gap-4">
        <LineThumb customization={line.customization} offeringId={line.offeringId} className="w-20 sm:w-24" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold" title={product?.name}>
                {product?.name ?? 'Product'}
              </h3>
              <p className="text-sm text-muted">
                {line.customization.color} · {METHOD_LABEL[line.method]}
                {line.rush ? ' · Rush' : ''}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {sizeSummary(line.sizeBreakdown)} <span className="text-muted/80">({qty} {qty === 1 ? 'piece' : 'pieces'})</span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              {priceChanged ? <MoneyText value={priceChanged.old} strike className="block text-sm" /> : null}
              <MoneyText value={lineTotal} animated className="font-display text-lg font-bold" />
              <div className="text-xs text-muted">
                <MoneyText value={unit} /> each
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/product/${line.customization.productId}?edit=${line.id}`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                duplicateCartLine(customerId, line.id);
                toast.success('Line duplicated');
              }}
            >
              <Copy className="h-4 w-4" /> Duplicate
            </Button>
            <Button variant="ghost" size="sm" onClick={remove} className="text-danger">
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      </div>

      {flags.length ? (
        <div className="mt-3 space-y-2">
          {flags.map((f, i) => (
            <div key={`${f.type}-${i}`} className="rounded-input border border-warning/40 bg-warning/10 p-3 text-sm" role="alert">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                <div className="min-w-0 flex-1">
                  {f.type === 'price_changed' && priceChanged ? (
                    <p className="font-medium">
                      {vendor?.shopName} updated their price. New total: {money(priceChanged.new)} (was {money(priceChanged.old)})
                    </p>
                  ) : (
                    <p className="font-medium">{f.message}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {f.type === 'price_changed' ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          acceptNewPrice(customerId, line.id);
                          toast.success('New price accepted');
                        }}
                      >
                        Accept new price
                      </Button>
                    ) : null}
                    {f.type === 'design_unavailable' && f.designId ? (
                      <>
                        <Button asChild size="sm" variant="secondary">
                          <Link href="/designs">Replace design</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            removeDesignFromLine(customerId, line.id, f.designId as string);
                            toast.success(`${designs[f.designId as string]?.title ?? 'Design'} removed from this item`);
                          }}
                        >
                          Remove design
                        </Button>
                      </>
                    ) : null}
                    {i === firstSwitch && needsSwitch ? (
                      <Button size="sm" onClick={() => setSwitchOpen(true)}>
                        <Store className="h-4 w-4" /> Switch shop
                      </Button>
                    ) : null}
                    {i === firstSwitch && stockIssue ? (
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/product/${line.customization.productId}?edit=${line.id}`}>Change sizes</Link>
                      </Button>
                    ) : null}
                    {i === firstNonPrice ? (
                      <Button size="sm" variant="ghost" onClick={remove}>
                        Remove item
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {!flags.length && quote.available && quote.nextTier ? (
        <p className="mt-2 text-xs font-medium text-accent-text">
          <Badge tone="accent">Tip</Badge> Add {quote.nextTier.needed} more to save {quote.nextTier.discountPct}% on every piece
        </p>
      ) : null}
      <SwitchShopDialog open={switchOpen} onOpenChange={setSwitchOpen} line={line} customerId={customerId} />
    </div>
  );
}
