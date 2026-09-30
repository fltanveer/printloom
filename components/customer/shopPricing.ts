// Pure helpers for customer browsing screens. Prices always come from the pricing engine (lib/pricing.quote)
// using the same platform "from" rule as lib/selectors.fromPrice, just scoped to one offering.

import { quote, zoneFor } from '@/lib/pricing';
import { customerAddress, offeringsForProduct } from '@/lib/selectors';
import type { AppData, BaseProduct, Design, Layer, Offering, Vendor, View, ZoneKey } from '@/lib/types';

/** "from" price of one shop's offering: Light color, size M, one medium front print, standard speed, MOQ pieces. */
export function offeringFromPrice(data: AppData, offering: Offering): number | null {
  const product = data.products[offering.productId];
  const vendor = data.vendors[offering.vendorId];
  if (!product || !vendor) return null;
  const rule = data.settings.fromPrice;
  const group = offering.colorGroups.find((g) => g.name === rule.colorGroup) ?? offering.colorGroups[0];
  const color = group?.colors[0]?.name;
  if (!color) return null;
  const size = product.sizes.includes(rule.size) ? rule.size : product.sizes[0];
  const area = product.printAreas.find((a) => a.view === rule.view) ?? product.printAreas[0];
  const tier = area.sizeTiers.includes(rule.tier) ? rule.tier : area.sizeTiers[0];
  let best: number | null = null;
  for (const method of offering.methods) {
    const q = quote(
      {
        productId: product.id,
        offeringId: offering.id,
        color,
        method,
        sizeBreakdown: { [size]: Math.max(1, offering.pricing.moq) },
        rush: false,
        areas: [{ areaId: area.id, view: area.view, name: area.name, tier, widthIn: 6, heightIn: 6 }],
        royalties: [],
        inkColors: 1,
      },
      // price as if active so a paused shop still shows its usual price
      { ...offering, status: 'active' },
      { vendor: { ...vendor, status: 'active' }, product, address: null, now: new Date() },
    );
    if (q.available && (best === null || q.unitAvg < best)) best = q.unitAvg;
  }
  return best;
}

/** Fastest standard production days across active offerings of a product. */
export function minStandardDays(data: AppData, productId: string): number | null {
  let best: number | null = null;
  for (const o of offeringsForProduct(data, productId, { activeOnly: true })) {
    for (const m of o.methods) {
      const d = o.production.standardDays[m];
      if (typeof d === 'number' && (best === null || d < best)) best = d;
    }
  }
  return best;
}

export function offeringMinDays(o: Offering): number | null {
  const days = o.methods.map((m) => o.production.standardDays[m]).filter((d): d is number => typeof d === 'number');
  return days.length ? Math.min(...days) : null;
}

/** Zone of the customer's default address relative to a vendor. */
export function zoneForCustomer(data: AppData, customerId: string, vendor: Vendor): ZoneKey | null {
  const addr = customerAddress(data, customerId);
  return addr ? zoneFor(vendor.location, addr) : null;
}

/** True when at least one active offering of the product delivers to the customer's zone. */
export function shipsToCustomer(data: AppData, productId: string, customerId: string): boolean {
  return offeringsForProduct(data, productId, { activeOnly: true }).some((o) => {
    const vendor = data.vendors[o.vendorId];
    const zone = zoneForCustomer(data, customerId, vendor);
    if (!zone) return true;
    return !!o.delivery.zones.find((z) => z.zone === zone)?.served;
  });
}

const ZONE_RANK: Record<ZoneKey, number> = { same_city: 0, same_division: 1, other: 2 };
export const ZONE_LABEL: Record<ZoneKey, string> = { same_city: 'In your city', same_division: 'In your division', other: 'Ships nationwide' };

