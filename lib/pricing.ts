// The single pricing engine. Every price shown anywhere in the app comes from here.

import { addWorkingDays, addDays, productionStart } from './dates';
import { round2, roundTo5 } from './money';
import type {
  AreaCost,
  AreaSpec,
  AvailableQuote,
  BaseProduct,
  ColorGroup,
  Customization,
  DeliveryRules,
  Design,
  Location,
  Offering,
  PrintArea,
  PrintMethod,
  PriceQuote,
  QtyTier,
  QuoteInput,
  RoyaltyItem,
  ShippingQuote,
  SizeQuote,
  SizeTier,
  Split,
  SubOrderQuote,
  Variant,
  Vendor,
  ZoneKey,
} from './types';

export const SIZE_TIERS: SizeTier[] = ['small', 'medium', 'large', 'full'];

export const TIER_LABEL: Record<SizeTier, string> = {
  small: 'Small print',
  medium: 'Medium print',
  large: 'Large print',
  full: 'Full print',
};

export const TIER_RULE: Record<SizeTier, string> = {
  small: 'up to 4 x 4 in (logo, pocket)',
  medium: 'up to 8 x 10 in (A4-ish)',
  large: 'up to 12 x 16 in (A3-ish)',
  full: 'beyond 12 x 16 in, or all-over',
};

export const METHOD_LABEL: Record<PrintMethod, string> = {
  DTG: 'DTG',
  DTF: 'DTF',
  screen: 'Screen print',
  sublimation: 'Sublimation',
  embroidery: 'Embroidery',
  UV: 'UV print',
};

/** Label for use inside a sentence: acronyms stay upper case. */
export function methodInline(m: PrintMethod): string {
  return m === 'DTG' || m === 'DTF' || m === 'UV' ? METHOD_LABEL[m] : METHOD_LABEL[m].toLowerCase();
}

export const METHOD_HINT: Record<PrintMethod, string> = {
  DTG: 'Ink printed straight into the fabric. Soft feel, great for photos.',
  DTF: 'Printed film heat-pressed on. Vivid on any color, very durable.',
  screen: 'Classic ink screens. Cheapest for 20+ pieces with few colors.',
  sublimation: 'Dye becomes part of light polyester. Never cracks or fades.',
  embroidery: 'Stitched thread. Premium look for logos and small art.',
  UV: 'Hard-surface print for mugs, cases and posters.',
};

const DARK_GROUP = 'Dark';

// ---------- small helpers ----------

export function colorGroupOf(offering: Offering, color: string): ColorGroup | undefined {
  return offering.colorGroups.find((g) => g.colors.some((c) => c.name === color));
}

export function colorHex(offering: Offering, color: string): string | undefined {
  for (const g of offering.colorGroups) {
    const c = g.colors.find((x) => x.name === color);
    if (c) return c.hex;
  }
  return undefined;
}

export function findVariant(offering: Offering, color: string, size: string): Variant | undefined {
  return offering.variants.find((v) => v.color === color && v.size === size);
}

/** Size tier of an artwork bounding box (orientation agnostic). */
export function tierForSize(widthIn: number, heightIn: number): SizeTier {
  const lo = Math.min(widthIn, heightIn);
  const hi = Math.max(widthIn, heightIn);
  if (hi <= 4.001) return 'small';
  if (lo <= 8.001 && hi <= 10.001) return 'medium';
  if (lo <= 12.001 && hi <= 16.001) return 'large';
  return 'full';
}

/** Pick the tier allowed by the print area, never smaller than the artwork needs. */
export function tierForArea(area: PrintArea, widthIn: number, heightIn: number): SizeTier {
  const need = SIZE_TIERS.indexOf(tierForSize(widthIn, heightIn));
  const allowed = area.sizeTiers.map((t) => SIZE_TIERS.indexOf(t)).sort((a, b) => a - b);
  const pick = allowed.find((i) => i >= need) ?? allowed[allowed.length - 1];
  return SIZE_TIERS[pick];
}

