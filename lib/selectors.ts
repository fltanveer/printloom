// Derived data shared by every panel, so the same numbers show up everywhere.

import { buildQuoteInput, estimateDates, quote, zoneFor, colorGroupOf } from './pricing';
import { customerAddress, groupCart, quoteCartLine } from './orders';
import { matchVendors, type MatchResult } from './vendorMatch';
import { isOrderOpen } from './stateMachines';
import type {
  AppData,
  AvailableQuote,
  BaseProduct,
  CartLine,
  Customization,
  Offering,
  PriceQuote,
  PrintMethod,
  SubOrder,
  Vendor,
} from './types';

// ---------- catalog ----------

export function offeringsForProduct(data: AppData, productId: string, opts: { activeOnly?: boolean } = {}): Offering[] {
  return Object.values(data.offerings).filter(
    (o) => o.productId === productId && (!opts.activeOnly || (o.status === 'active' && data.vendors[o.vendorId]?.status === 'active')),
  );
}

export function vendorCandidates(data: AppData, productId: string, lockVendorId?: string | null): { vendor: Vendor; offering: Offering | null }[] {
  return Object.values(data.vendors)
    .filter((v) => !lockVendorId || v.id === lockVendorId)
    .map((vendor) => ({
      vendor,
      offering: Object.values(data.offerings).find((o) => o.vendorId === vendor.id && o.productId === productId && o.status !== 'draft') ?? null,
    }));
}

/** "from" price: lowest single-unit price across active vendors for the platform rule (Light, M, medium front, standard). */
export function fromPrice(data: AppData, productId: string): { price: number; vendorId: string } | null {
  const product = data.products[productId];
  const rule = data.settings.fromPrice;
  let best: { price: number; vendorId: string } | null = null;
  for (const o of offeringsForProduct(data, productId, { activeOnly: true })) {
    const vendor = data.vendors[o.vendorId];
    const group = o.colorGroups.find((g) => g.name === rule.colorGroup) ?? o.colorGroups[0];
    const color = group?.colors[0]?.name;
    if (!color) continue;
    const size = product.sizes.includes(rule.size) ? rule.size : product.sizes[0];
    const area = product.printAreas.find((a) => a.view === rule.view) ?? product.printAreas[0];
    const tier = area.sizeTiers.includes(rule.tier) ? rule.tier : area.sizeTiers[0];
    for (const method of o.methods) {
      const q = quote(
        {
          productId,
          offeringId: o.id,
          color,
          method,
          sizeBreakdown: { [size]: Math.max(1, o.pricing.moq) },
          rush: false,
          areas: [{ areaId: area.id, view: area.view, name: area.name, tier, widthIn: 6, heightIn: 6 }],
          royalties: [],
          inkColors: 1,
        },
        o,
        { vendor, product, address: null, now: new Date() },
      );
      if (q.available && (!best || q.unitAvg < best.price)) best = { price: q.unitAvg, vendorId: vendor.id };
    }
  }
  return best;
}

export interface ColorOption {
  name: string;
  hex: string;
  group: string;
  vendorIds: string[];
}

/** Union of colors across active vendors (or one vendor when locked). */
export function colorUnion(data: AppData, productId: string, lockVendorId?: string | null): ColorOption[] {
  const map = new Map<string, ColorOption>();
  for (const o of offeringsForProduct(data, productId, { activeOnly: true })) {
    if (lockVendorId && o.vendorId !== lockVendorId) continue;
    for (const g of o.colorGroups) {
      for (const c of g.colors) {
        if (!o.variants.some((v) => v.color === c.name && v.enabled)) continue;
        const e = map.get(c.name) ?? { name: c.name, hex: c.hex, group: g.name, vendorIds: [] };
        if (!e.vendorIds.includes(o.vendorId)) e.vendorIds.push(o.vendorId);
        map.set(c.name, e);
      }
    }
  }
  const order = ['Light', 'Heather', 'Dark', 'Neon'];
  const rank = (g: string) => (order.includes(g) ? order.indexOf(g) : order.length);
  return [...map.values()].sort((a, b) => rank(a.group) - rank(b.group));
}

export function methodUnion(data: AppData, productId: string, lockVendorId?: string | null): PrintMethod[] {
  const set = new Set<PrintMethod>();
  for (const o of offeringsForProduct(data, productId, { activeOnly: true })) {
    if (lockVendorId && o.vendorId !== lockVendorId) continue;
    o.methods.forEach((m) => set.add(m));
  }
  return data.products[productId].allowedMethods.filter((m) => set.has(m));
}

