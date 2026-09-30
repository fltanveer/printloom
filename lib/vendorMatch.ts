// Vendor recommendation score (section 7.11) and comparison badges.

import { estimateDates, quote, zoneFor, type QuoteContext } from './pricing';
import type { AvailableQuote, BaseProduct, Offering, QuoteInput, UnavailableQuote, Vendor, ZoneKey } from './types';

export interface VendorOption {
  vendor: Vendor;
  offering: Offering;
  quote: AvailableQuote;
  zone: ZoneKey | null;
  totalDays: number;
  deliveryDate: string;
  notices: string[];
  score: number;
  factors: { price: number; speed: number; rating: number; proximity: number };
  badges: ('Recommended' | 'Cheapest' | 'Fastest')[];
  reason: string;
}

export interface UnavailableOption {
  vendor: Vendor;
  offering: Offering | null;
  reasons: string[];
  cheaperIfMoq?: { moq: number; unit: number } | null;
}

export interface MatchResult {
  options: VendorOption[];
  unavailable: UnavailableOption[];
  recommended: VendorOption | null;
  cheapest: VendorOption | null;
  fastest: VendorOption | null;
}

const minMax = (vals: number[], v: number, invert: boolean) => {
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  if (hi === lo) return 1;
  const n = (v - lo) / (hi - lo);
  return invert ? 1 - n : n;
};

export function ratingScore(rating: number, reviewCount: number): number {
  const raw = Math.min(1, Math.max(0, (rating - 3) / 2));
  if (reviewCount >= 10) return raw;
  // damp toward neutral for thin review history
  const w = reviewCount / 10;
  return raw * w + 0.5 * (1 - w);
}

export function proximityScore(zone: ZoneKey | null): number {
  if (zone === 'same_city') return 1;
  if (zone === 'same_division') return 0.5;
  return 0;
}

export function reasonFor(o: VendorOption, all: VendorOption[], city: string | null, qty: number): string {
  if (all.length === 1) return 'Only shop with everything you picked';
  const f = o.factors;
  const top = Object.entries({ price: 0.35 * f.price, speed: 0.25 * f.speed, rating: 0.3 * f.rating, proximity: 0.1 * f.proximity }).sort((a, b) => b[1] - a[1]);
  const [first, second] = top;
  if (first[0] === 'price' && second && second[0] === 'rating') return 'Best mix of price and rating';
  if (first[0] === 'price') return qty >= 20 ? `Cheapest for ${qty >= 20 ? '20+' : qty} pieces` : 'Lowest price for your order';
  if (first[0] === 'speed') return city ? `Fastest to ${city}` : 'Fastest delivery';
  if (first[0] === 'rating') return 'Top rated for print quality';
  return city ? `Closest shop to ${city}` : 'Closest shop';
}

export function matchVendors(
  input: Omit<QuoteInput, 'offeringId'>,
  candidates: { vendor: Vendor; offering: Offering | null }[],
  product: BaseProduct,
  address: { division: string; city: string } | null,
  now: Date,
): MatchResult {
  const options: VendorOption[] = [];
  const unavailable: UnavailableOption[] = [];

  for (const { vendor, offering } of candidates) {
    if (!offering) {
      unavailable.push({ vendor, offering: null, reasons: [`Doesn't make ${product.name.toLowerCase()}s`] });
      continue;
    }
    const ctx: QuoteContext = { vendor, product, address, now };
    const q = quote({ ...input, offeringId: offering.id }, offering, ctx);
    if (!q.available) {
      const u = q as UnavailableQuote;
      let cheaperIfMoq: UnavailableOption['cheaperIfMoq'] = null;
      if (u.reasons.length === 1 && u.reasons[0].startsWith('Minimum')) {
        // what they'd charge at MOQ, spread proportionally
        const moq = offering.pricing.moq;
        const sizes = Object.keys(input.sizeBreakdown).filter((s) => input.sizeBreakdown[s] > 0);
        const first = sizes[0];
        const scaled: Record<string, number> = { ...input.sizeBreakdown };
        const current = Object.values(scaled).reduce((s, x) => s + x, 0);
        if (first) scaled[first] = (scaled[first] ?? 0) + (moq - current);
        const mq = quote({ ...input, sizeBreakdown: scaled, offeringId: offering.id }, offering, ctx);
        if (mq.available) cheaperIfMoq = { moq, unit: Math.round(mq.unitAvg) };
      }
      unavailable.push({ vendor, offering, reasons: u.reasons, cheaperIfMoq });
      continue;
    }
    const zone = address ? zoneFor(vendor.location, address) : null;
    const zoneDays = zone ? offering.delivery.zones.find((z) => z.zone === zone)?.days ?? 0 : 0;
    const est = estimateDates(offering, input.method, input.rush, zoneDays, q.qty, now);
    const totalDays = Math.max(1, Math.round((new Date(est.deliveryDate).getTime() - now.getTime()) / 86400000));
    options.push({
      vendor,
      offering,
      quote: q,
      zone,
      totalDays,
      deliveryDate: est.deliveryDate,
      notices: est.notices,
      score: 0,
      factors: { price: 0, speed: 0, rating: 0, proximity: 0 },
      badges: [],
      reason: '',
    });
  }

  if (options.length) {
    const prices = options.map((o) => o.quote.lineTotal);
    const days = options.map((o) => o.totalDays);
    for (const o of options) {
      o.factors = {
        price: minMax(prices, o.quote.lineTotal, true),
        speed: minMax(days, o.totalDays, true),
        rating: ratingScore(o.vendor.rating, o.vendor.reviewCount),
        proximity: proximityScore(o.zone),
      };
      o.score = 0.35 * o.factors.price + 0.25 * o.factors.speed + 0.3 * o.factors.rating + 0.1 * o.factors.proximity;
    }
    options.sort((a, b) => b.score - a.score);
    const qty = options[0].quote.qty;
    options.forEach((o) => (o.reason = reasonFor(o, options, address?.city ?? null, qty)));
    options[0].badges.push('Recommended');
    const cheapest = [...options].sort((a, b) => a.quote.lineTotal - b.quote.lineTotal || b.score - a.score)[0];
    const fastest = [...options].sort((a, b) => a.totalDays - b.totalDays || b.score - a.score)[0];
    if (cheapest !== options[0]) cheapest.badges.push('Cheapest');
    if (fastest !== options[0] && fastest.totalDays < options[0].totalDays) fastest.badges.push('Fastest');
    return {
      options,
      unavailable,
      recommended: options[0],
      cheapest,
      fastest,
    };
  }
  return { options, unavailable, recommended: null, cheapest: null, fastest: null };
}

/** Delta badge text vs a reference option, e.g. "৳40 cheaper", "1 day faster". */
export function deltas(o: VendorOption, ref: VendorOption): { price: number; days: number } {
  return { price: ref.quote.lineTotal - o.quote.lineTotal, days: ref.totalDays - o.totalDays };
}
