import { describe, expect, it } from 'vitest';
import { canCustomerCancel, canReportIssue, canRequestTransition, canTransition, NEXT_ORDER_STATUS, orderStepIndex } from './stateMachines';
import { buildOrder, groupCart } from './orders';
import { createSeed } from './seed';
import { cartLineStatus, designerEarnings, fromPrice } from './selectors';

describe('order state machine', () => {
  it('lets only vendors accept and reject', () => {
    expect(canTransition('placed', 'accepted', 'vendor')).toBe(true);
    expect(canTransition('placed', 'accepted', 'customer')).toBe(false);
    expect(canTransition('placed', 'rejected_by_vendor', 'vendor')).toBe(true);
  });
  it('customer cancels only before production', () => {
    expect(canCustomerCancel('placed')).toBe(true);
    expect(canCustomerCancel('accepted')).toBe(true);
    expect(canCustomerCancel('in_production')).toBe(false);
    expect(canTransition('in_production', 'cancelled_by_customer', 'customer')).toBe(false);
  });
  it('issue window is 7 days after delivery', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    expect(canReportIssue('delivered', '2026-10-05T00:00:00Z', now)).toBe(true);
    expect(canReportIssue('delivered', '2026-10-01T00:00:00Z', now)).toBe(false);
    expect(canReportIssue('shipped', undefined, now)).toBe(false);
  });
  it('happy path walks the flow', () => {
    let s = 'placed' as keyof typeof NEXT_ORDER_STATUS;
    const seen: string[] = [s];
    while (NEXT_ORDER_STATUS[s]) {
      s = NEXT_ORDER_STATUS[s]!;
      seen.push(s);
    }
    expect(seen).toEqual(['placed', 'accepted', 'in_production', 'quality_check', 'shipped', 'delivered', 'completed']);
    expect(orderStepIndex('shipped')).toBe(4);
  });
  it('escalation path', () => {
    expect(canTransition('issue_reported', 'issue_rejected', 'vendor')).toBe(true);
    expect(canTransition('issue_rejected', 'escalated', 'customer')).toBe(true);
    expect(canTransition('escalated', 'refunded', 'admin')).toBe(true);
  });
});

describe('request state machine', () => {
  it('covers the main loop', () => {
    expect(canRequestTransition('draft', 'open', 'customer')).toBe(true);
    expect(canRequestTransition('open', 'proposals_received', 'designer')).toBe(true);
    expect(canRequestTransition('proposals_received', 'accepted', 'customer')).toBe(true);
    expect(canRequestTransition('delivered', 'revision_requested', 'customer')).toBe(true);
    expect(canRequestTransition('revision_requested', 'delivered', 'designer')).toBe(true);
    expect(canRequestTransition('delivered', 'approved', 'customer')).toBe(true);
    expect(canRequestTransition('in_progress', 'cancelled_by_customer', 'customer')).toBe(false);
    expect(canRequestTransition('sent', 'declined', 'designer')).toBe(true);
  });
});

describe('seed integrity', () => {
  const now = new Date();
  const data = createSeed(now);
  it('has the required counts', () => {
    expect(Object.keys(data.products)).toHaveLength(9);
    expect(Object.keys(data.vendors)).toHaveLength(4);
    expect(Object.keys(data.offerings)).toHaveLength(18);
    expect(Object.keys(data.designers)).toHaveLength(5);
    expect(Object.keys(data.designs)).toHaveLength(30);
    expect(Object.values(data.designs).filter((d) => d.status === 'flagged')).toHaveLength(2);
    expect(Object.values(data.designs).filter((d) => d.status === 'unpublished')).toHaveLength(2);
    expect(Object.values(data.designs).filter((d) => d.isPrivate)).toHaveLength(3);
    expect(Object.keys(data.customers)).toHaveLength(3);
    expect(Object.keys(data.orders)).toHaveLength(10);
    expect(Object.keys(data.requests)).toHaveLength(6);
    expect(data.notifications).toHaveLength(12);
  });
  it('seeded sub-orders cover many statuses and splits add up', () => {
    const subs = Object.values(data.subOrders);
    expect(new Set(subs.map((s) => s.status)).size).toBeGreaterThanOrEqual(10);
    for (const s of subs) {
      const designers = s.split.designers.reduce((a, d) => a + d.amount, 0);
      expect(s.split.vendor + s.split.platform + designers).toBeCloseTo(s.total, 5);
    }
  });
  it('cart lines have no flags on a fresh seed', () => {
    for (const l of data.carts.c1) expect(cartLineStatus(data, 'c1', l).flags).toEqual([]);
  });
  it('multi-vendor cart splits into groups', () => {
    const groups = groupCart(data, data.carts.c1, data.customers.c1.addresses[0], now);
    expect(groups.map((g) => g.vendorId).sort()).toEqual(['v1', 'v3']);
  });
  it('price change flags the cart line', () => {
    const d = createSeed(now);
    d.offerings.of_v1_tee.pricing.basePrice += 30;
    d.offerings.of_v1_tee.version += 1;
    const st = cartLineStatus(d, 'c1', d.carts.c1[0]);
    expect(st.priceChanged?.old).toBe(6910);
    expect(st.priceChanged?.new).toBeGreaterThan(6910);
  });
  it('flagged design flags the cart line', () => {
    const d = createSeed(now);
    d.designs.ds_01.status = 'flagged';
    expect(cartLineStatus(d, 'c1', d.carts.c1[0]).flags.some((f) => f.type === 'design_unavailable')).toBe(true);
  });
  it('from price exists for every product', () => {
    for (const p of Object.keys(data.products)) expect(fromPrice(data, p)?.price).toBeGreaterThan(0);
  });
  it('designer earnings come from sub-order splits', () => {
    const d = createSeed(now);
    const res = buildOrder(d, 'c1', d.carts.c1, d.customers.c1.addresses[0], 'bkash', {}, now, 'T-1');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    res.built.subOrders.forEach((s) => (d.subOrders[s.id] = s));
    d.orders[res.built.order.id] = res.built.order;
    const e = designerEarnings(d, 'd2');
    const before = designerEarnings(data, 'd2');
    expect(e.royaltiesPending - before.royaltiesPending).toBe(600);
  });
});