export function activeVendorCount(data: AppData, productId: string): number {
  return new Set(offeringsForProduct(data, productId, { activeOnly: true }).map((o) => o.vendorId)).size;
}

/** Why a size chip is disabled for the given offering/color. */
export function sizeReason(offering: Offering | null, color: string, size: string): string | null {
  if (!offering) return null;
  const v = offering.variants.find((x) => x.color === color && x.size === size);
  if (!v || !v.enabled) return `No ${size} in ${color}`;
  if (v.stock !== 'unlimited' && v.stock <= 0) return `${color} / ${size} is out of stock`;
  return null;
}

export function stockLeft(offering: Offering | null, color: string, size: string): number | 'unlimited' | null {
  const v = offering?.variants.find((x) => x.color === color && x.size === size);
  return v ? v.stock : null;
}

/** Why a method is disabled for a color across candidate vendors. */
export function methodReason(data: AppData, productId: string, color: string, method: PrintMethod, lockVendorId?: string | null): string | null {
  const offs = offeringsForProduct(data, productId, { activeOnly: true }).filter((o) => (!lockVendorId || o.vendorId === lockVendorId) && o.methods.includes(method));
  if (!offs.length) return lockVendorId ? `This shop doesn't offer ${method}` : `No shop offers ${method} here`;
  if (method === 'sublimation') {
    const ok = offs.some((o) => colorGroupOf(o, color)?.name === 'Light' && /poly/i.test(o.blank.fabric));
    if (!ok) return 'Sublimation only works on light polyester';
  }
  const hasColor = offs.some((o) => o.variants.some((v) => v.color === color && v.enabled));
  if (!hasColor) return `No shop does ${method} on ${color}`;
  return null;
}

// ---------- vendor matching for a customization ----------

export function matchForCustomization(
  data: AppData,
  customerId: string,
  c: Customization,
  method: PrintMethod,
  sizeBreakdown: Record<string, number>,
  rush: boolean,
  lockVendorId?: string | null,
): MatchResult {
  const product = data.products[c.productId];
  const input = buildQuoteInput(c, product, '', method, sizeBreakdown, rush, data.designs);
  return matchVendors(input, vendorCandidates(data, c.productId, lockVendorId), product, customerAddress(data, customerId), new Date());
}

export function quoteFor(data: AppData, customerId: string | null, c: Customization, offeringId: string, method: PrintMethod, sizeBreakdown: Record<string, number>, rush: boolean): PriceQuote {
  const product = data.products[c.productId];
  const offering = data.offerings[offeringId];
  const vendor = data.vendors[offering.vendorId];
  const input = buildQuoteInput(c, product, offeringId, method, sizeBreakdown, rush, data.designs);
  return quote(input, offering, { vendor, product, address: customerId ? customerAddress(data, customerId) : null, now: new Date() });
}

export function deliveryEstimate(data: AppData, customerId: string, offeringId: string, method: PrintMethod, rush: boolean, qty: number) {
  const offering = data.offerings[offeringId];
  const vendor = data.vendors[offering.vendorId];
  const addr = customerAddress(data, customerId);
  const zone = addr ? zoneFor(vendor.location, addr) : 'same_city';
  const zoneDays = offering.delivery.zones.find((z) => z.zone === zone)?.days ?? 0;
  return estimateDates(offering, method, rush, zoneDays, qty, new Date());
}

// ---------- cart flags (section 14) ----------

export type CartFlagType = 'price_changed' | 'unavailable' | 'design_unavailable' | 'vendor_paused' | 'zone' | 'low_quality';

export interface CartFlag {
  type: CartFlagType;
  message: string;
  designId?: string;
}

export interface CartLineStatus {
  line: CartLine;
  quote: PriceQuote;
  flags: CartFlag[];
  priceChanged: { old: number; new: number } | null;
  blocking: boolean;
}