export function garmentPrice(offering: Offering, variant: Variant): { price: number; sizeUp: number; colorUp: number; overridden: boolean } {
  if (variant.priceOverride !== undefined && variant.priceOverride !== null) {
    return { price: variant.priceOverride, sizeUp: 0, colorUp: 0, overridden: true };
  }
  const group = colorGroupOf(offering, variant.color);
  const sizeUp = offering.pricing.sizeUpcharge[variant.size] ?? 0;
  const colorUp = group ? offering.pricing.colorGroupUpcharge[group.name] ?? 0 : 0;
  return { price: offering.pricing.basePrice + sizeUp + colorUp, sizeUp, colorUp, overridden: false };
}

export function stitchBandFor(widthIn: number, heightIn: number): { stitches: number; band: 'upTo5k' | 'upTo10k' | 'upTo15k' | null } {
  const stitches = Math.round(widthIn * heightIn * 400);
  if (stitches <= 5000) return { stitches, band: 'upTo5k' };
  if (stitches <= 10000) return { stitches, band: 'upTo10k' };
  if (stitches <= 15000) return { stitches, band: 'upTo15k' };
  return { stitches, band: null };
}

export function tierFor(tiers: QtyTier[], qty: number): QtyTier | null {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let hit: QtyTier | null = null;
  for (const t of sorted) if (qty >= t.minQty) hit = t;
  return hit;
}

export function nextTierFor(tiers: QtyTier[], qty: number): (QtyTier & { needed: number }) | null {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  const current = tierFor(tiers, qty);
  const next = sorted.find((t) => t.minQty > qty && t.discountPct > (current?.discountPct ?? 0));
  return next ? { ...next, needed: next.minQty - qty } : null;
}

export function zoneFor(vendorLoc: Location, addr: { division: string; city: string }): ZoneKey {
  if (vendorLoc.city.toLowerCase() === addr.city.toLowerCase()) return 'same_city';
  if (vendorLoc.division === addr.division) return 'same_division';
  return 'other';
}

function isPromoLive(p: { active: boolean; startsAt: string; endsAt: string }, now: Date): boolean {
  if (!p.active) return false;
  const t = now.getTime();
  return t >= new Date(p.startsAt).getTime() && t <= new Date(p.endsAt).getTime();
}

// ---------- the quote function ----------

export interface QuoteContext {
  vendor: Vendor;
  product: BaseProduct;
  address: { division: string; city: string } | null;
  now: Date;
}

