// Pure helpers that turn cart lines into quotes, sub-orders and orders.
// Used by the store (live actions) and by the seed (so seeded numbers match the engine).

import { buildQuoteInput, estimateDates, quote, quoteSubOrder, zoneFor, paymentFee } from './pricing';
import type {
  Address,
  AppData,
  AvailableQuote,
  CartLine,
  Order,
  OrderLine,
  PaymentMethod,
  PriceQuote,
  SubOrder,
  SubOrderQuote,
  TimelineEvent,
} from './types';

export function quoteCartLine(data: AppData, line: CartLine, address: { division: string; city: string } | null, now: Date): PriceQuote {
  const offering = data.offerings[line.offeringId];
  const product = data.products[line.customization.productId];
  if (!offering || !product) return { available: false, offeringId: line.offeringId, vendorId: offering?.vendorId ?? '', reasons: ['This product is no longer offered'] };
  const vendor = data.vendors[offering.vendorId];
  const input = buildQuoteInput(line.customization, product, offering.id, line.method, line.sizeBreakdown, line.rush, data.designs);
  return quote(input, offering, { vendor, product, address, now });
}

export function customerAddress(data: AppData, customerId: string): Address | null {
  const c = data.customers[customerId];
  if (!c) return null;
  return c.addresses.find((a) => a.id === c.defaultAddressId) ?? c.addresses[0] ?? null;
}

export interface CartGroup {
  vendorId: string;
  lines: { line: CartLine; quote: PriceQuote }[];
  sub: SubOrderQuote | null; // null if any line is unavailable
}

/** Group cart lines by vendor and quote each group like a future sub-order. */
export function groupCart(
  data: AppData,
  lines: CartLine[],
  address: { division: string; city: string } | null,
  now: Date,
  modes: Record<string, 'delivery' | 'pickup'> = {},
): CartGroup[] {
  const groups = new Map<string, CartGroup>();
  for (const line of lines) {
    const offering = data.offerings[line.offeringId];
    const vendorId = offering?.vendorId ?? 'unknown';
    const q = quoteCartLine(data, line, address, now);
    if (!groups.has(vendorId)) groups.set(vendorId, { vendorId, lines: [], sub: null });
    groups.get(vendorId)!.lines.push({ line, quote: q });
  }
  for (const g of groups.values()) {
    const vendor = data.vendors[g.vendorId];
    const available = g.lines.map((l) => l.quote).filter((q): q is AvailableQuote => q.available);
    if (!vendor || !available.length) continue;
    const firstOffering = data.offerings[g.lines[0].line.offeringId];
    g.sub = quoteSubOrder(vendor, firstOffering.delivery, available, address, modes[g.vendorId] ?? 'delivery', data.settings.commissionPct);
  }
  return [...groups.values()];
}

let counter = 0;
export function uid(prefix: string): string {
  counter = (counter + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function tl(actor: TimelineEvent['actor'], actorName: string, label: string, at: string, status?: TimelineEvent['status'], note?: string): TimelineEvent {
  return { id: uid('tl'), at, actor, actorName, label, status, note };
}

export interface BuiltOrder {
  order: Order;
  subOrders: SubOrder[];
}

/**
 * Build an order from cart lines. Returns null plus reasons if any line is unavailable.
 */
export function buildOrder(
  data: AppData,
  customerId: string,
  lines: CartLine[],
  address: Address,
  payment: PaymentMethod,
  modes: Record<string, 'delivery' | 'pickup'>,
  now: Date,
  orderNumber: string,
): { ok: true; built: BuiltOrder } | { ok: false; reasons: string[] } {
  const groups = groupCart(data, lines, address, now, modes);
  const reasons: string[] = [];
  for (const g of groups) {
    for (const l of g.lines) if (!l.quote.available) reasons.push(...l.quote.reasons);
    if (g.sub && g.sub.shipping.mode === 'delivery' && !g.sub.shipping.served) reasons.push(`${data.vendors[g.vendorId]?.shopName} doesn't deliver to ${address.city}`);
  }
  if (reasons.length) return { ok: false, reasons };

  const orderId = uid('ord');
  const customer = data.customers[customerId];
  const at = now.toISOString();
  const subOrders: SubOrder[] = groups.map((g, i) => {
    const sub = g.sub as SubOrderQuote;
    const offering = data.offerings[g.lines[0].line.offeringId];
    const vendor = data.vendors[g.vendorId];
    const zone = zoneFor(vendor.location, address);
    const zoneDays = sub.shipping.mode === 'pickup' ? 0 : offering.delivery.zones.find((z) => z.zone === zone)?.days ?? 0;
    const maxDaysLine = g.lines.reduce((best, l) => {
      const q = l.quote as AvailableQuote;
      return q.productionDays > (best.quote as AvailableQuote).productionDays ? l : best;
    }, g.lines[0]);
    const est = estimateDates(offering, maxDaysLine.line.method, maxDaysLine.line.rush, zoneDays, sub.qty, now);
    const orderLines: OrderLine[] = g.lines.map((l) => ({ ...l.line, quote: l.quote as AvailableQuote }));
    return {
      id: `${orderId}-${i + 1}`,
      orderId,
      customerId,
      vendorId: g.vendorId,
      lines: orderLines,
      shipping: sub.shipping,
      itemsTotal: sub.itemsTotal,
      total: sub.total,
      status: 'placed',
      timeline: [tl('customer', customer?.name ?? 'Customer', 'Order placed', at, 'placed')],
      split: sub.split,
      estDelivery: est.deliveryDate,
      estShip: est.shipDate,
      reviewed: false,
      createdAt: at,
    };
  });
  const itemsTotal = subOrders.reduce((s, x) => s + x.itemsTotal, 0);
  const shippingTotal = subOrders.reduce((s, x) => s + x.shipping.fee, 0);
  const fee = paymentFee(payment, itemsTotal + shippingTotal, data.settings.codFeePct);
  const order: Order = {
    id: orderId,
    number: orderNumber,
    customerId,
    subOrderIds: subOrders.map((s) => s.id),
    payment: { method: payment, status: payment === 'cod' ? 'cod_pending' : 'paid', fee },
    address,
    itemsTotal,
    shippingTotal,
    total: itemsTotal + shippingTotal + fee,
    createdAt: at,
  };
  return { ok: true, built: { order, subOrders } };
}
