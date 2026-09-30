'use client';
import * as React from 'react';
import Link from 'next/link';
import { Heart, MapPin, Clock, Store, Sparkles, Zap, Gem, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';
import { METHOD_LABEL } from '@/lib/pricing';
import { activeVendorCount, colorUnion, fromPrice, methodUnion } from '@/lib/selectors';
import type { AppData, BaseProduct, Design, Designer, Vendor, ZoneKey } from '@/lib/types';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { MoneyText } from '@/components/shared/MoneyText';
import { Avatar, ColorDots, Rating, SafeImage, Truncate } from '@/components/shared/bits';
import { Badge } from '@/components/ui/badge';
import { Tip } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/cn';
import { defaultColorHex, minStandardDays, vendorBadges, ZONE_LABEL, type ShopBadge } from './shopPricing';

export function SectionHeader({ title, subtitle, href, linkLabel = 'See all' }: { title: string; subtitle?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="inline-flex min-h-[44px] shrink-0 items-center text-sm font-semibold text-accent-text hover:underline">
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}

/** Stat about a base product, shared by catalog cards. */
export function productStats(data: AppData, p: BaseProduct) {
  return {
    from: fromPrice(data, p.id),
    methods: methodUnion(data, p.id),
    colors: colorUnion(data, p.id),
    shops: activeVendorCount(data, p.id),
    days: minStandardDays(data, p.id),
  };
}

export function ProductCard({ product, data, className }: { product: BaseProduct; data: AppData; className?: string }) {
  const s = React.useMemo(() => productStats(data, product), [data, product]);
  const hex = s.colors[0]?.hex ?? defaultColorHex(data, product.id);
  return (
    <Link
      href={`/product/${product.id}`}
      className={cn('group flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-s1 transition-all hover:-translate-y-0.5 hover:shadow-s3 focus-visible:ring-2 focus-visible:ring-accent', className)}
    >
      <div className="relative bg-gradient-to-br from-accent-soft via-surface-2 to-surface-2 p-4">
        <MockupRenderer product={product} colorHex={hex} className="mx-auto max-w-[220px] transition-transform duration-200 group-hover:scale-[1.04]" />
        {s.days !== null && s.days <= 2 ? (
          <Badge tone="warning" className="absolute left-3 top-3">
            <Zap className="h-3 w-3" /> Fast
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 font-display text-base font-semibold leading-tight sm:text-lg">
            <Truncate text={product.name} />
          </h3>
        </div>
        <div className="text-sm">
          {s.from ? (
            <span>
              <span className="text-muted">from </span>
              <MoneyText value={s.from.price} className="font-display text-lg font-bold" />
            </span>
          ) : (
            <span className="text-muted">No shops right now</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {s.methods.slice(0, 3).map((m) => (
            <Badge key={m} tone="accent" className="text-[11px]">
              {METHOD_LABEL[m]}
            </Badge>
          ))}
          {s.methods.length > 3 ? <Badge className="text-[11px]">+{s.methods.length - 3}</Badge> : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <ColorDots colors={s.colors} max={5} />
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
            <Store className="h-3.5 w-3.5" />
            {s.shops} {s.shops === 1 ? 'shop' : 'shops'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FavoriteButton({ designId, className, withLabel }: { designId: string; className?: string; withLabel?: boolean }) {
  const customerId = useStore((s) => s.personas.customer);
  const fav = useStore((s) => s.customers[customerId]?.favorites.includes(designId) ?? false);
  const toggle = useStore((s) => s.toggleFavorite);
  const title = useStore((s) => s.designs[designId]?.title ?? 'Design');
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(customerId, designId);
    toast.success(fav ? `Removed ${title} from favorites` : `Saved ${title} to favorites`);
  };
  if (withLabel)
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={fav}
        className={cn('inline-flex h-11 items-center gap-2 rounded-input border border-border bg-surface px-4 text-sm font-semibold shadow-s1 hover:border-designer/60', fav && 'border-designer/50 text-designer', className)}
      >
        <Heart className={cn('h-4 w-4', fav && 'fill-designer text-designer')} />
        {fav ? 'Saved' : 'Save to favorites'}
      </button>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={fav}
      aria-label={fav ? `Remove ${title} from favorites` : `Save ${title} to favorites`}
      className={cn('grid h-11 w-11 place-items-center rounded-full bg-surface/90 shadow-s2 backdrop-blur transition-transform hover:scale-110', className)}
    >
      <Heart className={cn('h-5 w-5', fav ? 'fill-designer text-designer' : 'text-text')} />
    </button>
  );
}

export function DesignCard({ design, designer, className, showFav = true, masonry }: { design: Design; designer?: Designer; className?: string; showFav?: boolean; masonry?: boolean }) {
  return (
    <Link
      href={`/designs/${design.id}`}
      className={cn('group relative block overflow-hidden rounded-card border border-border bg-surface shadow-s1 transition-all hover:-translate-y-0.5 hover:shadow-s3 focus-visible:ring-2 focus-visible:ring-accent', masonry && 'mb-4 break-inside-avoid', className)}
    >
      <div className={cn('relative overflow-hidden', design.files.transparent ? 'checker' : 'bg-surface-2', masonry ? '' : 'aspect-square')}>
        <SafeImage src={design.files.src} alt={design.title} contain={design.files.transparent} className={cn('w-full transition-transform duration-300 group-hover:scale-105', masonry ? 'h-auto' : 'h-full', design.files.transparent && 'p-4')} />
        {showFav ? <FavoriteButton designId={design.id} className="absolute right-2 top-2" /> : null}
      </div>
      <div className="p-3">
        <div className="font-semibold leading-tight">
          <Truncate text={design.title} />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{designer ? `by ${designer.name}` : 'Your design'}</span>
          <span className="shrink-0 tabular-nums">{design.uses.toLocaleString()} uses</span>
        </div>
      </div>
    </Link>
  );
}

export function DesignerCard({ designer, className }: { designer: Designer; className?: string }) {
  return (
    <Link
      href={`/designer-profile/${designer.id}`}
      className={cn('group flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-s1 transition-all hover:-translate-y-0.5 hover:shadow-s3 focus-visible:ring-2 focus-visible:ring-accent', className)}
    >
      <div className="relative h-24 overflow-hidden">
        <SafeImage src={designer.cover} alt="" className="h-full w-full scale-110 blur-[1px] transition-transform duration-300 group-hover:scale-125" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="relative -mt-9 flex flex-1 flex-col px-4 pb-4">
        <Avatar src={designer.avatar} name={designer.name} size={64} className="border-4 border-surface shadow-s2" />
        <div className="mt-2 font-display text-lg font-semibold leading-tight">
          <Truncate text={designer.name} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Rating value={designer.rating} count={designer.reviewCount} />
          <span className="inline-flex items-center gap-1 text-muted">
            <Clock className="h-3.5 w-3.5" /> {designer.turnaroundDays} days
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {designer.tags.slice(0, 3).map((t) => (
            <Badge key={t} className="text-[11px]">
              {t}
            </Badge>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-3 text-sm">
          <span>
            <span className="text-muted">from </span>
            <MoneyText value={designer.startingPrice} className="font-display font-bold" />
          </span>
          {designer.acceptsRequests ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-designer">
              <Sparkles className="h-3.5 w-3.5" /> Open for requests
            </span>
          ) : (
            <span className="text-xs text-muted">Not taking requests</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export const SHOP_BADGE_ICON: Record<ShopBadge, React.ComponentType<{ className?: string }>> = { Fast: Zap, 'Premium blanks': Gem, 'Bulk friendly': Users };
const SHOP_BADGE_HINT: Record<ShopBadge, string> = {
  Fast: 'Ships in 2 working days or less, or offers next day rush',
  'Premium blanks': 'Stocks premium quality blanks',
  'Bulk friendly': 'Big discounts or minimums built for team orders',
};

export function ShopBadges({ badges, className }: { badges: ShopBadge[]; className?: string }) {
  if (!badges.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {badges.map((b) => {
        const Icon = SHOP_BADGE_ICON[b];
        return (
          <Tip key={b} content={SHOP_BADGE_HINT[b]}>
            <span tabIndex={0} className="inline-flex items-center gap-1 rounded-full bg-vendor/10 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
              <Icon className="h-3 w-3" /> {b}
            </span>
          </Tip>
        );
      })}
    </div>
  );
}

export function ShopCard({ vendor, zone, data, className }: { vendor: Vendor; zone: ZoneKey | null; data: AppData; className?: string }) {
  const badges = React.useMemo(() => vendorBadges(data, vendor.id), [data, vendor.id]);
  const paused = vendor.status === 'paused';
  return (
    <Link
      href={`/shop/${vendor.id}`}
      className={cn('group flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-s1 transition-all hover:-translate-y-0.5 hover:shadow-s3 focus-visible:ring-2 focus-visible:ring-accent', className)}
    >
      <div className="relative h-32 overflow-hidden">
        <SafeImage src={vendor.cover} alt={`${vendor.shopName} workshop`} className={cn('h-full w-full transition-transform duration-300 group-hover:scale-105', paused && 'grayscale')} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {zone ? <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-black">{ZONE_LABEL[zone]}</span> : null}
        {paused ? <span className="absolute right-3 top-3 rounded-full bg-black/80 px-2.5 py-0.5 text-xs font-semibold text-white">Temporarily closed</span> : null}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <Avatar name={vendor.shopName} src={vendor.logo} color={vendor.logoColor} size={40} square className="border-2 border-white/80" />
          <div className="font-display text-lg font-semibold leading-tight text-white drop-shadow">{vendor.shopName}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Rating value={vendor.rating} count={vendor.reviewCount} />
          <span className="inline-flex items-center gap-1 text-muted">
            <MapPin className="h-3.5 w-3.5" /> {vendor.location.city}, {vendor.location.division}
          </span>
        </div>
        <ShopBadges badges={badges} />
      </div>
    </Link>
  );
}