export function quote(input: QuoteInput, offering: Offering, ctx: QuoteContext): PriceQuote {
  const { vendor, product, address, now } = ctx;
  const reasons: string[] = [];
  const unavailable = (): PriceQuote => ({ available: false, offeringId: offering.id, vendorId: vendor.id, reasons });

  // 1. availability
  if (vendor.status !== 'active') reasons.push('Temporarily closed');
  if (offering.status !== 'active') reasons.push(`Not taking ${product.name.toLowerCase()} orders right now`);

  const group = colorGroupOf(offering, input.color);
  if (!group) reasons.push(`No ${input.color}`);

  const entries = Object.entries(input.sizeBreakdown).filter(([, q]) => q > 0);
  const qty = entries.reduce((s, [, q]) => s + q, 0);
  if (qty === 0) reasons.push('Pick at least one size');

  if (group) {
    for (const [size, q] of entries) {
      const v = findVariant(offering, input.color, size);
      if (!v || !v.enabled) reasons.push(`No ${size} in ${input.color}`);
      else if (v.stock !== 'unlimited' && v.stock < q) {
        reasons.push(v.stock === 0 ? `${input.color} / ${size} is out of stock` : `Only ${v.stock} left in ${input.color} / ${size} at this shop`);
      }
    }
  }

  if (!offering.methods.includes(input.method) || !product.allowedMethods.includes(input.method)) {
    reasons.push(`No ${methodInline(input.method)}`);
  } else if (input.method === 'sublimation') {
    if (group && group.name !== 'Light') reasons.push('Sublimation only works on light colors');
    else if (!/poly/i.test(offering.blank.fabric)) reasons.push('Sublimation needs a polyester blank');
  }

  const pricing = offering.pricing;
  if (qty > 0 && qty < pricing.moq) reasons.push(`Minimum ${pricing.moq} pieces`);

  if (input.rush && !offering.production.rush.available) reasons.push('No rush orders');

  let zoneDays = 0;
  if (address) {
    const zk = zoneFor(vendor.location, address);
    const zone = offering.delivery.zones.find((z) => z.zone === zk);
    if (!zone || !zone.served) {
      if (!offering.delivery.pickupAvailable || zk !== 'same_city') reasons.push(`Doesn't deliver to ${address.city} yet`);
    } else zoneDays = zone.days;
  }

  // 3. print cost per decorated area (computed before the reason check so area reasons are collected too)
  const isDark = group?.name === DARK_GROUP;
  const areaCosts: AreaCost[] = [];
  const oneTimeFees: { label: string; amount: number }[] = [];
  const methodTable = pricing.printTable[input.method];
  input.areas.forEach((a: AreaSpec, idx: number) => {
    const viewTable = methodTable?.[a.view];
    let tier = a.tier;
    let base = viewTable?.[tier];
    if (base === undefined && viewTable) {
      // fall back to the next larger tier the vendor prices
      const larger = SIZE_TIERS.slice(SIZE_TIERS.indexOf(tier) + 1).find((t) => viewTable[t] !== undefined);
      if (larger) {
        tier = larger;
        base = viewTable[larger];
      }
    }
    if (base === undefined) {
      if (offering.methods.includes(input.method)) reasons.push(`No ${a.name.toLowerCase()} print with ${methodInline(input.method)}`);
      return;
    }
    const darkUpcharge = isDark && (input.method === 'DTG' || input.method === 'DTF') ? pricing.darkGarmentPrintUpcharge : 0;
    const inkCost = input.method === 'screen' ? pricing.screen.perInkColor * input.inkColors : 0;
    let stitchCost = 0;
    let stitchBand: AreaCost['stitchBand'];
    if (input.method === 'embroidery') {
      const sb = stitchBandFor(a.widthIn, a.heightIn);
      if (!sb.band) reasons.push('Embroidery too large here. Keep it under 15k stitches');
      else {
        stitchBand = sb.band;
        stitchCost = pricing.embroidery[sb.band];
      }
    }
    const extraAreaFee = idx > 0 ? pricing.extraAreaFee : 0;
    areaCosts.push({
      areaId: a.areaId,
      view: a.view,
      name: a.name,
      tier,
      base,
      darkUpcharge,
      inkCost,
      stitchCost,
      stitchBand,
      extraAreaFee,
      total: base + darkUpcharge + inkCost + stitchCost + extraAreaFee,
    });
    if (input.method === 'screen') {
      oneTimeFees.push({ label: `Screen setup, ${a.name} (${input.inkColors} ${input.inkColors === 1 ? 'screen' : 'screens'})`, amount: pricing.screen.setupFeePerScreen * input.inkColors });
    }
    if (input.method === 'embroidery') {
      oneTimeFees.push({ label: `Digitizing, ${a.name}`, amount: pricing.embroidery.digitizingFee });
    }
  });

  if (reasons.length) return unavailable();

  const printPerUnit = areaCosts.reduce((s, a) => s + a.total, 0);
  const tier = tierFor(pricing.qtyTiers, qty);
  const nextTier = nextTierFor(pricing.qtyTiers, qty);
  const tierPct = tier?.discountPct ?? 0;
  const rushPct = input.rush ? offering.production.rush.feePct : 0;
  const royaltyPerUnit = input.royalties.reduce((s, r) => s + r.amount, 0);

  // 2 + 4 + 5 per size
  const base = entries.map(([size, q]) => {
    const v = findVariant(offering, input.color, size) as Variant;
    const g = garmentPrice(offering, v);
    const unitBeforeDiscount = g.price + printPerUnit;
    const tierDiscount = (unitBeforeDiscount * tierPct) / 100;
    return { size, q, g, unitBeforeDiscount, tierDiscount, afterTier: unitBeforeDiscount - tierDiscount };
  });

  // 6. best single promotion (no stacking)
  const promos = pricing.promotions.filter(
    (p) => isPromoLive(p, now) && (p.appliesTo === 'all' || p.appliesTo.includes(offering.id)) && qty >= (p.minQty ?? 0),
  );
  let best: { id: string; name: string; perSize: number[]; total: number } | null = null;
  for (const p of promos) {
    const perSize = base.map((b) => Math.min(b.afterTier, p.type === 'percent' ? (b.afterTier * p.value) / 100 : p.value));
    const total = perSize.reduce((s, x, i) => s + x * base[i].q, 0);
    if (!best || total > best.total) best = { id: p.id, name: p.name, perSize, total };
  }

  const sizes: SizeQuote[] = base.map((b, i) => {
    const promoDiscount = best ? best.perSize[i] : 0;
    const afterPromo = b.afterTier - promoDiscount;
    const rushFee = (afterPromo * rushPct) / 100; // 7
    const unitRaw = afterPromo + rushFee + royaltyPerUnit; // 8
    const unit = roundTo5(unitRaw); // 9
    return {
      size: b.size,
      qty: b.q,
      garment: b.g.price,
      garmentOverridden: b.g.overridden,
      sizeUpcharge: b.g.sizeUp,
      colorUpcharge: b.g.colorUp,
      print: printPerUnit,
      unitBeforeDiscount: b.unitBeforeDiscount,
      tierDiscount: round2(b.tierDiscount),
      promoDiscount: round2(promoDiscount),
      rushFee: round2(rushFee),
      royalty: royaltyPerUnit,
      unitRaw: round2(unitRaw),
      unit,
      total: unit * b.q,
    };
  });

  // 10. line total
  const oneTimeTotal = oneTimeFees.reduce((s, f) => s + f.amount, 0);
  const unitsTotal = sizes.reduce((s, x) => s + x.total, 0);
  const lineTotal = unitsTotal + oneTimeTotal;
  const royaltyTotal = royaltyPerUnit * qty;
  const productionDays = input.rush ? offering.production.rush.days : offering.production.standardDays[input.method] ?? 4;

  const warnings: string[] = [];
  if (input.method === 'screen' && input.inkColors > 6) warnings.push('Many ink colors. DTF may be cheaper for this design.');

  return {
    available: true,
    offeringId: offering.id,
    vendorId: vendor.id,
    method: input.method,
    color: input.color,
    colorGroup: group?.name ?? '',
    qty,
    basePrice: pricing.basePrice,
    sizes,
    areas: areaCosts,
    printPerUnit,
    tier: tier && tier.discountPct > 0 ? tier : null,
    nextTier,
    promotion: best ? { id: best.id, name: best.name, perUnit: round2(best.total / qty) } : null,
    rushPct,
    royaltyPerUnit,
    royalties: input.royalties,
    royaltyTotal,
    oneTimeFees,
    oneTimeTotal,
    lineTotal,
    unitAvg: qty ? round2(unitsTotal / qty) : 0,
    commissionBase: unitsTotal - royaltyTotal,
    productionDays: productionDays + (zoneDays ? 0 : 0),
    offeringVersion: offering.version,
    warnings,
  };
}

