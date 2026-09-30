// Pure helpers for the vendor panel. Prices always come from the pricing engine (lib/pricing).

import { quote, quoteSubOrder, SIZE_TIERS, tierForArea } from '@/lib/pricing';
import type {
  AppData,
  AreaSpec,
  AvailableQuote,
  BaseProduct,
  Division,
  Offering,
  OrderStatus,
  PriceQuote,
  PrintArea,
  PrintMethod,
  SizeTier,
  SubOrderQuote,
  Vendor,
  ZoneKey,
} from '@/lib/types';

export const DIVISIONS: Division[] = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh'];

export const ZONE_LABEL: Record<ZoneKey, string> = { same_city: 'Same city', same_division: 'Same division', other: 'Other divisions' };

export const STITCH_LABEL: Record<'upTo5k' | 'upTo10k' | 'upTo15k', string> = { upTo5k: 'Up to 5k stitches', upTo10k: 'Up to 10k stitches', upTo15k: 'Up to 15k stitches' };

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Representative artwork box for a size tier (used by the simulator). */
const TIER_BOX: Record<SizeTier, [number, number]> = { small: [4, 4], medium: [8, 10], large: [12, 16], full: [14, 18] };
const STITCH_BOX: Record<'upTo5k' | 'upTo10k' | 'upTo15k', [number, number]> = { upTo5k: [3, 3], upTo10k: [4.5, 4.5], upTo15k: [6, 6] };

export interface SimArea {
  areaId: string;
  tier: SizeTier;
  stitch: 'upTo5k' | 'upTo10k' | 'upTo15k';
}

export function areaSpecFor(product: BaseProduct, a: SimArea, method: PrintMethod): AreaSpec | null {
  const area = product.printAreas.find((x) => x.id === a.areaId);
  if (!area) return null;
  if (method === 'embroidery') {
    const [w, h] = STITCH_BOX[a.stitch];
    const ww = Math.min(w, area.widthIn);
    const hh = Math.min(h, area.heightIn);
    return { areaId: area.id, view: area.view, name: area.name, tier: tierForArea(area, ww, hh), widthIn: ww, heightIn: hh };
  }
  const [w, h] = TIER_BOX[a.tier];
  return { areaId: area.id, view: area.view, name: area.name, tier: a.tier, widthIn: Math.min(w, area.widthIn), heightIn: Math.min(h, area.heightIn) };
}

export function tiersFor(area: PrintArea): SizeTier[] {
  return SIZE_TIERS.filter((t) => area.sizeTiers.includes(t));
}

/** A synthetic address that lands in the given zone for this vendor. */
export function addressForZone(vendor: Vendor, zone: ZoneKey): { division: string; city: string } {
  if (zone === 'same_city') return { division: vendor.location.division, city: vendor.location.city };
  if (zone === 'same_division') return { division: vendor.location.division, city: `${vendor.location.division} outskirts` };
  const other = DIVISIONS.find((d) => d !== vendor.location.division) ?? 'Sylhet';
  return { division: other, city: other };
}

export interface SimConfig {
  color: string;
  sizes: Record<string, number>;
  method: PrintMethod;
  areas: SimArea[];
  inkColors: number;
  zone: ZoneKey;
  rush: boolean;
}

/** Quote a configuration on an offering as if it were live (drafts and paused offerings can be simulated). */
export function simulate(
  data: AppData,
  offering: Offering,
  vendor: Vendor,
  cfg: SimConfig,
  opts: { asLive?: boolean; address?: { division: string; city: string } } = {},
): { quote: PriceQuote; sub: SubOrderQuote | null } {
  const product = data.products[offering.productId];
  const areas = cfg.areas.map((a) => areaSpecFor(product, a, cfg.method)).filter((a): a is AreaSpec => !!a);
  const input = {
    productId: product.id,
    offeringId: offering.id,
    color: cfg.color,
    method: cfg.method,
    sizeBreakdown: cfg.sizes,
    rush: cfg.rush,
    areas,
    royalties: [],
    inkColors: cfg.inkColors,
  };
  const asLive = opts.asLive ?? true;
  const o = asLive ? { ...offering, status: 'active' as const } : offering;
  const v = asLive ? { ...vendor, status: 'active' as const } : vendor;
  const address = opts.address ?? addressForZone(vendor, cfg.zone);
  const q = quote(input, o, { vendor: v, product, address, now: new Date() });
  const sub = q.available ? quoteSubOrder(v, offering.delivery, [q], address, 'delivery', data.settings.commissionPct) : null;
  return { quote: q, sub };
}

