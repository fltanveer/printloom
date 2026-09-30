// Small pure helpers for the cart, checkout and order screens. No prices are computed here.

import { colorHex } from '@/lib/pricing';
import { COLORS } from '@/lib/seed';
import { deliveryEstimate } from '@/lib/selectors';
import type { CartGroup } from '@/lib/orders';
import type { AppData, CartLine, Division, Layer, View } from '@/lib/types';

export const DIVISION_CITIES: Record<Division, string[]> = {
  Dhaka: ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail', 'Savar'],
  Chattogram: ['Chattogram', "Cox's Bazar", 'Cumilla', 'Feni'],
  Sylhet: ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
  Rajshahi: ['Rajshahi', 'Bogura', 'Pabna'],
  Khulna: ['Khulna', 'Jashore', 'Kushtia'],
  Barishal: ['Barishal', 'Patuakhali', 'Bhola'],
  Rangpur: ['Rangpur', 'Dinajpur', 'Saidpur'],
  Mymensingh: ['Mymensingh', 'Jamalpur', 'Netrokona'],
};

export const DIVISIONS = Object.keys(DIVISION_CITIES) as Division[];

/** "6 x M, 4 x 2XL" */
export function sizeSummary(sizes: Record<string, number>): string {
  return Object.entries(sizes)
    .filter(([, q]) => q > 0)
    .map(([s, q]) => `${q} x ${s}`)
    .join(', ');
}

export function totalQty(sizes: Record<string, number>): number {
  return Object.values(sizes).reduce((s, q) => s + q, 0);
}

export function hexFor(data: AppData, offeringId: string, color: string): string {
  const o = data.offerings[offeringId];
  return (o && colorHex(o, color)) ?? (COLORS as Record<string, string>)[color] ?? '#FFFFFF';
}

/** The view that has the most visible artwork, so thumbnails show the design. */
export function bestView(views: View[], layers: Layer[], areaView: (areaId: string) => View | undefined): View {
  const counts = new Map<View, number>();
  for (const l of layers) {
    const v = areaView(l.printAreaId);
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = views[0];
  let n = -1;
  for (const v of views) {
    const c = counts.get(v) ?? 0;
    if (c > n) {
      best = v;
      n = c;
    }
  }
  return best;
}

/** Latest ship and delivery dates across the lines of one vendor group. */
export function groupDates(data: AppData, customerId: string, lines: CartLine[]): { shipDate: string; deliveryDate: string; notices: string[] } | null {
  let out: { shipDate: string; deliveryDate: string; notices: string[] } | null = null;
  const qty = lines.reduce((s, l) => s + totalQty(l.sizeBreakdown), 0);
  for (const l of lines) {
    if (!data.offerings[l.offeringId]) continue;
    const e = deliveryEstimate(data, customerId, l.offeringId, l.method, l.rush, qty);
    if (!out || e.deliveryDate > out.deliveryDate) out = { shipDate: e.shipDate, deliveryDate: e.deliveryDate, notices: e.notices };
  }
  return out;
}

export function groupOffering(data: AppData, g: CartGroup) {
  return data.offerings[g.lines[0]?.line.offeringId ?? ''];
}

export function readFilesAsDataUrls(files: FileList | null, max: number): Promise<string[]> {
  if (!files) return Promise.resolve([]);
  const list = Array.from(files)
    .filter((f) => f.type.startsWith('image/'))
    .slice(0, max);
  return Promise.all(
    list.map(
      (f) =>
        new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(r.error);
          r.readAsDataURL(f);
        }),
    ),
  );
}