// ---------- shipping, sub-order totals and split ----------

export function quoteShipping(
  delivery: DeliveryRules,
  vendorLoc: Location,
  address: { division: string; city: string } | null,
  itemsTotal: number,
  qty: number,
  mode: 'delivery' | 'pickup' = 'delivery',
): ShippingQuote {
  if (mode === 'pickup') {
    return { mode, zone: null, zoneLabel: 'Pickup from shop', served: delivery.pickupAvailable, baseFee: 0, extraItemsFee: 0, freeApplied: false, fee: 0, remainingForFree: null, days: 0 };
  }
  const zk = address ? zoneFor(vendorLoc, address) : 'same_city';
  const zone = delivery.zones.find((z) => z.zone === zk);
  const served = !!zone && zone.served;
  const baseFee = zone?.fee ?? 0;
  const extraItemsFee = Math.max(0, qty - 1) * delivery.perExtraItemFee;
  const threshold = delivery.freeShippingThreshold;
  const freeApplied = threshold !== null && itemsTotal >= threshold;
  return {
    mode,
    zone: zk,
    zoneLabel: zone?.label ?? 'Unknown zone',
    served,
    baseFee,
    extraItemsFee,
    freeApplied,
    fee: freeApplied ? 0 : baseFee + extraItemsFee,
    remainingForFree: threshold !== null && !freeApplied ? threshold - itemsTotal : null,
    days: zone?.days ?? 0,
  };
}

