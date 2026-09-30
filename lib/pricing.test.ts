import { describe, expect, it } from 'vitest';
import { buildQuoteInput, quote, quoteSubOrder, tierForSize, estimateDates } from './pricing';
import { createSeed, workedExampleCustomization } from './seed';
import { matchVendors } from './vendorMatch';
import type { AvailableQuote } from './types';

const now = new Date('2026-09-29T04:00:00Z'); // Tuesday 10:00 in Dhaka

describe('section 7.9 worked example', () => {
  const data = createSeed(now);
  const offering = data.offerings.of_v1_tee;
  const product = data.products.p_tee;
  const vendor = data.vendors.v1;
  const customer = data.customers.c1;
  const addr = customer.addresses[0];
  const c = workedExampleCustomization();
  const input = buildQuoteInput(c, product, offering.id, 'DTF', { M: 6, '2XL': 4 }, false, data.designs);
  const q = quote(input, offering, { vendor, product, address: addr, now }) as AvailableQuote;

  it('is available', () => expect(q.available).toBe(true));
  it('prices the print areas', () => {
    expect(input.areas.map((a) => [a.areaId, a.tier])).toEqual([
      ['front', 'large'],
      ['back', 'small'],
    ]);
    expect(q.printPerUnit).toBe(320);
  });
  it('rounds unit prices', () => {
    const m = q.sizes.find((s) => s.size === 'M')!;
    const xxl = q.sizes.find((s) => s.size === '2XL')!;
    expect(m.garment).toBe(350);
    expect(m.unitRaw).toBeCloseTo(676.4, 5);
    expect(m.unit).toBe(675);
    expect(xxl.garment).toBe(390);
    expect(xxl.unitRaw).toBeCloseTo(713.2, 5);
    expect(xxl.unit).toBe(715);
  });
  it('line total, shipping and split', () => {
    expect(q.lineTotal).toBe(6910);
    expect(q.royaltyTotal).toBe(600);
    const sub = quoteSubOrder(vendor, offering.delivery, [q], addr, 'delivery', data.settings.commissionPct);
    expect(sub.shipping.baseFee + sub.shipping.extraItemsFee).toBe(160);
    expect(sub.shipping.fee).toBe(0);
    expect(sub.split.designers).toEqual([{ designerId: 'd2', amount: 600 }]);
    expect(sub.split.platform).toBeCloseTo(757.2, 5);
    expect(sub.split.vendor).toBeCloseTo(5552.8, 5);
    expect(sub.split.vendor + sub.split.platform + 600).toBeCloseTo(sub.total, 5);
  });
});

describe('availability reasons', () => {
  const data = createSeed(now);
  const product = data.products.p_tee;
  const c = { ...workedExampleCustomization(), color: 'Neon Green' };
  const addr = data.customers.c3.addresses[0];
  const candidates = Object.values(data.vendors).map((v) => ({ vendor: v, offering: Object.values(data.offerings).find((o) => o.vendorId === v.id && o.productId === 'p_tee') ?? null }));
  const input = buildQuoteInput(c, product, '', 'DTF', { '2XL': 1 }, false, data.designs);
  const res = matchVendors(input, candidates, product, addr, now);
  it('explains why vendors are unavailable', () => {
    const r = Object.fromEntries(res.unavailable.map((u) => [u.vendor.id, u.reasons]));
    expect(r.v1).toContain('No 2XL in Neon Green');
    expect(r.v2).toContain('No Neon Green');
    expect(r.v4.join()).toMatch(/No neon green|No dtf|Minimum 20|deliver/i);
  });
});

describe('helpers', () => {
  it('size tiers', () => {
    expect(tierForSize(4, 4)).toBe('small');
    expect(tierForSize(8, 10)).toBe('medium');
    expect(tierForSize(10, 12)).toBe('large');
    expect(tierForSize(14, 20)).toBe('full');
  });
  it('skips the weekly off day', () => {
    const data = createSeed(now);
    const thu = new Date('2026-10-01T10:00:00Z'); // Thursday 16:00 Dhaka, after 14:00 cutoff
    const est = estimateDates(data.offerings.of_v1_tee, 'DTF', false, 1, 1, thu);
    expect(est.notices[0]).toMatch(/cutoff/);
    expect(new Date(est.start).getUTCDay()).toBe(6); // Friday skipped, Saturday start
  });
});