export function cartLineStatus(data: AppData, customerId: string, line: CartLine): CartLineStatus {
  const addr = customerAddress(data, customerId);
  const q = quoteCartLine(data, line, addr, new Date());
  const flags: CartFlag[] = [];
  const offering = data.offerings[line.offeringId];
  const vendor = offering ? data.vendors[offering.vendorId] : null;
  if (vendor && vendor.status === 'paused') flags.push({ type: 'vendor_paused', message: `${vendor.shopName} is temporarily closed. ${vendor.pausedMessage}`.trim() });
  for (const l of line.customization.layers) {
    if (l.kind !== 'design' || !l.designId) continue;
    const d = data.designs[l.designId];
    if (!d || (d.status !== 'published' && !(d.isPrivate && d.ownerCustomerId === customerId))) {
      if (!flags.some((f) => f.designId === l.designId)) flags.push({ type: 'design_unavailable', message: `${d?.title ?? 'This design'} is no longer available`, designId: l.designId });
    }
  }
  if (!q.available && !flags.some((f) => f.type === 'vendor_paused')) {
    for (const r of q.reasons) flags.push({ type: r.startsWith("Doesn't deliver") ? 'zone' : 'unavailable', message: r });
  }
  let priceChanged: CartLineStatus['priceChanged'] = null;
  if (q.available && offering && (line.priceSnapshot.offeringVersion !== offering.version || q.lineTotal !== line.priceSnapshot.lineTotal) && q.lineTotal !== line.priceSnapshot.lineTotal) {
    priceChanged = { old: line.priceSnapshot.lineTotal, new: q.lineTotal };
    flags.push({ type: 'price_changed', message: `${vendor?.shopName} updated their price` });
  }
  return { line, quote: q, flags, priceChanged, blocking: flags.length > 0 };
}

export { groupCart, customerAddress };

// ---------- earnings and payouts (identical numbers across panels) ----------

const PENDING = ['placed', 'accepted', 'in_production', 'quality_check', 'shipped', 'reprint'];
const VOID = ['cancelled_by_customer', 'refunded', 'rejected_by_vendor', 'reassigned'];

export interface DesignerEarnings {
  royaltiesPending: number;
  royaltiesAvailable: number;
  royaltiesVoided: number;
  commissionsEscrow: number;
  commissionsEarned: number;
  paidOut: number;
  balance: number;
  byDesign: Record<string, number>;
  byMonth: { month: string; royalties: number; commissions: number }[];
  entries: { at: string; label: string; amount: number; kind: 'royalty' | 'commission'; state: 'pending' | 'available' | 'voided' | 'escrow' }[];
}

export function designerEarnings(data: AppData, designerId: string): DesignerEarnings {
  const e: DesignerEarnings = { royaltiesPending: 0, royaltiesAvailable: 0, royaltiesVoided: 0, commissionsEscrow: 0, commissionsEarned: 0, paidOut: 0, balance: 0, byDesign: {}, byMonth: [], entries: [] };
  const months = new Map<string, { royalties: number; commissions: number }>();
  const bump = (at: string, k: 'royalties' | 'commissions', amt: number) => {
    const m = at.slice(0, 7);
    const cur = months.get(m) ?? { royalties: 0, commissions: 0 };
    cur[k] += amt;
    months.set(m, cur);
  };
  for (const sub of Object.values(data.subOrders)) {
    const share = sub.split.designers.find((d) => d.designerId === designerId);
    if (!share) continue;
    const order = data.orders[sub.orderId];
    let state: 'pending' | 'available' | 'voided' = 'available';
    if (PENDING.includes(sub.status)) state = 'pending';
    else if (VOID.includes(sub.status)) state = 'voided';
    if (state === 'pending') e.royaltiesPending += share.amount;
    else if (state === 'voided') e.royaltiesVoided += share.amount;
    else {
      e.royaltiesAvailable += share.amount;
      bump(sub.createdAt, 'royalties', share.amount);
    }
    for (const l of sub.lines) for (const r of l.quote.royalties) if (r.designerId === designerId && state !== 'voided') e.byDesign[r.designId] = (e.byDesign[r.designId] ?? 0) + r.amount * l.quote.qty;
    e.entries.push({ at: sub.createdAt, label: `Royalty, order ${order?.number}`, amount: share.amount, kind: 'royalty', state });
  }
  const feePct = data.settings.requestFeePct;
  for (const r of Object.values(data.requests)) {
    if (r.designerId !== designerId || !r.acceptedProposalId) continue;
    const p = r.proposals.find((x) => x.id === r.acceptedProposalId);
    if (!p) continue;
    const gross = p.price + r.extraRevisionsPaid * r.extraRevisionFee;
    const net = Math.round(gross * (1 - feePct / 100));
    if (r.status === 'completed' || r.status === 'approved') {
      e.commissionsEarned += net;
      bump(r.createdAt, 'commissions', net);
      e.entries.push({ at: r.createdAt, label: `Commission, ${r.title}`, amount: net, kind: 'commission', state: 'available' });
    } else if (['accepted', 'in_progress', 'delivered', 'revision_requested'].includes(r.status)) {
      e.commissionsEscrow += net;
      e.entries.push({ at: r.createdAt, label: `In escrow, ${r.title}`, amount: net, kind: 'commission', state: 'escrow' });
    }
  }
  e.paidOut = data.payouts.filter((p) => p.ownerId === designerId).reduce((s, p) => s + p.amount, 0);
  e.balance = Math.max(0, e.royaltiesAvailable + e.commissionsEarned - data.payouts.filter((p) => p.ownerId === designerId && p.status === 'processing').reduce((s, p) => s + p.amount, 0));
  e.byMonth = [...months.entries()].sort().map(([month, v]) => ({ month, ...v }));
  e.entries.sort((a, b) => b.at.localeCompare(a.at));
  return e;
}