export function splitFor(lines: AvailableQuote[], shippingFee: number, commissionPct: number): Split {
  const byDesigner = new Map<string, number>();
  let commissionBase = 0;
  let oneTime = 0;
  for (const l of lines) {
    for (const r of l.royalties) byDesigner.set(r.designerId, (byDesigner.get(r.designerId) ?? 0) + r.amount * l.qty);
    commissionBase += l.commissionBase;
    oneTime += l.oneTimeTotal;
  }
  const platform = round2((commissionBase * commissionPct) / 100);
  return {
    designers: [...byDesigner.entries()].map(([designerId, amount]) => ({ designerId, amount })),
    platform,
    vendor: round2(commissionBase + oneTime + shippingFee - platform),
  };
}

export function quoteSubOrder(
  vendor: Vendor,
  delivery: DeliveryRules,
  lines: AvailableQuote[],
  address: { division: string; city: string } | null,
  mode: 'delivery' | 'pickup',
  commissionPct: number,
): SubOrderQuote {
  const itemsTotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const qty = lines.reduce((s, l) => s + l.qty, 0);
  const shipping = quoteShipping(delivery, vendor.location, address, itemsTotal, qty, mode);
  return {
    vendorId: vendor.id,
    lines,
    itemsTotal,
    qty,
    shipping,
    total: itemsTotal + shipping.fee,
    split: splitFor(lines, shipping.fee, commissionPct),
    royaltyTotal: lines.reduce((s, l) => s + l.royaltyTotal, 0),
    commissionBase: lines.reduce((s, l) => s + l.commissionBase, 0),
    oneTimeTotal: lines.reduce((s, l) => s + l.oneTimeTotal, 0),
  };
}

export function paymentFee(method: 'bkash' | 'nagad' | 'card' | 'cod', total: number, codFeePct: number): number {
  return method === 'cod' ? Math.round((total * codFeePct) / 100) : 0;
}

// ---------- dates ----------

export interface DateEstimate {
  start: string;
  shipDate: string;
  deliveryDate: string;
  productionDays: number;
  notices: string[];
}