/** Vendors sorted by proximity to the customer's default address, then rating. Onboarding shops are hidden. */
export function vendorsNear(data: AppData, customerId: string): { vendor: Vendor; zone: ZoneKey | null }[] {
  return Object.values(data.vendors)
    .filter((v) => v.status !== 'onboarding')
    .map((vendor) => ({ vendor, zone: zoneForCustomer(data, customerId, vendor) }))
    .sort((a, b) => (a.zone ? ZONE_RANK[a.zone] : 3) - (b.zone ? ZONE_RANK[b.zone] : 3) || (a.vendor.status === 'paused' ? 1 : 0) - (b.vendor.status === 'paused' ? 1 : 0) || b.vendor.rating - a.vendor.rating);
}

export type ShopBadge = 'Fast' | 'Premium blanks' | 'Bulk friendly';

/** Badges derived from the shop's live offerings. */
export function vendorBadges(data: AppData, vendorId: string): ShopBadge[] {
  const offs = Object.values(data.offerings).filter((o) => o.vendorId === vendorId && o.status !== 'draft');
  const out: ShopBadge[] = [];
  const fast = offs.some((o) => (offeringMinDays(o) ?? 99) <= 2 || (o.production.rush.available && o.production.rush.days <= 1));
  const premium = offs.some((o) => o.blank.qualityTier === 'premium');
  const bulk = offs.some((o) => o.pricing.moq >= 10 || o.pricing.qtyTiers.some((t) => t.discountPct >= 25));
  if (fast) out.push('Fast');
  if (premium) out.push('Premium blanks');
  if (bulk) out.push('Bulk friendly');
  return out;
}

export function vendorOfferings(data: AppData, vendorId: string): Offering[] {
  return Object.values(data.offerings)
    .filter((o) => o.vendorId === vendorId && o.status === 'active')
    .sort((a, b) => (data.products[b.productId]?.popularity ?? 0) - (data.products[a.productId]?.popularity ?? 0));
}

/** Default mockup color for a product: first Light color any active shop stocks, else white. */
export function defaultColorHex(data: AppData, productId: string): string {
  for (const o of offeringsForProduct(data, productId, { activeOnly: true })) {
    const g = o.colorGroups.find((x) => x.name === 'Light') ?? o.colorGroups[0];
    if (g?.colors[0]) return g.colors[0].hex;
  }
  return '#FFFFFF';
}

/** Primary print view for a product (front, wrap, or back for phone cases). */
export function primaryView(product: BaseProduct): View {
  const pref: View[] = ['front', 'wrap', 'back'];
  return pref.find((v) => product.printAreas.some((a) => a.view === v)) ?? product.views[0];
}

/** A design layer sized to fit and centered in the product's primary print area (for previews only). */
export function fitDesignLayer(product: BaseProduct, design: Pick<Design, 'id' | 'files'>, view?: View, fill = 0.8): Layer | null {
  const v = view ?? primaryView(product);
  const area = product.printAreas.find((a) => a.view === v);
  if (!area) return null;
  const ratio = design.files.widthPx / Math.max(1, design.files.heightPx);
  let w = area.widthIn * fill;
  let h = w / ratio;
  if (h > area.heightIn * fill) {
    h = area.heightIn * fill;
    w = h * ratio;
  }
  // chest placement for tall apparel areas, centered otherwise
  const y = area.heightIn > area.widthIn * 1.1 ? Math.min(area.heightIn * 0.12, area.heightIn - h) : (area.heightIn - h) / 2;
  return {
    id: `preview_${design.id}_${product.id}`,
    kind: 'design',
    designId: design.id,
    src: design.files.src,
    printAreaId: area.id,
    x: (area.widthIn - w) / 2,
    y,
    widthIn: w,
    heightIn: h,
    rotation: 0,
    outOfBounds: false,
  };
}

export const CATEGORY_LABEL: Record<BaseProduct['category'], string> = {
  tshirt: 'T-shirts',
  polo: 'Polos',
  hoodie: 'Hoodies',
  jersey: 'Jerseys',
  mug: 'Mugs',
  tote: 'Totes',
  poster: 'Posters',
  phonecase: 'Phone cases',
  cap: 'Caps',
};

export const DIVISIONS = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh'] as const;
