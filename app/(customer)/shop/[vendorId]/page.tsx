'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CalendarDays, Clock, MapPin, MessageSquareReply, PauseCircle, Truck, Paintbrush, ShieldCheck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { METHOD_LABEL } from '@/lib/pricing';
import { WEEKDAYS, formatDate } from '@/lib/dates';
import type { AppData, Offering } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/misc';
import { cn } from '@/components/ui/cn';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { MoneyText } from '@/components/shared/MoneyText';
import { Ago, Avatar, ColorDots, EmptyState, GridSkeleton, Rating, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { ShopBadges } from '@/components/customer/cards';
import { offeringFromPrice, offeringMinDays, vendorBadges, vendorOfferings, zoneForCustomer, ZONE_LABEL } from '@/components/customer/shopPricing';

const TIER_TONE = { basic: 'neutral', standard: 'info', premium: 'warning' } as const;

export default function ShopPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const data = useStore();
  const customerId = data.personas.customer;
  const loading = useFakeLoading();
  const vendor = data.vendors[vendorId];

  if (!vendor || vendor.status === 'onboarding')
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState kind="box" title="Shop not found" body={vendor ? `${vendor.shopName} is still setting up. Check back soon.` : 'This shop does not exist on Printloom.'} action={<Button asChild><Link href="/catalog">Browse products</Link></Button>} />
      </div>
    );

  const paused = vendor.status === 'paused';
  const badges = vendorBadges(data, vendor.id);
  const offerings = vendorOfferings(data, vendor.id);
  const reviews = data.reviews.filter((r) => r.target === 'vendor' && r.targetId === vendor.id).sort((a, b) => b.at.localeCompare(a.at));
  const zone = zoneForCustomer(data, customerId, vendor);

  return (
    <div className="pb-12">
      <div className="relative h-48 overflow-hidden sm:h-64">
        <SafeImage src={vendor.cover} alt={`${vendor.shopName} workshop`} className={cn('h-full w-full object-cover', paused && 'grayscale')} />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
      </div>
      <div className="mx-auto max-w-7xl px-4">
        <div className="relative -mt-14 flex flex-col gap-4 sm:flex-row sm:items-end">
          <Avatar name={vendor.shopName} src={vendor.logo} color={vendor.logoColor} size={104} square className="rounded-card border-4 border-bg shadow-s3" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{vendor.shopName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <Rating value={vendor.rating} count={vendor.reviewCount} size="md" />
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {vendor.location.city}, {vendor.location.division}
              </span>
              {zone ? <Badge tone="accent">{ZONE_LABEL[zone]}</Badge> : null}
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-success" /> {vendor.onTimeRate}% on time
              </span>
            </div>
            <ShopBadges badges={badges} className="mt-2" />
          </div>
        </div>

        {paused ? (
          <div role="status" className="mt-6 flex items-start gap-3 rounded-card border border-warning/40 bg-warning/10 p-4">
            <PauseCircle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
            <div>
              <div className="font-display text-lg font-semibold">Temporarily closed</div>
              <p className="text-sm text-muted">{vendor.pausedMessage || `${vendor.shopName} is not taking new orders right now.`} You can still browse, or compare other shops for the same product.</p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-10">
            <section>
              <h2 className="mb-4 font-display text-xl font-bold">Products from this shop</h2>
              {loading ? (
                <GridSkeleton items={4} className="md:grid-cols-2 lg:grid-cols-2" />
              ) : offerings.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {offerings.map((o) => (
                    <OfferingCard key={o.id} data={data} offering={o} paused={paused} />
                  ))}
                </div>
              ) : (
                <EmptyState kind="shirt" body="This shop has no products live right now." action={<Button asChild><Link href="/catalog">Browse all products</Link></Button>} />
              )}
            </section>

            <section>
              <h2 className="mb-4 font-display text-xl font-bold">Reviews ({reviews.length})</h2>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : reviews.length ? (
                <ul className="space-y-3">
                  {reviews.map((r) => {
                    const c = data.customers[r.customerId];
                    return (
                      <li key={r.id} className="rounded-card border border-border bg-surface p-4 shadow-s1">
                        <div className="flex items-center gap-3">
                          <Avatar name={c?.name ?? 'Customer'} src={c?.avatar} size={36} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">{c?.name ?? 'Customer'}</div>
                            <div className="text-xs text-muted">
                              <Ago at={r.at} />
                            </div>
                          </div>
                          <Rating value={r.rating} />
                        </div>
                        <p className="mt-2 text-sm">{r.text}</p>
                        {r.reply ? (
                          <div className="mt-3 rounded-input border-l-4 border-vendor bg-surface-2 p-3 text-sm">
                            <div className="mb-0.5 inline-flex items-center gap-1 text-xs font-semibold text-muted">
                              <MessageSquareReply className="h-3.5 w-3.5" /> Reply from {vendor.shopName}
                            </div>
                            <p>{r.reply}</p>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState kind="inbox" body="No reviews yet." />
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-card border border-border bg-surface p-5 shadow-s1 lg:sticky lg:top-32">
              <h2 className="font-display text-lg font-semibold">About the shop</h2>
              <p className="mt-2 text-sm text-muted">{vendor.about}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="inline-flex items-center gap-1.5 text-muted">
                    <CalendarDays className="h-4 w-4" /> Weekly day off
                  </dt>
                  <dd className="font-medium">{WEEKDAYS[vendor.weeklyOffDay]}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="inline-flex items-center gap-1.5 text-muted">
                    <Clock className="h-4 w-4" /> On Printloom since
                  </dt>
                  <dd className="font-medium">{formatDate(vendor.joinedAt, { month: 'short', year: 'numeric' })}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function OfferingCard({ data, offering: o, paused }: { data: AppData; offering: Offering; paused: boolean }) {
  const product = data.products[o.productId];
  const price = React.useMemo(() => offeringFromPrice(data, o), [data, o]);
  if (!product) return null;
  const colors = o.colorGroups.flatMap((g) => g.colors).filter((c) => o.variants.some((v) => v.color === c.name && v.enabled));
  const light = o.colorGroups.find((g) => g.name === 'Light')?.colors[0] ?? colors[0];
  const days = offeringMinDays(o);
  const zones = o.delivery.zones.filter((z) => z.served).length;
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-s1 transition-shadow hover:shadow-s2">
      <div className="flex gap-3 p-4">
        <div className="w-28 shrink-0 rounded-input bg-gradient-to-br from-accent-soft to-surface-2 p-2">
          <MockupRenderer product={product} colorHex={light?.hex ?? '#FFFFFF'} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-semibold">{product.name}</h3>
          <div className="text-sm">
            {price !== null ? (
              <>
                <span className="text-muted">from </span>
                <MoneyText value={price} className="font-display text-lg font-bold" />
              </>
            ) : (
              <span className="text-muted">Price on request</span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge tone={TIER_TONE[o.blank.qualityTier]} className="capitalize">
              {o.blank.qualityTier}
            </Badge>
            {o.blank.gsm > 0 ? <Badge>{o.blank.gsm} GSM</Badge> : null}
            <Badge className="max-w-[140px] truncate" title={o.blank.fabric}>
              {o.blank.fabric}
            </Badge>
          </div>
        </div>
      </div>
      <div className="space-y-2 border-t border-border px-4 py-3 text-sm">
        <div className="flex flex-wrap gap-1">
          {o.methods.map((m) => (
            <Badge key={m} tone="accent">
              {METHOD_LABEL[m]}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <ColorDots colors={colors} max={6} />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {days ?? '?'} days to print
          </span>
          <span className="inline-flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" /> {zones === 3 ? 'Nationwide' : 'Local only'}
          </span>
          {o.pricing.moq > 1 ? <Badge tone="warning">Minimum {o.pricing.moq} pieces</Badge> : <span>No minimum</span>}
        </div>
      </div>
      <div className="mt-auto p-4 pt-0">
        {paused ? (
          <Button className="w-full" disabled>
            Shop is temporarily closed
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href={`/product/${product.id}?vendor=${o.vendorId}`}>
              <Paintbrush className="h-4 w-4" /> Design with this shop
            </Link>
          </Button>
        )}
        {paused ? (
          <Link href={`/product/${product.id}`} className="mt-2 block text-center text-sm font-semibold text-accent-text hover:underline">
            Compare other shops →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