export function estimateDates(offering: Offering, method: PrintMethod, rush: boolean, zoneDays: number, qty: number, now: Date, extraBooked = 0): DateEstimate {
  const prod = offering.production;
  const notices: string[] = [];
  const s = productionStart(now, prod.cutoffTime, prod.weeklyOffDay);
  if (s.afterCutoff) notices.push(`Ordered after ${prod.cutoffTime} cutoff, production starts next working day`);
  else if (s.offDay) notices.push('Shop is closed today, production starts next working day');
  let days = rush && prod.rush.available ? prod.rush.days : prod.standardDays[method] ?? 4;
  if (prod.bookedToday + extraBooked + qty > prod.dailyCapacity) {
    days += 1;
    notices.push('Shop is near capacity today, add 1 day');
  }
  const ship = addWorkingDays(s.start, Math.max(0, days - 1), prod.weeklyOffDay);
  const deliveryDate = addDays(ship, zoneDays);
  return { start: s.start.toISOString(), shipDate: ship.toISOString(), deliveryDate: deliveryDate.toISOString(), productionDays: days, notices };
}

// ---------- customization helpers ----------

/** Group visible layers per print area, bounding box clipped to the area, and pick the size tier. */
export function areasFromCustomization(c: Customization, product: BaseProduct): AreaSpec[] {
  const out: AreaSpec[] = [];
  for (const area of product.printAreas) {
    const layers = c.layers.filter((l) => l.printAreaId === area.id && !l.hidden);
    if (!layers.length) continue;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const l of layers) {
      const rad = (l.rotation * Math.PI) / 180;
      const w = Math.abs(l.widthIn * Math.cos(rad)) + Math.abs(l.heightIn * Math.sin(rad));
      const h = Math.abs(l.widthIn * Math.sin(rad)) + Math.abs(l.heightIn * Math.cos(rad));
      const cx = l.x + l.widthIn / 2;
      const cy = l.y + l.heightIn / 2;
      x0 = Math.min(x0, cx - w / 2);
      y0 = Math.min(y0, cy - h / 2);
      x1 = Math.max(x1, cx + w / 2);
      y1 = Math.max(y1, cy + h / 2);
    }
    const widthIn = Math.max(0.1, Math.min(area.widthIn, x1) - Math.max(0, x0));
    const heightIn = Math.max(0.1, Math.min(area.heightIn, y1) - Math.max(0, y0));
    out.push({ areaId: area.id, view: area.view, name: area.name, tier: tierForArea(area, widthIn, heightIn), widthIn: round2(widthIn), heightIn: round2(heightIn) });
  }
  return out;
}

export function royaltiesFromCustomization(c: Customization, designs: Record<string, Design>): RoyaltyItem[] {
  const seen = new Set<string>();
  const out: RoyaltyItem[] = [];
  for (const l of c.layers) {
    if (l.kind !== 'design' || !l.designId || l.hidden || seen.has(l.designId)) continue;
    seen.add(l.designId);
    const d = designs[l.designId];
    if (!d || d.isPrivate || !d.designerId) continue;
    out.push({ designId: d.id, designerId: d.designerId, title: d.title, amount: d.royalty.amount });
  }
  return out;
}

export function estimateInkColors(c: Customization, designs: Record<string, Design>): number {
  const colors = new Set<string>();
  for (const l of c.layers) {
    if (l.hidden) continue;
    if (l.kind === 'text' && l.fill) colors.add(l.fill.toLowerCase());
    if (l.kind === 'text' && l.outline) colors.add(l.outline.toLowerCase());
    if (l.kind === 'design' && l.designId) designs[l.designId]?.palette.forEach((p) => colors.add(p.toLowerCase()));
    if (l.kind === 'image') ['#000', '#fff', '#888', '#c33'].forEach((p) => colors.add(p));
  }
  return Math.max(1, Math.min(10, colors.size));
}

export function buildQuoteInput(
  c: Customization,
  product: BaseProduct,
  offeringId: string,
  method: PrintMethod,
  sizeBreakdown: Record<string, number>,
  rush: boolean,
  designs: Record<string, Design>,
): QuoteInput {
  return {
    productId: product.id,
    offeringId,
    color: c.color,
    method,
    sizeBreakdown,
    rush,
    areas: areasFromCustomization(c, product),
    royalties: royaltiesFromCustomization(c, designs),
    inkColors: c.inkColors ?? estimateInkColors(c, designs),
  };
}