export interface MarketPoint {
  vendorId: string;
  name: string;
  unit: number;
}

/** Other active vendors' quotes for the same configuration (per piece, from the engine). */
export function marketQuotes(data: AppData, offering: Offering, vendor: Vendor, cfg: SimConfig): MarketPoint[] {
  const address = addressForZone(vendor, cfg.zone);
  const out: MarketPoint[] = [];
  for (const o of Object.values(data.offerings)) {
    if (o.productId !== offering.productId || o.vendorId === vendor.id || o.status !== 'active') continue;
    const ov = data.vendors[o.vendorId];
    if (!ov || ov.status !== 'active') continue;
    const r = simulate(data, o, ov, cfg, { asLive: false, address });
    if (r.quote.available) out.push({ vendorId: ov.id, name: ov.shopName, unit: r.quote.unitAvg });
  }
  return out.sort((a, b) => a.unit - b.unit);
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Starting price shown in the offerings list: Light color, M (or first size), medium front, cheapest method. */
export function startingPrice(data: AppData, offering: Offering): AvailableQuote | null {
  const product = data.products[offering.productId];
  const vendor = data.vendors[offering.vendorId];
  if (!product || !vendor) return null;
  const rule = data.settings.fromPrice;
  const group = offering.colorGroups.find((g) => g.name === rule.colorGroup && g.colors.length) ?? offering.colorGroups.find((g) => g.colors.length);
  const color = group?.colors[0]?.name;
  if (!color) return null;
  const size = product.sizes.includes(rule.size) ? rule.size : product.sizes[0];
  const area = product.printAreas.find((a) => a.view === rule.view) ?? product.printAreas[0];
  const tier = area.sizeTiers.includes(rule.tier) ? rule.tier : area.sizeTiers[0];
  let best: AvailableQuote | null = null;
  for (const method of offering.methods) {
    const r = simulate(data, offering, vendor, { color, sizes: { [size]: Math.max(1, offering.pricing.moq) }, method, areas: [{ areaId: area.id, tier, stitch: 'upTo5k' }], inkColors: 1, zone: 'same_city', rush: false });
    if (r.quote.available && (!best || r.quote.unitAvg < best.unitAvg)) best = r.quote;
  }
  return best;
}

export function sizesRange(offering: Offering, product: BaseProduct): string {
  const enabled = product.sizes.filter((s) => offering.variants.some((v) => v.size === s && v.enabled));
  if (!enabled.length) return 'None';
  if (enabled.length === 1) return enabled[0];
  return `${enabled[0]} to ${enabled[enabled.length - 1]}`;
}

export function lowStock(offering: Offering, limit = 10) {
  return offering.variants.filter((v) => v.enabled && v.stock !== 'unlimited' && v.stock <= limit);
}

// ---------- validation (section 7.12) ----------

export interface Validation {
  errors: string[];
}

export function validateOffering(o: Offering, publishing: boolean): Validation {
  const errors: string[] = [];
  const p = o.pricing;
  if (!(p.basePrice > 0)) errors.push('Base price must be above 0');
  const neg = (v: number | undefined) => typeof v === 'number' && v < 0;
  if (Object.values(p.sizeUpcharge).some(neg)) errors.push('Size upcharges cannot be negative');
  if (Object.values(p.colorGroupUpcharge).some(neg)) errors.push('Color group upcharges cannot be negative');
  let negPrint = false;
  for (const views of Object.values(p.printTable)) for (const tiers of Object.values(views ?? {})) for (const v of Object.values(tiers ?? {})) if (neg(v)) negPrint = true;
  if (negPrint) errors.push('Print prices cannot be negative');
  if ([p.darkGarmentPrintUpcharge, p.extraAreaFee, p.screen.perInkColor, p.screen.setupFeePerScreen, p.embroidery.upTo5k, p.embroidery.upTo10k, p.embroidery.upTo15k, p.embroidery.digitizingFee].some(neg))
    errors.push('Fees and upcharges cannot be negative');
  if (p.moq < 1) errors.push('Minimum order must be at least 1');
  for (let i = 0; i < p.qtyTiers.length; i++) {
    const t = p.qtyTiers[i];
    if (t.discountPct < 0 || t.discountPct > 60) {
      errors.push('Quantity discounts must be between 0 and 60%');
      break;
    }
    if (t.minQty < 1) {
      errors.push('Quantity tiers start at 1 piece or more');
      break;
    }
    if (i > 0 && t.minQty <= p.qtyTiers[i - 1].minQty) {
      errors.push('Quantity tiers must be strictly increasing');
      break;
    }
  }
  const pr = o.production;
  if (pr.rush.available) {
    const std = o.methods.map((m) => pr.standardDays[m] ?? 4);
    const min = std.length ? Math.min(...std) : 0;
    if (pr.rush.days >= min) errors.push(`Rush days must be fewer than standard days (${min})`);
    if (pr.rush.feePct < 0) errors.push('Rush fee cannot be negative');
  }
  if (pr.dailyCapacity < 1) errors.push('Daily capacity must be at least 1');
  if (o.methods.some((m) => (pr.standardDays[m] ?? 0) < 1)) errors.push('Standard days must be at least 1 for every method');
  if (o.delivery.zones.some((z) => z.fee < 0 || z.days < 0) || o.delivery.perExtraItemFee < 0) errors.push('Delivery fees cannot be negative');
  for (const pm of p.promotions) {
    if (!pm.name.trim()) errors.push('Every promotion needs a name');
    if (pm.value <= 0 || (pm.type === 'percent' && pm.value > 90)) errors.push(`${pm.name || 'Promotion'}: value must be above 0${pm.type === 'percent' ? ' and at most 90%' : ''}`);
    if (new Date(pm.endsAt).getTime() <= new Date(pm.startsAt).getTime()) errors.push(`${pm.name || 'Promotion'}: end date must be after start date`);
  }
  if (publishing) {
    if (!o.variants.some((v) => v.enabled)) errors.push('Enable at least one color and size before going live');
    if (!o.methods.length) errors.push('Pick at least one print method before going live');
  }
  return { errors: [...new Set(errors)] };
}

// ---------- orders ----------

export type OrderTab = 'new' | 'production' | 'ready' | 'shipped' | 'completed' | 'issues';

export const ORDER_TABS: { key: OrderTab; label: string; statuses: OrderStatus[] }[] = [
  { key: 'new', label: 'New', statuses: ['placed'] },
  { key: 'production', label: 'In production', statuses: ['accepted', 'in_production', 'reprint'] },
  { key: 'ready', label: 'Ready to ship', statuses: ['quality_check'] },
  { key: 'shipped', label: 'Shipped', statuses: ['shipped', 'delivered'] },
  { key: 'completed', label: 'Completed', statuses: ['completed', 'refunded', 'partial_refund', 'cancelled_by_customer', 'rejected_by_vendor', 'reassigned'] },
  { key: 'issues', label: 'Issues', statuses: ['issue_reported', 'escalated', 'issue_rejected'] },
];

export const KANBAN_COLUMNS: OrderStatus[] = ['placed', 'accepted', 'in_production', 'quality_check', 'shipped', 'delivered'];

export const REJECT_REASONS = ['Out of this blank or color', 'Fully booked this week', 'Artwork cannot be printed well', 'Delivery area not served'];

export const ISSUE_LABEL: Record<string, string> = { damaged: 'Damaged', wrong_item: 'Wrong item', print_quality: 'Print quality', late: 'Late delivery' };