export interface VendorFinance {
  available: number; // seed balance + completed payouts
  pending: number; // in-flight sub-orders
  refunded: number;
  revenueWeek: number;
  ordersToday: number;
}

export function vendorFinance(data: AppData, vendorId: string): VendorFinance {
  const v = data.vendors[vendorId];
  let pending = 0;
  let completed = 0;
  let refunded = 0;
  let revenueWeek = 0;
  let ordersToday = 0;
  const now = Date.now();
  for (const sub of Object.values(data.subOrders)) {
    if (sub.vendorId !== vendorId) continue;
    if (['completed', 'issue_rejected'].includes(sub.status)) completed += sub.split.vendor;
    else if (['refunded', 'partial_refund'].includes(sub.status)) {
      refunded += sub.refundAmount ?? 0;
      if (sub.status === 'partial_refund') completed += Math.max(0, sub.split.vendor - (sub.refundAmount ?? 0));
    } else if (isOrderOpen(sub.status) && !['rejected_by_vendor'].includes(sub.status)) pending += sub.split.vendor;
    const age = now - new Date(sub.createdAt).getTime();
    if (age < 7 * 86400000 && !VOID.includes(sub.status)) revenueWeek += sub.split.vendor;
    if (age < 86400000) ordersToday += 1;
  }
  const requested = data.payouts.filter((p) => p.ownerId === vendorId && p.status === 'processing').reduce((s, p) => s + p.amount, 0);
  return { available: Math.max(0, v.payoutBalance + completed - requested), pending, refunded, revenueWeek, ordersToday };
}

export function platformStats(data: AppData) {
  const subs = Object.values(data.subOrders);
  const live = subs.filter((s) => !VOID.includes(s.status));
  const gmv = live.reduce((s, x) => s + x.total, 0);
  const commission = live.reduce((s, x) => s + x.split.platform, 0);
  const requestFees = Object.values(data.requests)
    .filter((r) => r.status === 'completed' && r.acceptedProposalId)
    .reduce((s, r) => s + Math.round((r.proposals.find((p) => p.id === r.acceptedProposalId)?.price ?? 0) * (data.settings.requestFeePct / 100)), 0);
  const byStatus: Record<string, number> = {};
  subs.forEach((s) => (byStatus[s.status] = (byStatus[s.status] ?? 0) + 1));
  const issues = subs.filter((s) => s.issue).length;
  return {
    gmv,
    commission,
    requestFees,
    byStatus,
    orders: Object.keys(data.orders).length,
    subOrders: subs.length,
    activeVendors: Object.values(data.vendors).filter((v) => v.status === 'active').length,
    activeDesigners: Object.values(data.designers).filter((d) => d.onboarded).length,
    issueRate: subs.length ? issues / subs.length : 0,
  };
}

export function subOrdersForVendor(data: AppData, vendorId: string): SubOrder[] {
  return Object.values(data.subOrders)
    .filter((s) => s.vendorId === vendorId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function isLate(sub: SubOrder, now = new Date()): boolean {
  return ['accepted', 'in_production', 'quality_check', 'shipped', 'placed'].includes(sub.status) && new Date(sub.estDelivery).getTime() < now.getTime();
}

export function lineQty(q: AvailableQuote | CartLine): number {
  if ('qty' in q) return q.qty;
  return Object.values(q.sizeBreakdown).reduce((s, x) => s + x, 0);
}

export function publicDesigns(data: AppData) {
  return Object.values(data.designs).filter((d) => d.status === 'published' && !d.isPrivate);
}

export function productFor(data: AppData, offeringId: string): BaseProduct | undefined {
  const o = data.offerings[offeringId];
  return o ? data.products[o.productId] : undefined;
}
