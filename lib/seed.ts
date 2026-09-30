// Seed data. Everything is generated relative to "now" so dates always look fresh.

import { addDays } from './dates';
import { buildOrder, tl } from './orders';
import type {
  Address,
  AppData,
  BaseProduct,
  CartLine,
  ColorGroup,
  Customer,
  Customization,
  DeliveryRules,
  Design,
  DesignRequest,
  Designer,
  Layer,
  Notification,
  Offering,
  PricingRules,
  PrintMethod,
  PrintTable,
  ProductionRules,
  Review,
  SubOrder,
  Variant,
  Vendor,
  View,
  Persona,
} from './types';

export const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
export const DEVICE_SIZES = ['iPhone 15', 'iPhone 15 Pro', 'Galaxy S24', 'Pixel 8'];

// ---------- products ----------

const apparelAreas = (front: [number, number], back: [number, number], sleeves = true) => [
  { id: 'front', view: 'front' as View, name: 'Front', widthIn: front[0], heightIn: front[1], sizeTiers: ['small', 'medium', 'large'] as const },
  { id: 'back', view: 'back' as View, name: 'Back', widthIn: back[0], heightIn: back[1], sizeTiers: ['small', 'medium', 'large'] as const },
  ...(sleeves
    ? [
        { id: 'left_sleeve', view: 'left_sleeve' as View, name: 'Left sleeve', widthIn: 3.5, heightIn: 3.5, sizeTiers: ['small'] as const },
        { id: 'right_sleeve', view: 'right_sleeve' as View, name: 'Right sleeve', widthIn: 3.5, heightIn: 3.5, sizeTiers: ['small'] as const },
      ]
    : []),
];

function product(p: Omit<BaseProduct, 'mockupSvg' | 'printAreas'> & { printAreas: { id: string; view: View; name: string; widthIn: number; heightIn: number; sizeTiers: readonly ('small' | 'medium' | 'large' | 'full')[] }[] }): BaseProduct {
  return { ...p, mockupSvg: p.category, printAreas: p.printAreas.map((a) => ({ ...a, sizeTiers: [...a.sizeTiers] })) };
}

export const PRODUCTS: BaseProduct[] = [
  product({
    id: 'p_tee',
    name: 'Classic T-shirt',
    category: 'tshirt',
    description: 'The everyday crew neck tee. Pick your blank quality, color and print.',
    views: ['front', 'back', 'left_sleeve', 'right_sleeve'],
    printAreas: apparelAreas([12, 16], [12, 16]),
    sizeSystem: 'apparel',
    sizes: APPAREL_SIZES,
    allowedMethods: ['DTF', 'DTG', 'screen', 'embroidery', 'sublimation'],
    popularity: 100,
  }),
  product({
    id: 'p_polo',
    name: 'Polo Shirt',
    category: 'polo',
    description: 'Smart pique polo for offices, clubs and events.',
    views: ['front', 'back', 'left_sleeve', 'right_sleeve'],
    printAreas: apparelAreas([10, 12], [12, 14]),
    sizeSystem: 'apparel',
    sizes: APPAREL_SIZES,
    allowedMethods: ['DTF', 'DTG', 'embroidery', 'screen'],
    popularity: 70,
  }),
  product({
    id: 'p_hoodie',
    name: 'Pullover Hoodie',
    category: 'hoodie',
    description: 'Heavy fleece hoodie with kangaroo pocket.',
    views: ['front', 'back', 'left_sleeve', 'right_sleeve'],
    printAreas: apparelAreas([11, 10], [12, 16]),
    sizeSystem: 'apparel',
    sizes: APPAREL_SIZES,
    allowedMethods: ['DTF', 'DTG', 'screen', 'embroidery'],
    popularity: 80,
  }),
  product({
    id: 'p_jersey',
    name: 'Sports Jersey',
    category: 'jersey',
    description: 'Breathable polyester jersey. Names and numbers welcome.',
    views: ['front', 'back'],
    printAreas: [
      { id: 'front', view: 'front', name: 'Front', widthIn: 14, heightIn: 20, sizeTiers: ['small', 'medium', 'large', 'full'] },
      { id: 'back', view: 'back', name: 'Back', widthIn: 14, heightIn: 20, sizeTiers: ['small', 'medium', 'large', 'full'] },
    ],
    sizeSystem: 'apparel',
    sizes: APPAREL_SIZES,
    allowedMethods: ['sublimation', 'DTF', 'screen'],
    popularity: 90,
  }),
  product({
    id: 'p_mug',
    name: 'Ceramic Mug',
    category: 'mug',
    description: 'Glossy ceramic mug, dishwasher safe print.',
    views: ['wrap'],
    printAreas: [{ id: 'wrap', view: 'wrap', name: 'Wrap', widthIn: 8.5, heightIn: 3.5, sizeTiers: ['small', 'medium'] }],
    sizeSystem: 'mug',
    sizes: ['11oz', '15oz'],
    allowedMethods: ['sublimation', 'UV'],
    popularity: 60,
  }),
  product({
    id: 'p_tote',
    name: 'Canvas Tote',
    category: 'tote',
    description: 'Sturdy cotton canvas tote bag.',
    views: ['front'],
    printAreas: [{ id: 'front', view: 'front', name: 'Front', widthIn: 12, heightIn: 14, sizeTiers: ['small', 'medium', 'large'] }],
    sizeSystem: 'none',
    sizes: ['One size'],
    allowedMethods: ['DTF', 'screen', 'DTG'],
    popularity: 55,
  }),
  product({
    id: 'p_poster',
    name: 'Art Poster',
    category: 'poster',
    description: 'Museum grade matte or glossy paper.',
    views: ['front'],
    printAreas: [{ id: 'front', view: 'front', name: 'Front', widthIn: 16, heightIn: 22, sizeTiers: ['medium', 'large', 'full'] }],
    sizeSystem: 'poster',
    sizes: ['A4', 'A3', 'A2'],
    allowedMethods: ['UV'],
    popularity: 40,
  }),
  product({
    id: 'p_case',
    name: 'Phone Case',
    category: 'phonecase',
    description: 'Slim tough case with edge to edge print.',
    views: ['back'],
    printAreas: [{ id: 'back', view: 'back', name: 'Back', widthIn: 2.8, heightIn: 5.8, sizeTiers: ['small', 'medium'] }],
    sizeSystem: 'device',
    sizes: DEVICE_SIZES,
    allowedMethods: ['UV'],
    popularity: 45,
  }),
  product({
    id: 'p_cap',
    name: 'Baseball Cap',
    category: 'cap',
    description: 'Six panel cotton twill cap with curved brim.',
    views: ['front'],
    printAreas: [{ id: 'front', view: 'front', name: 'Front', widthIn: 4, heightIn: 2.5, sizeTiers: ['small'] }],
    sizeSystem: 'none',
    sizes: ['One size'],
    allowedMethods: ['embroidery', 'DTF'],
    popularity: 50,
  }),
];

// ---------- colors ----------

export const COLORS = {
  White: '#FFFFFF',
  Cream: '#F3EBD8',
  Sky: '#BFE3FF',
  Mint: '#C8F2DC',
  Black: '#141414',
  Navy: '#1D2A55',
  Maroon: '#6B1D2A',
  'Bottle Green': '#1F4D3A',
  Charcoal: '#3A3A40',
  'Heather Grey': '#B9B9C0',
  'Neon Green': '#9CFF2E',
  'Neon Pink': '#FF4FD8',
  Natural: '#EFE6D2',
  Khaki: '#C3B091',
  'Matte White': '#FAFAF7',
  'Glossy White': '#FFFFFF',
  Clear: '#E8EEF3',
} as const;
type ColorName = keyof typeof COLORS;

function groups(spec: Partial<Record<string, ColorName[]>>): ColorGroup[] {
  return Object.entries(spec).map(([name, colors]) => ({
    id: name.toLowerCase(),
    name,
    colors: (colors ?? []).map((c) => ({ name: c, hex: COLORS[c] })),
  }));
}

// ---------- offering builder ----------

const DAY_MS = 86400000;

interface OfferingSpec {
  id: string;
  vendorId: string;
  productId: string;
  status?: Offering['status'];
  blank: Offering['blank'];
  methods: PrintMethod[];
  colorGroups: ColorGroup[];
  sizes: string[]; // sizes the vendor offers
  exceptions?: { color: string; sizes: string[] }[]; // color only in these sizes
  stock?: { color: string; size: string; stock: number }[];
  overrides?: { color: string; size: string; price: number }[];
  pricing: Partial<PricingRules> & { basePrice: number; printTable: PrintTable };
  production: ProductionRules;
  delivery: DeliveryRules;
  version?: number;
}

const DEFAULT_TIERS = [
  { minQty: 1, discountPct: 0 },
  { minQty: 10, discountPct: 8 },
  { minQty: 25, discountPct: 15 },
  { minQty: 50, discountPct: 22 },
];

const APPAREL_SIZE_UP = { '2XL': 40, '3XL': 80, '4XL': 120, '5XL': 160 };

function makeOffering(s: OfferingSpec, now: Date): Offering {
  const product = PRODUCTS.find((p) => p.id === s.productId)!;
  const variants: Variant[] = [];
  for (const g of s.colorGroups) {
    for (const c of g.colors) {
      for (const size of product.sizes) {
        const exc = s.exceptions?.find((e) => e.color === c.name);
        const enabled = s.sizes.includes(size) && (!exc || exc.sizes.includes(size));
        const st = s.stock?.find((x) => x.color === c.name && x.size === size);
        const ov = s.overrides?.find((x) => x.color === c.name && x.size === size);
        variants.push({
          id: `${s.id}_${c.name}_${size}`.replace(/\s+/g, '-'),
          color: c.name,
          size,
          enabled,
          stock: st ? st.stock : 'unlimited',
          priceOverride: ov?.price,
          sku: `${s.vendorId.toUpperCase()}-${product.category.slice(0, 3).toUpperCase()}-${c.name.slice(0, 3).toUpperCase()}-${size.replace(/\s+/g, '')}`,
        });
      }
    }
  }
  const pricing: PricingRules = {
    sizeUpcharge: {},
    colorGroupUpcharge: {},
    darkGarmentPrintUpcharge: 20,
    extraAreaFee: 30,
    screen: { perInkColor: 25, setupFeePerScreen: 300 },
    embroidery: { upTo5k: 60, upTo10k: 120, upTo15k: 180, digitizingFee: 250 },
    qtyTiers: DEFAULT_TIERS,
    moq: 1,
    promotions: [],
    ...s.pricing,
  };
  return {
    id: s.id,
    vendorId: s.vendorId,
    productId: s.productId,
    status: s.status ?? 'active',
    blank: s.blank,
    methods: s.methods,
    colorGroups: s.colorGroups,
    variants,
    pricing,
    production: s.production,
    delivery: s.delivery,
    version: s.version ?? 1,
    updatedAt: new Date(now.getTime() - 5 * DAY_MS).toISOString(),
  };
}

const apparelPrint = (m: number, sleeves = true): PrintTable[PrintMethod] => {
  const r = (x: number) => Math.round((x * m) / 5) * 5;
  const face = { small: r(70), medium: r(120), large: r(180) };
  return {
    front: face,
    back: face,
    ...(sleeves ? { left_sleeve: { small: r(60) }, right_sleeve: { small: r(60) } } : {}),
  };
};
const screenPrint = (): PrintTable[PrintMethod] => ({ front: { small: 30, medium: 50, large: 70, full: 90 }, back: { small: 30, medium: 50, large: 70, full: 90 } });
const embroideryPrint = (m = 1): PrintTable[PrintMethod] => ({
  front: { small: 80 * m, medium: 150 * m },
  back: { small: 80 * m, medium: 150 * m },
  left_sleeve: { small: 70 * m },
  right_sleeve: { small: 70 * m },
});

const zones = (city: number, div: number, other: number | null): DeliveryRules['zones'] => [
  { zone: 'same_city', label: 'Same city', fee: city, days: 1, served: true },
  { zone: 'same_division', label: 'Same division', fee: div, days: 2, served: true },
  { zone: 'other', label: 'Other divisions', fee: other ?? 130, days: 3, served: other !== null },
];

// Vendor level defaults
const V1_PROD: ProductionRules = { standardDays: { DTF: 4, DTG: 4, UV: 3, sublimation: 3 }, rush: { available: false, days: 2, feePct: 25 }, dailyCapacity: 120, bookedToday: 40, cutoffTime: '14:00', weeklyOffDay: 5 };
const V1_DEL: DeliveryRules = { zones: zones(70, 100, 130), perExtraItemFee: 10, freeShippingThreshold: 3000, codAvailable: true, pickupAvailable: true };
const V2_PROD: ProductionRules = { standardDays: { DTG: 5, DTF: 4, embroidery: 6 }, rush: { available: true, days: 3, feePct: 30 }, dailyCapacity: 60, bookedToday: 20, cutoffTime: '13:00', weeklyOffDay: 5 };
const V2_DEL: DeliveryRules = { zones: zones(80, 110, 150), perExtraItemFee: 15, freeShippingThreshold: 5000, codAvailable: false, pickupAvailable: true };
const V3_PROD: ProductionRules = { standardDays: { DTF: 2, sublimation: 2, UV: 1 }, rush: { available: true, days: 1, feePct: 25 }, dailyCapacity: 40, bookedToday: 32, cutoffTime: '15:00', weeklyOffDay: 5 };
const V3_DEL: DeliveryRules = { zones: zones(60, 90, 140), perExtraItemFee: 10, freeShippingThreshold: null, codAvailable: true, pickupAvailable: true };
const V4_PROD: ProductionRules = { standardDays: { screen: 5, sublimation: 4, UV: 3 }, rush: { available: false, days: 3, feePct: 20 }, dailyCapacity: 800, bookedToday: 150, cutoffTime: '12:00', weeklyOffDay: 5 };
const V4_DEL: DeliveryRules = { zones: zones(90, 120, null), perExtraItemFee: 5, freeShippingThreshold: 8000, codAvailable: true, pickupAvailable: true };
const BULK_TIERS = [
  { minQty: 20, discountPct: 10 },
  { minQty: 50, discountPct: 20 },
  { minQty: 100, discountPct: 30 },
];

const V1_COLORS = groups({
  Light: ['White', 'Cream', 'Sky', 'Mint'],
  Dark: ['Black', 'Navy', 'Maroon', 'Bottle Green', 'Charcoal'],
  Heather: ['Heather Grey'],
  Neon: ['Neon Green', 'Neon Pink'],
});
const V2_COLORS = groups({ Light: ['White', 'Cream', 'Sky'], Dark: ['Black', 'Navy', 'Maroon', 'Bottle Green'], Heather: ['Heather Grey'] });
const V3_COLORS = groups({ Light: ['White'], Dark: ['Black', 'Navy'], Heather: ['Heather Grey'] });
const V4_COLORS = groups({ Light: ['White'], Dark: ['Black', 'Navy', 'Maroon'], Heather: ['Heather Grey'] });

function offeringSpecs(now: Date): OfferingSpec[] {
  const iso = (d: number) => new Date(now.getTime() + d * DAY_MS).toISOString();
  return [
    // ----- Dhaka Ink Lab (v1): cheapest, DTF + DTG, big color range -----
    {
      id: 'of_v1_tee',
      vendorId: 'v1',
      productId: 'p_tee',
      blank: { brand: 'Ink Lab Basics', fabric: '100% cotton', gsm: 160, fit: 'Regular', qualityTier: 'standard' },
      methods: ['DTF', 'DTG'],
      colorGroups: V1_COLORS,
      sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
      exceptions: [
        { color: 'Neon Green', sizes: ['S', 'M', 'L'] },
        { color: 'Neon Pink', sizes: ['S', 'M', 'L', 'XL'] },
      ],
      stock: [{ color: 'Black', size: 'L', stock: 7 }],
      pricing: {
        basePrice: 320,
        sizeUpcharge: { ...APPAREL_SIZE_UP },
        colorGroupUpcharge: { Light: 0, Dark: 30, Heather: 20, Neon: 50 },
        printTable: { DTF: apparelPrint(1), DTG: apparelPrint(1.1) },
        promotions: [
          { id: 'promo_v1_team', name: 'Team week: 5% off 30+', type: 'percent', value: 5, appliesTo: ['of_v1_tee'], minQty: 30, startsAt: iso(-3), endsAt: iso(10), active: true },
        ],
      },
      production: V1_PROD,
      delivery: V1_DEL,
    },
    {
      id: 'of_v1_polo',
      vendorId: 'v1',
      productId: 'p_polo',
      blank: { brand: 'Ink Lab Basics', fabric: 'Cotton pique', gsm: 200, fit: 'Regular', qualityTier: 'standard' },
      methods: ['DTF', 'DTG'],
      colorGroups: groups({ Light: ['White', 'Sky'], Dark: ['Black', 'Navy', 'Maroon'], Heather: ['Heather Grey'] }),
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      pricing: { basePrice: 480, sizeUpcharge: { ...APPAREL_SIZE_UP }, colorGroupUpcharge: { Light: 0, Dark: 30, Heather: 20 }, printTable: { DTF: apparelPrint(1), DTG: apparelPrint(1.1) } },
      production: V1_PROD,
      delivery: V1_DEL,
    },
    {
      id: 'of_v1_hoodie',
      vendorId: 'v1',
      productId: 'p_hoodie',
      blank: { brand: 'Ink Lab Fleece', fabric: 'Cotton poly fleece', gsm: 280, fit: 'Regular', qualityTier: 'standard' },
      methods: ['DTF', 'DTG'],
      colorGroups: groups({ Light: ['White', 'Cream'], Dark: ['Black', 'Navy', 'Maroon', 'Charcoal'], Heather: ['Heather Grey'] }),
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      pricing: { basePrice: 850, sizeUpcharge: { ...APPAREL_SIZE_UP }, colorGroupUpcharge: { Light: 0, Dark: 40, Heather: 20 }, printTable: { DTF: apparelPrint(1.1), DTG: apparelPrint(1.2) } },
      production: V1_PROD,
      delivery: V1_DEL,
    },
    {
      id: 'of_v1_tote',
      vendorId: 'v1',
      productId: 'p_tote',
      blank: { brand: 'Ink Lab Canvas', fabric: 'Cotton canvas', gsm: 280, fit: 'Standard', qualityTier: 'basic' },
      methods: ['DTF', 'DTG'],
      colorGroups: groups({ Light: ['Natural'], Dark: ['Black'] }),
      sizes: ['One size'],
      pricing: { basePrice: 240, colorGroupUpcharge: { Light: 0, Dark: 20 }, printTable: { DTF: { front: { small: 60, medium: 110, large: 160 } }, DTG: { front: { small: 70, medium: 120, large: 170 } } } },
      production: V1_PROD,
      delivery: V1_DEL,
    },
    {
      id: 'of_v1_mug',
      vendorId: 'v1',
      productId: 'p_mug',
      blank: { brand: 'Orca', fabric: 'Ceramic, poly coated', gsm: 0, fit: 'Standard', qualityTier: 'standard' },
      methods: ['sublimation', 'UV'],
      colorGroups: groups({ Light: ['White'], Dark: ['Black'] }),
      sizes: ['11oz', '15oz'],
      pricing: { basePrice: 220, sizeUpcharge: { '15oz': 60 }, colorGroupUpcharge: { Light: 0, Dark: 30 }, printTable: { sublimation: { wrap: { small: 50, medium: 80 } }, UV: { wrap: { small: 60, medium: 90 } } } },
      production: V1_PROD,
      delivery: V1_DEL,
    },
    {
      id: 'of_v1_case',
      vendorId: 'v1',
      productId: 'p_case',
      blank: { brand: 'ToughShell', fabric: 'Polycarbonate', gsm: 0, fit: 'Slim', qualityTier: 'standard' },
      methods: ['UV'],
      colorGroups: groups({ Light: ['Clear', 'White'], Dark: ['Black'] }),
      sizes: DEVICE_SIZES,
      pricing: { basePrice: 350, colorGroupUpcharge: { Light: 0, Dark: 0 }, printTable: { UV: { back: { small: 40, medium: 80 } } } },
      production: V1_PROD,
      delivery: V1_DEL,
    },
    {
      id: 'of_v1_cap',
      vendorId: 'v1',
      productId: 'p_cap',
      blank: { brand: 'Ink Lab Caps', fabric: 'Cotton twill', gsm: 0, fit: 'Adjustable', qualityTier: 'basic' },
      methods: ['DTF'],
      colorGroups: groups({ Light: ['White', 'Khaki'], Dark: ['Black', 'Navy'] }),
      sizes: ['One size'],
      pricing: { basePrice: 280, colorGroupUpcharge: { Light: 0, Dark: 10 }, printTable: { DTF: { front: { small: 50 } } } },
      production: V1_PROD,
      delivery: V1_DEL,
    },
    // ----- Ctg Thread Works (v2): premium, embroidery, rating 4.8, no neon -----
    {
      id: 'of_v2_tee',
      vendorId: 'v2',
      productId: 'p_tee',
      blank: { brand: 'Thread Works Premium', fabric: 'Combed cotton', gsm: 200, fit: 'Relaxed', qualityTier: 'premium' },
      methods: ['DTG', 'DTF', 'embroidery'],
      colorGroups: V2_COLORS,
      sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
      pricing: {
        basePrice: 450,
        sizeUpcharge: { ...APPAREL_SIZE_UP },
        colorGroupUpcharge: { Light: 0, Dark: 40, Heather: 30 },
        printTable: { DTG: apparelPrint(1.25), DTF: apparelPrint(1.2), embroidery: embroideryPrint() },
        darkGarmentPrintUpcharge: 30,
        extraAreaFee: 40,
      },
      production: V2_PROD,
      delivery: V2_DEL,
    },
    {
      id: 'of_v2_polo',
      vendorId: 'v2',
      productId: 'p_polo',
      blank: { brand: 'Thread Works Premium', fabric: 'Combed cotton pique', gsm: 220, fit: 'Tailored', qualityTier: 'premium' },
      methods: ['embroidery', 'DTG'],
      colorGroups: V2_COLORS,
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      pricing: { basePrice: 620, sizeUpcharge: { ...APPAREL_SIZE_UP }, colorGroupUpcharge: { Light: 0, Dark: 40, Heather: 30 }, printTable: { embroidery: embroideryPrint(), DTG: apparelPrint(1.25) }, darkGarmentPrintUpcharge: 30, extraAreaFee: 40 },
      production: V2_PROD,
      delivery: V2_DEL,
    },
    {
      id: 'of_v2_hoodie',
      vendorId: 'v2',
      productId: 'p_hoodie',
      blank: { brand: 'Thread Works Heavy', fabric: 'Brushed cotton fleece', gsm: 320, fit: 'Oversized', qualityTier: 'premium' },
      methods: ['embroidery', 'DTG', 'DTF'],
      colorGroups: groups({ Light: ['Cream'], Dark: ['Black', 'Navy', 'Bottle Green'], Heather: ['Heather Grey'] }),
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      pricing: { basePrice: 1100, sizeUpcharge: { ...APPAREL_SIZE_UP }, colorGroupUpcharge: { Light: 0, Dark: 50, Heather: 30 }, printTable: { embroidery: embroideryPrint(1.2), DTG: apparelPrint(1.3), DTF: apparelPrint(1.2) }, darkGarmentPrintUpcharge: 30, extraAreaFee: 40 },
      production: V2_PROD,
      delivery: V2_DEL,
    },
    {
      id: 'of_v2_cap',
      vendorId: 'v2',
      productId: 'p_cap',
      blank: { brand: 'Thread Works Caps', fabric: 'Brushed cotton twill', gsm: 0, fit: 'Adjustable', qualityTier: 'premium' },
      methods: ['embroidery'],
      colorGroups: groups({ Light: ['White', 'Khaki'], Dark: ['Black', 'Navy'] }),
      sizes: ['One size'],
      pricing: { basePrice: 380, colorGroupUpcharge: { Light: 0, Dark: 0 }, printTable: { embroidery: { front: { small: 90 } } } },
      production: V2_PROD,
      delivery: V2_DEL,
    },
    // ----- Sylhet Print House (v3): fastest, rush, S to XL only, limited colors -----
    {
      id: 'of_v3_tee',
      vendorId: 'v3',
      productId: 'p_tee',
      blank: { brand: 'Surma Cotton', fabric: '100% cotton', gsm: 170, fit: 'Regular', qualityTier: 'standard' },
      methods: ['DTF'],
      colorGroups: V3_COLORS,
      sizes: ['S', 'M', 'L', 'XL'],
      pricing: { basePrice: 360, sizeUpcharge: {}, colorGroupUpcharge: { Light: 0, Dark: 30, Heather: 20 }, printTable: { DTF: apparelPrint(1.05) } },
      production: V3_PROD,
      delivery: V3_DEL,
    },
    {
      id: 'of_v3_jersey',
      vendorId: 'v3',
      productId: 'p_jersey',
      blank: { brand: 'Surma Sport', fabric: '100% polyester mesh', gsm: 140, fit: 'Athletic', qualityTier: 'standard' },
      methods: ['sublimation', 'DTF'],
      colorGroups: groups({ Light: ['White', 'Sky', 'Mint'], Dark: ['Black', 'Navy'] }),
      sizes: ['S', 'M', 'L', 'XL'],
      pricing: {
        basePrice: 420,
        colorGroupUpcharge: { Light: 0, Dark: 30 },
        printTable: {
          sublimation: { front: { small: 60, medium: 100, large: 150, full: 250 }, back: { small: 60, medium: 100, large: 150, full: 250 } },
          DTF: { front: { small: 75, medium: 125, large: 190 }, back: { small: 75, medium: 125, large: 190 } },
        },
      },
      production: V3_PROD,
      delivery: V3_DEL,
    },
    {
      id: 'of_v3_poster',
      vendorId: 'v3',
      productId: 'p_poster',
      blank: { brand: 'Surma Paper', fabric: '200 gsm art paper', gsm: 200, fit: 'Standard', qualityTier: 'standard' },
      methods: ['UV'],
      colorGroups: groups({ Light: ['Matte White', 'Glossy White'] }),
      sizes: ['A4', 'A3', 'A2'],
      pricing: { basePrice: 180, sizeUpcharge: { A3: 80, A2: 180 }, colorGroupUpcharge: { Light: 0 }, printTable: { UV: { front: { medium: 60, large: 120, full: 200 } } } },
      production: V3_PROD,
      delivery: V3_DEL,
    },
    {
      id: 'of_v3_mug',
      vendorId: 'v3',
      productId: 'p_mug',
      blank: { brand: 'Surma Ceramic', fabric: 'Ceramic, poly coated', gsm: 0, fit: 'Standard', qualityTier: 'standard' },
      methods: ['sublimation'],
      colorGroups: groups({ Light: ['White'] }),
      sizes: ['11oz', '15oz'],
      pricing: { basePrice: 250, sizeUpcharge: { '15oz': 50 }, colorGroupUpcharge: { Light: 0 }, printTable: { sublimation: { wrap: { small: 50, medium: 80 } } } },
      production: V3_PROD,
      delivery: V3_DEL,
    },
    // ----- Bulk Bros (v4): screen print, big discounts, MOQ 20, paused on mugs -----
    {
      id: 'of_v4_tee',
      vendorId: 'v4',
      productId: 'p_tee',
      blank: { brand: 'Bulk Basic', fabric: '100% cotton', gsm: 150, fit: 'Regular', qualityTier: 'basic' },
      methods: ['screen'],
      colorGroups: V4_COLORS,
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      pricing: { basePrice: 260, sizeUpcharge: { ...APPAREL_SIZE_UP }, colorGroupUpcharge: { Light: 0, Dark: 20, Heather: 10 }, printTable: { screen: screenPrint() }, qtyTiers: BULK_TIERS, moq: 20 },
      production: V4_PROD,
      delivery: V4_DEL,
    },
    {
      id: 'of_v4_jersey',
      vendorId: 'v4',
      productId: 'p_jersey',
      blank: { brand: 'Bulk Sport', fabric: 'Polyester interlock', gsm: 130, fit: 'Athletic', qualityTier: 'basic' },
      methods: ['sublimation', 'screen'],
      colorGroups: groups({ Light: ['White', 'Sky'], Dark: ['Black', 'Navy', 'Maroon'] }),
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      pricing: {
        basePrice: 340,
        sizeUpcharge: { ...APPAREL_SIZE_UP },
        colorGroupUpcharge: { Light: 0, Dark: 20 },
        printTable: { sublimation: { front: { small: 50, medium: 80, large: 120, full: 200 }, back: { small: 50, medium: 80, large: 120, full: 200 } }, screen: screenPrint() },
        qtyTiers: BULK_TIERS,
        moq: 20,
      },
      production: V4_PROD,
      delivery: V4_DEL,
    },
    {
      id: 'of_v4_mug',
      vendorId: 'v4',
      productId: 'p_mug',
      status: 'paused',
      blank: { brand: 'Bulk Ceramic', fabric: 'Ceramic, poly coated', gsm: 0, fit: 'Standard', qualityTier: 'basic' },
      methods: ['sublimation'],
      colorGroups: groups({ Light: ['White'] }),
      sizes: ['11oz'],
      pricing: { basePrice: 180, colorGroupUpcharge: { Light: 0 }, printTable: { sublimation: { wrap: { small: 40, medium: 60 } } }, qtyTiers: BULK_TIERS, moq: 20 },
      production: V4_PROD,
      delivery: V4_DEL,
    },
  ];
}

// ---------- vendors ----------

function vendors(now: Date): Vendor[] {
  const joined = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  const setupDone = { profile: true, location: true, payout: true, firstOffering: true, deliveryZones: true, live: true };
  const base = { status: 'active' as const, setup: setupDone, setupProgress: 100, pausedMessage: '', weeklyOffDay: 5, notificationPrefs: { email: true, sms: true, push: true } };
  return [
    { ...base, id: 'v1', shopName: 'Dhaka Ink Lab', logo: 'DI', logoColor: '#6D4AFF', cover: '/stock/vendor-dhaka.jpg', location: { division: 'Dhaka', city: 'Dhaka' }, about: 'Fast DTF and DTG studio in Tejgaon. Biggest color range in the city and prices that make sense for one piece or fifty.', rating: 4.2, reviewCount: 214, payoutBalance: 18450, payoutMethod: 'bKash 01711-000111', badges: ['Best price', 'Big color range'], joinedAt: joined(420), onTimeRate: 91 },
    { ...base, id: 'v2', shopName: 'Ctg Thread Works', logo: 'CT', logoColor: '#0FB5A6', cover: '/stock/vendor-ctg.jpg', location: { division: 'Chattogram', city: 'Chattogram' }, about: 'Premium 200 GSM blanks, careful embroidery and DTG. We check every piece by hand before it leaves Agrabad.', rating: 4.8, reviewCount: 132, payoutBalance: 26400, payoutMethod: 'Bank: City Bank ****2231', badges: ['Premium blanks', 'Embroidery'], joinedAt: joined(610), onTimeRate: 97 },
    { ...base, id: 'v3', shopName: 'Sylhet Print House', logo: 'SP', logoColor: '#FF3D8B', cover: '/stock/vendor-sylhet.jpg', location: { division: 'Sylhet', city: 'Sylhet' }, about: 'Two day turnaround and next day rush from Zindabazar. Sublimation jerseys are our favorite job.', rating: 4.5, reviewCount: 88, payoutBalance: 9200, payoutMethod: 'Nagad 01811-222333', badges: ['Fast', 'Rush available'], joinedAt: joined(300), onTimeRate: 95 },
    { ...base, id: 'v4', shopName: 'Bulk Bros', logo: 'BB', logoColor: '#FF7A1A', cover: '/stock/vendor-bulk.jpg', location: { division: 'Dhaka', city: 'Gazipur' }, about: 'Screen printing at factory scale in Gazipur. Teams, events and offices: the more you order, the less you pay.', rating: 4.4, reviewCount: 9, payoutBalance: 41200, payoutMethod: 'Bank: BRAC Bank ****7710', badges: ['Bulk friendly'], joinedAt: joined(90), onTimeRate: 88 },
  ];
}

// ---------- designers and designs ----------

function designers(): Designer[] {
  return [
    { id: 'd1', name: 'Nusrat Jahan', avatar: '/stock/designer-1.jpg', cover: '/designs/stock-13.jpg', bio: 'Illustrator from Dhaka. Cozy animals, soft colors and a lot of tea.', tags: ['illustration', 'cute', 'animals'], rating: 4.9, reviewCount: 64, acceptsRequests: true, startingPrice: 1500, turnaroundDays: 3, revisionLimit: 2, extraRevisionFee: 400, earnings: 48200, onboarded: true, followers: 1240, location: { division: 'Dhaka', city: 'Dhaka' } },
    { id: 'd2', name: 'Arif Hossain', avatar: '/stock/designer-2.jpg', cover: '/designs/stock-4.jpg', bio: 'Vintage labels, hand lettering and retro type for brands that want to look like they have been around forever.', tags: ['vintage', 'typography', 'retro'], rating: 4.7, reviewCount: 41, acceptsRequests: true, startingPrice: 2500, turnaroundDays: 4, revisionLimit: 3, extraRevisionFee: 600, earnings: 61800, onboarded: true, followers: 980, location: { division: 'Chattogram', city: 'Chattogram' } },
    { id: 'd3', name: 'Tasnim Rahman', avatar: '/stock/designer-3.jpg', cover: '/designs/sundarbans.svg', bio: 'Minimal line art and Bangladeshi motifs. Less ink, more meaning.', tags: ['minimal', 'bangladesh', 'line art'], rating: 4.6, reviewCount: 23, acceptsRequests: true, startingPrice: 1200, turnaroundDays: 2, revisionLimit: 2, extraRevisionFee: 300, earnings: 22100, onboarded: true, followers: 610, location: { division: 'Sylhet', city: 'Sylhet' } },
    { id: 'd4', name: 'Rafiq Islam', avatar: '/stock/designer-4.jpg', cover: '/designs/team-tigers.svg', bio: 'Sports crests, jerseys and team kits. Cricket first, football second.', tags: ['sports', 'jersey', 'badge'], rating: 4.5, reviewCount: 18, acceptsRequests: true, startingPrice: 2000, turnaroundDays: 3, revisionLimit: 2, extraRevisionFee: 500, earnings: 30500, onboarded: true, followers: 450, location: { division: 'Dhaka', city: 'Dhaka' } },
    { id: 'd5', name: 'Maliha Chowdhury', avatar: '/stock/designer-5.jpg', cover: '/designs/good-vibes.svg', bio: 'Bold pop type and kawaii characters. If it makes you smile, I made it right.', tags: ['pop', 'kawaii', 'typography'], rating: 4.8, reviewCount: 35, acceptsRequests: false, startingPrice: 1800, turnaroundDays: 5, revisionLimit: 2, extraRevisionFee: 450, earnings: 39900, onboarded: true, followers: 1510, location: { division: 'Rajshahi', city: 'Rajshahi' } },
  ];
}

const APPAREL: Design['compatibleCategories'] = ['tshirt', 'polo', 'hoodie', 'jersey', 'tote', 'mug', 'poster', 'phonecase'];
const ALL_CATS: Design['compatibleCategories'] = [...APPAREL, 'cap'];

interface DesignSeed {
  id: string;
  designerId: string;
  title: string;
  src: string;
  tags: string[];
  royalty: number;
  palette: string[];
  status?: Design['status'];
  isPrivate?: boolean;
  owner?: string;
  uses: number;
  cats?: Design['compatibleCategories'];
  daysAgo: number;
}

const DESIGN_SEEDS: DesignSeed[] = [
  { id: 'ds_01', designerId: 'd2', title: 'Sunset Retro', src: '/designs/stock-1.jpg', tags: ['retro', 'sunset', 'outdoor'], royalty: 60, palette: ['#f2a65a', '#d9534f', '#3b2f63', '#f7e3af'], uses: 312, daysAgo: 120 },
  { id: 'ds_02', designerId: 'd1', title: 'Cosmic Octopus', src: '/designs/stock-2.jpg', tags: ['illustration', 'space', 'animals'], royalty: 80, palette: ['#1b2a4a', '#f08a5d', '#b83b5e', '#6a2c70', '#f9ed69'], uses: 188, daysAgo: 90 },
  { id: 'ds_03', designerId: 'd2', title: 'Winged Skull and Roses', src: '/designs/stock-3.jpg', tags: ['tattoo', 'vintage', 'skull'], royalty: 90, palette: ['#111', '#c0392b', '#f5e6c8', '#2c3e50'], uses: 140, daysAgo: 60 },
  { id: 'ds_04', designerId: 'd2', title: 'Heritage Label', src: '/designs/stock-4.jpg', tags: ['vintage', 'typography', 'label'], royalty: 70, palette: ['#e8d8b0', '#1a1a1a'], uses: 96, daysAgo: 150 },
  { id: 'ds_05', designerId: 'd3', title: 'Enjoy the Journey', src: '/designs/stock-5.jpg', tags: ['travel', 'minimal', 'mountains'], royalty: 50, palette: ['#2d4059', '#ea5455', '#f07b3f'], uses: 205, daysAgo: 45 },
  { id: 'ds_06', designerId: 'd2', title: 'Gangster Monkey', src: '/designs/stock-6.jpg', tags: ['streetwear', 'animals', 'illustration'], royalty: 100, palette: ['#111', '#f5f5f5', '#c0392b', '#f1c40f'], uses: 77, daysAgo: 30, status: 'flagged' },
  { id: 'ds_07', designerId: 'd2', title: 'California Bear', src: '/designs/stock-7.jpg', tags: ['vintage', 'bear', 'label'], royalty: 60, palette: ['#e8d8b0', '#1a1a1a', '#b03a2e'], uses: 150, daysAgo: 80 },
  { id: 'ds_08', designerId: 'd4', title: 'Street Artist', src: '/designs/stock-8.jpg', tags: ['streetwear', 'urban'], royalty: 70, palette: ['#111', '#f5f5f5', '#e74c3c'], uses: 64, daysAgo: 25 },
  { id: 'ds_09', designerId: 'd3', title: 'Mountains Are Calling', src: '/designs/stock-9.jpg', tags: ['outdoor', 'mountains', 'minimal'], royalty: 50, palette: ['#264653', '#2a9d8f', '#e9c46a'], uses: 230, daysAgo: 200 },
  { id: 'ds_10', designerId: 'd4', title: 'Gorilla Power', src: '/designs/stock-10.jpg', tags: ['streetwear', 'animals', 'sports'], royalty: 80, palette: ['#111', '#f5f5f5', '#8e44ad', '#f39c12'], uses: 58, daysAgo: 20 },
  { id: 'ds_11', designerId: 'd1', title: 'Surf Skeleton', src: '/designs/stock-11.jpg', tags: ['summer', 'skull', 'illustration'], royalty: 60, palette: ['#f6d55c', '#3caea3', '#20639b', '#ed553b'], uses: 102, daysAgo: 70, status: 'unpublished' },
  { id: 'ds_12', designerId: 'd2', title: 'Forest Skull', src: '/designs/stock-12.jpg', tags: ['vintage', 'nature', 'skull'], royalty: 90, palette: ['#1e3d2f', '#e8d8b0', '#111'], uses: 44, daysAgo: 15 },
  { id: 'ds_13', designerId: 'd1', title: 'Cozy Fox', src: '/designs/stock-13.jpg', tags: ['cute', 'animals', 'autumn'], royalty: 60, palette: ['#e67e22', '#f5f5f5', '#27ae60', '#6d4c41'], uses: 260, daysAgo: 12 },
  { id: 'ds_14', designerId: 'd1', title: 'Sloth in a Hat', src: '/designs/stock-14.jpg', tags: ['cute', 'animals', 'watercolor'], royalty: 50, palette: ['#a1887f', '#ffcc80', '#81c784', '#5d4037'], uses: 175, daysAgo: 40 },
  { id: 'ds_15', designerId: 'd5', title: 'Wizard Cat', src: '/designs/stock-15.jpg', tags: ['kawaii', 'cat', 'magic'], royalty: 70, palette: ['#111', '#f5f5f5'], uses: 199, daysAgo: 33 },
  { id: 'ds_16', designerId: 'd4', title: 'Tiger Gamer', src: '/designs/stock-16.jpg', tags: ['gaming', 'tiger', 'badge'], royalty: 80, palette: ['#111', '#f5f5f5'], uses: 121, daysAgo: 28 },
  { id: 'ds_17', designerId: 'd5', title: 'Panda Unicorn', src: '/designs/stock-17.jpg', tags: ['kawaii', 'cute', 'animals'], royalty: 60, palette: ['#f8bbd0', '#b39ddb', '#111', '#fff59d'], uses: 90, daysAgo: 18, status: 'flagged' },
  { id: 'ds_18', designerId: 'd5', title: 'Rainbow Bear', src: '/designs/stock-18.jpg', tags: ['pop', 'bear', 'colorful'], royalty: 60, palette: ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'], uses: 66, daysAgo: 9 },
  { id: 'ds_19', designerId: 'd5', title: 'Dhaka Vibes', src: '/designs/dhaka-vibes.svg', tags: ['bangladesh', 'city', 'pop'], royalty: 60, palette: ['#FF3D8B', '#FFB547', '#1B1340'], uses: 420, daysAgo: 100 },
  { id: 'ds_20', designerId: 'd3', title: 'Cha Break', src: '/designs/cha-break.svg', tags: ['bangladesh', 'tea', 'minimal'], royalty: 40, palette: ['#C8773A', '#6D4AFF'], uses: 380, daysAgo: 95 },
  { id: 'ds_21', designerId: 'd3', title: 'Rickshaw Art', src: '/designs/rickshaw-art.svg', tags: ['bangladesh', 'pattern', 'folk'], royalty: 70, palette: ['#FFE14D', '#E4002B', '#0A8F5B'], uses: 290, daysAgo: 85 },
  { id: 'ds_22', designerId: 'd4', title: 'Bengal Tiger', src: '/designs/bengal-tiger.svg', tags: ['tiger', 'bangladesh', 'sports'], royalty: 80, palette: ['#FF7A1A', '#1A1A1A', '#FFE14D'], uses: 510, daysAgo: 140 },
  { id: 'ds_23', designerId: 'd3', title: 'Monsoon Mood', src: '/designs/monsoon-mood.svg', tags: ['weather', 'minimal', 'bangladesh'], royalty: 40, palette: ['#3B82F6', '#0FB5A6'], uses: 150, daysAgo: 50 },
  { id: 'ds_24', designerId: 'd5', title: 'Code and Chai', src: '/designs/code-chai.svg', tags: ['tech', 'typography', 'tea'], royalty: 50, palette: ['#16A34A', '#1B1340', '#FF3D8B'], uses: 270, daysAgo: 60, status: 'unpublished' },
  { id: 'ds_25', designerId: 'd4', title: 'Cricket Fever', src: '/designs/cricket-fever.svg', tags: ['cricket', 'sports', 'bangladesh'], royalty: 60, palette: ['#E4002B', '#006A4E', '#ffffff'], uses: 640, daysAgo: 160 },
  { id: 'ds_26', designerId: 'd3', title: 'Sundarbans', src: '/designs/sundarbans.svg', tags: ['nature', 'bangladesh', 'outdoor'], royalty: 60, palette: ['#0B5D3B', '#FFB547', '#06341F', '#3B82F6', '#ffffff'], uses: 210, daysAgo: 75 },
  { id: 'ds_27', designerId: 'd5', title: 'Good Vibes Only', src: '/designs/good-vibes.svg', tags: ['pop', 'typography', 'quote'], royalty: 40, palette: ['#FF3D8B', '#FFB547', '#6D4AFF'], uses: 330, daysAgo: 55 },
  // private commissioned designs (from completed requests)
  { id: 'ds_28', designerId: 'd4', title: 'Tigers FC Crest', src: '/designs/team-tigers.svg', tags: ['team', 'badge'], royalty: 0, palette: ['#1D2A55', '#FF7A1A', '#ffffff'], uses: 1, daysAgo: 20, isPrivate: true, owner: 'c1' },
  { id: 'ds_29', designerId: 'd1', title: 'Stay Wild Club', src: '/designs/stay-wild.svg', tags: ['club', 'outdoor'], royalty: 0, palette: ['#6D4AFF', '#FF3D8B', '#ffffff'], uses: 1, daysAgo: 35, isPrivate: true, owner: 'c2' },
  { id: 'ds_30', designerId: 'd5', title: 'Smile Club Office Tee', src: '/designs/smile-club.svg', tags: ['office', 'event'], royalty: 0, palette: ['#FFE14D', '#1B1340'], uses: 1, daysAgo: 50, isPrivate: true, owner: 'c1' },
];

function designs(now: Date): Design[] {
  return DESIGN_SEEDS.map((d) => {
    const svg = d.src.endsWith('.svg');
    return {
      id: d.id,
      designerId: d.designerId,
      title: d.title,
      description: `${d.title} by ${designers().find((x) => x.id === d.designerId)?.name}. ${svg ? 'Vector artwork, prints sharp at any size.' : 'High resolution artwork on its original background.'}`,
      files: svg ? { src: d.src, widthPx: 3600, heightPx: 3600, transparent: true, kind: 'svg' } : { src: d.src, widthPx: 3000, heightPx: 3000, transparent: false, kind: 'jpg' },
      tags: d.tags,
      compatibleCategories: d.cats ?? (svg ? ALL_CATS : APPAREL),
      royalty: { type: 'fixed', amount: d.royalty },
      status: d.status ?? 'published',
      uses: d.uses,
      createdAt: new Date(now.getTime() - d.daysAgo * DAY_MS).toISOString(),
      isPrivate: !!d.isPrivate,
      ownerCustomerId: d.owner,
      palette: d.palette,
    };
  });
}

// ---------- customers ----------

function customers(): Customer[] {
  const addr = (id: string, label: string, name: string, phone: string, division: Address['division'], city: string, area: string, line: string): Address => ({ id, label, name, phone, division, city, area, line });
  return [
    {
      id: 'c1',
      name: 'Ayesha Karim',
      avatar: 'AK',
      email: 'ayesha@example.com',
      addresses: [addr('a_c1_home', 'Home', 'Ayesha Karim', '01712-345678', 'Dhaka', 'Dhaka', 'Dhanmondi', 'House 12, Road 7A'), addr('a_c1_office', 'Office', 'Ayesha Karim', '01712-345678', 'Dhaka', 'Dhaka', 'Gulshan 1', 'Level 5, Tower 3')],
      defaultAddressId: 'a_c1_home',
      favorites: ['ds_19', 'ds_13'],
      savedPayments: [{ id: 'pm_c1_1', method: 'bkash', label: 'bKash 01712-345678' }],
    },
    {
      id: 'c2',
      name: 'Tanvir Ahmed',
      avatar: 'TA',
      email: 'tanvir@example.com',
      addresses: [addr('a_c2_home', 'Home', 'Tanvir Ahmed', '01813-222444', 'Chattogram', 'Chattogram', 'Agrabad', 'Flat 4B, CDA Avenue')],
      defaultAddressId: 'a_c2_home',
      favorites: ['ds_25'],
      savedPayments: [{ id: 'pm_c2_1', method: 'card', label: 'Visa ending 4421' }],
    },
    {
      id: 'c3',
      name: 'Sadia Islam',
      avatar: 'SI',
      email: 'sadia@example.com',
      addresses: [addr('a_c3_home', 'Home', 'Sadia Islam', '01914-777888', 'Sylhet', 'Sylhet', 'Zindabazar', 'House 5, Lamabazar Road')],
      defaultAddressId: 'a_c3_home',
      favorites: [],
      savedPayments: [{ id: 'pm_c3_1', method: 'nagad', label: 'Nagad 01914-777888' }],
    },
  ];
}

export const PERSONAS: Persona[] = [
  { id: 'c1', role: 'customer', name: 'Ayesha Karim', subtitle: 'Customer, Dhaka', avatar: 'AK' },
  { id: 'c2', role: 'customer', name: 'Tanvir Ahmed', subtitle: 'Customer, Chattogram', avatar: 'TA' },
  { id: 'c3', role: 'customer', name: 'Sadia Islam', subtitle: 'Customer, Sylhet', avatar: 'SI' },
  { id: 'v1', role: 'vendor', name: 'Dhaka Ink Lab', subtitle: 'Vendor, Dhaka', avatar: 'DI' },
  { id: 'v2', role: 'vendor', name: 'Ctg Thread Works', subtitle: 'Vendor, Chattogram', avatar: 'CT' },
  { id: 'v3', role: 'vendor', name: 'Sylhet Print House', subtitle: 'Vendor, Sylhet', avatar: 'SP' },
  { id: 'v4', role: 'vendor', name: 'Bulk Bros', subtitle: 'Vendor, Gazipur', avatar: 'BB' },
  { id: 'd1', role: 'designer', name: 'Nusrat Jahan', subtitle: 'Designer, illustration', avatar: '/stock/designer-1.jpg' },
  { id: 'd2', role: 'designer', name: 'Arif Hossain', subtitle: 'Designer, vintage type', avatar: '/stock/designer-2.jpg' },
  { id: 'd3', role: 'designer', name: 'Tasnim Rahman', subtitle: 'Designer, minimal', avatar: '/stock/designer-3.jpg' },
  { id: 'd4', role: 'designer', name: 'Rafiq Islam', subtitle: 'Designer, sports', avatar: '/stock/designer-4.jpg' },
  { id: 'd5', role: 'designer', name: 'Maliha Chowdhury', subtitle: 'Designer, pop', avatar: '/stock/designer-5.jpg' },
  { id: 'a1', role: 'admin', name: 'Platform Admin', subtitle: 'Operations', avatar: 'PA' },
];

// ---------- customization helpers (also used by the worked example test) ----------

export function designLayer(id: string, designId: string, areaId: string, x: number, y: number, w: number, h: number, src: string): Layer {
  return { id, kind: 'design', designId, src, printAreaId: areaId, x, y, widthIn: w, heightIn: h, rotation: 0, outOfBounds: false, pxWidth: 3600, pxHeight: 3600 };
}

export function textLayer(id: string, text: string, areaId: string, x: number, y: number, w: number, h: number, fill = '#FFFFFF'): Layer {
  return { id, kind: 'text', text, font: 'Space Grotesk', fill, fontSize: 48, align: 'center', letterSpacing: 0, outline: null, printAreaId: areaId, x, y, widthIn: w, heightIn: h, rotation: 0, outOfBounds: false };
}

/** The worked example of section 7.9. */
export function workedExampleCustomization(): Customization {
  return {
    productId: 'p_tee',
    color: 'Black',
    layers: [designLayer('l_front', 'ds_01', 'front', 1, 1, 10, 12, '/designs/stock-1.jpg'), textLayer('l_back', 'AYESHA 07', 'back', 4, 1, 4, 1.5)],
  };
}

function line(id: string, c: Customization, offeringId: string, method: PrintMethod, sizes: Record<string, number>, addedAt: string, rush = false): CartLine {
  return { id, customization: c, offeringId, method, sizeBreakdown: sizes, rush, priceSnapshot: { unitAvg: 0, lineTotal: 0, offeringVersion: 1, quotedAt: addedAt }, acceptedLowQuality: false, addedAt };
}

const frontDesign = (productId: string, color: string, designId: string, src: string, w = 8, h = 8, x = 2, y = 2): Customization => ({
  productId,
  color,
  layers: [designLayer(`l_${designId}_${productId}`, designId, 'front', x, y, w, h, src)],
});

// ---------- the seed ----------

export function createSeed(now: Date = new Date()): AppData {
  const iso = (days: number, hours = 0) => new Date(now.getTime() + days * DAY_MS + hours * 3600000).toISOString();
  const data: AppData = {
    products: Object.fromEntries(PRODUCTS.map((p) => [p.id, p])),
    vendors: Object.fromEntries(vendors(now).map((v) => [v.id, v])),
    offerings: Object.fromEntries(offeringSpecs(now).map((s) => [s.id, makeOffering(s, now)])),
    designers: Object.fromEntries(designers().map((d) => [d.id, d])),
    designs: Object.fromEntries(designs(now).map((d) => [d.id, d])),
    customers: Object.fromEntries(customers().map((c) => [c.id, c])),
    admins: { a1: { id: 'a1', name: 'Platform Admin', avatar: 'PA' } },
    orders: {},
    subOrders: {},
    requests: {},
    carts: { c1: [], c2: [], c3: [] },
    reviews: [],
    reports: [],
    notifications: [],
    payouts: [],
    settings: { commissionPct: 12, requestFeePct: 10, codFeePct: 1, usdRate: 120, fromPrice: { colorGroup: 'Light', size: 'M', tier: 'medium', view: 'front' } },
    seq: 1040,
  };

  // ----- orders: one per status, built through the real engine -----
  type OrderSeed = {
    customerId: string;
    daysAgo: number;
    lines: CartLine[];
    payment: 'bkash' | 'nagad' | 'card' | 'cod';
    status: SubOrder['status'];
    extra?: (s: SubOrder) => void;
  };
  const d = data.designs;
  const seeds: OrderSeed[] = [
    { customerId: 'c1', daysAgo: 0.1, payment: 'bkash', status: 'placed', lines: [line('sl1', frontDesign('p_tee', 'White', 'ds_19', d.ds_19.files.src), 'of_v1_tee', 'DTF', { M: 1, L: 1 }, iso(-0.1))] },
    { customerId: 'c2', daysAgo: 1, payment: 'card', status: 'accepted', lines: [line('sl2', frontDesign('p_polo', 'Navy', 'ds_28', d.ds_28.files.src, 3.5, 3.5, 0.5, 0.5), 'of_v2_polo', 'embroidery', { M: 2, L: 2 }, iso(-1))] },
    { customerId: 'c1', daysAgo: 2, payment: 'bkash', status: 'in_production', lines: [line('sl3', frontDesign('p_hoodie', 'Black', 'ds_22', d.ds_22.files.src), 'of_v1_hoodie', 'DTF', { L: 1 }, iso(-2))] },
    { customerId: 'c3', daysAgo: 2, payment: 'nagad', status: 'quality_check', lines: [line('sl4', frontDesign('p_jersey', 'White', 'ds_25', d.ds_25.files.src, 10, 12), 'of_v3_jersey', 'sublimation', { S: 3, M: 4, L: 3 }, iso(-2))] },
    { customerId: 'c1', daysAgo: 4, payment: 'cod', status: 'shipped', lines: [line('sl5', { productId: 'p_mug', color: 'White', layers: [designLayer('lm', 'ds_20', 'wrap', 0.5, 0.25, 3, 3, d.ds_20.files.src)] }, 'of_v1_mug', 'sublimation', { '11oz': 2 }, iso(-4))] },
    { customerId: 'c3', daysAgo: 6, payment: 'nagad', status: 'delivered', lines: [line('sl6', frontDesign('p_tee', 'Heather Grey', 'ds_21', d.ds_21.files.src), 'of_v3_tee', 'DTF', { M: 1 }, iso(-6))] },
    { customerId: 'c1', daysAgo: 20, payment: 'bkash', status: 'completed', lines: [line('sl7', { productId: 'p_tee', color: 'Navy', layers: [designLayer('lc', 'ds_28', 'front', 2, 2, 8, 8, d.ds_28.files.src)] }, 'of_v4_tee', 'screen', { M: 8, L: 8, XL: 6 }, iso(-20))] },
    { customerId: 'c2', daysAgo: 3, payment: 'card', status: 'rejected_by_vendor', lines: [line('sl8', frontDesign('p_tee', 'Cream', 'ds_13', d.ds_13.files.src), 'of_v2_tee', 'DTG', { L: 1 }, iso(-3))], extra: (s) => (s.rejectReason = 'Out of Cream blanks this week, sorry.') },
    { customerId: 'c3', daysAgo: 5, payment: 'nagad', status: 'cancelled_by_customer', lines: [line('sl9', { productId: 'p_poster', color: 'Matte White', layers: [designLayer('lp', 'ds_26', 'front', 1, 1, 14, 20, d.ds_26.files.src)] }, 'of_v3_poster', 'UV', { A3: 1 }, iso(-5))] },
    { customerId: 'c2', daysAgo: 9, payment: 'card', status: 'issue_reported', lines: [line('sl10', frontDesign('p_hoodie', 'Heather Grey', 'ds_04', d.ds_04.files.src), 'of_v2_hoodie', 'DTG', { XL: 1 }, iso(-9))] },
  ];

  const flow: SubOrder['status'][] = ['placed', 'accepted', 'in_production', 'quality_check', 'shipped', 'delivered', 'completed'];
  const vendorName = (id: string) => data.vendors[id].shopName;

  seeds.forEach((s, i) => {
    const placedAt = new Date(now.getTime() - s.daysAgo * DAY_MS);
    const cust = data.customers[s.customerId];
    const addr = cust.addresses[0];
    const res = buildOrder(data, s.customerId, s.lines, addr, s.payment, {}, placedAt, `PL-${1001 + i}`);
    if (!res.ok) throw new Error('Seed order failed: ' + res.reasons.join(', '));
    const { order, subOrders } = res.built;
    const sub = subOrders[0];
    const step = (h: number) => new Date(placedAt.getTime() + h * 3600000).toISOString();
    const targetIdx = flow.indexOf(s.status);
    const upTo = targetIdx >= 0 ? targetIdx : s.status === 'issue_reported' ? flow.indexOf('delivered') : 0;
    const labels: Record<string, string> = { accepted: 'Accepted by shop', in_production: 'Printing started', quality_check: 'Quality check', shipped: 'Handed to courier', delivered: 'Delivered', completed: 'Completed' };
    for (let k = 1; k <= upTo; k++) {
      const st = flow[k];
      const actor = st === 'completed' ? 'system' : 'vendor';
      sub.timeline.push(tl(actor, actor === 'system' ? 'Printloom' : vendorName(sub.vendorId), labels[st], step(k * 14), st));
    }
    sub.status = s.status;
    if (upTo >= flow.indexOf('delivered')) sub.deliveredAt = step(flow.indexOf('delivered') * 14);
    if (s.status === 'rejected_by_vendor') sub.timeline.push(tl('vendor', vendorName(sub.vendorId), 'Rejected by shop', step(5), 'rejected_by_vendor', 'Out of Cream blanks this week, sorry.'));
    if (s.status === 'cancelled_by_customer') {
      sub.timeline.push(tl('customer', cust.name, 'Cancelled by customer', step(2), 'cancelled_by_customer', 'Ordered the wrong size'));
      order.payment.status = 'refunded';
      sub.refundAmount = sub.total;
    }
    if (s.status === 'issue_reported') {
      sub.issue = { type: 'print_quality', photos: ['/designs/stock-4.jpg'], note: 'The print is cracking after the first wash.', desired: 'reprint', status: 'open', reportedAt: step(100) };
      sub.timeline.push(tl('customer', cust.name, 'Issue reported: print quality', step(100), 'issue_reported'));
    }
    if (s.status === 'completed') sub.reviewed = true;
    s.extra?.(sub);
    data.orders[order.id] = order;
    subOrders.forEach((x) => (data.subOrders[x.id] = x));
    // consume capacity etc. is not needed for history
  });

  // ----- a cart for Ayesha with the worked example and a second vendor -----
  data.carts.c1 = [
    line('cl_1', workedExampleCustomization(), 'of_v1_tee', 'DTF', { M: 6, '2XL': 4 }, iso(-0.05)),
    line('cl_2', { productId: 'p_mug', color: 'White', layers: [designLayer('lm2', 'ds_13', 'wrap', 0.5, 0.25, 3, 3, d.ds_13.files.src)] }, 'of_v3_mug', 'sublimation', { '11oz': 2 }, iso(-0.04)),
  ];
  // snapshot prices through the engine
  for (const cid of Object.keys(data.carts)) {
    const addr = data.customers[cid].addresses[0];
    data.carts[cid] = data.carts[cid].map((l) => {
      const res = buildOrder(data, cid, [l], addr, 'bkash', {}, now, 'tmp');
      if (!res.ok) return l;
      const q = res.built.subOrders[0].lines[0].quote;
      return { ...l, priceSnapshot: { unitAvg: q.unitAvg, lineTotal: q.lineTotal, offeringVersion: q.offeringVersion, quotedAt: now.toISOString() } };
    });
  }

  // ----- design requests -----
  const req = (r: Partial<DesignRequest> & Pick<DesignRequest, 'id' | 'customerId' | 'title' | 'brief' | 'status' | 'productId'>): DesignRequest => ({
    designerId: null,
    refs: [],
    styleTags: [],
    use: 'Personal',
    budget: { min: 1500, max: 3000 },
    deadline: iso(7),
    proposals: [],
    messages: [],
    deliveries: [],
    revisionsUsed: 0,
    revisionLimit: 2,
    extraRevisionFee: 400,
    extraRevisionsPaid: 0,
    escrowAmount: 0,
    timeline: [],
    createdAt: iso(-3),
    ...r,
  });
  const requests: DesignRequest[] = [
    req({ id: 'rq_1', customerId: 'c1', title: 'Logo for my home bakery', brief: 'A cute cupcake mascot with the name "Mishti Bites". Pastel colors, friendly, works on aprons and boxes.', status: 'open', productId: 'p_tee', use: 'Small business', styleTags: ['cute', 'illustration'], budget: { min: 1500, max: 2500 }, deadline: iso(6), createdAt: iso(-1), timeline: [tl('customer', 'Ayesha Karim', 'Posted publicly', iso(-1), 'open')] }),
    req({
      id: 'rq_2',
      customerId: 'c2',
      title: 'Crest for Agrabad Cricket Club',
      brief: 'Shield shaped crest with a bat, a ball and the club initials ACC. Green and red. Will go on jerseys and caps.',
      status: 'proposals_received',
      productId: 'p_jersey',
      use: 'Team kit',
      styleTags: ['sports', 'badge'],
      budget: { min: 2000, max: 4000 },
      deadline: iso(8),
      createdAt: iso(-2),
      proposals: [
        { id: 'pp_1', designerId: 'd4', price: 3000, days: 3, note: 'I have done 20+ club crests. Three concepts, then we polish one.', sampleDesignId: 'ds_22', status: 'pending', at: iso(-1.5) },
        { id: 'pp_2', designerId: 'd2', price: 3800, days: 4, note: 'Vintage badge approach, looks classic for decades.', sampleDesignId: 'ds_04', status: 'pending', at: iso(-1) },
      ],
      timeline: [tl('customer', 'Tanvir Ahmed', 'Posted publicly', iso(-2), 'open'), tl('designer', 'Rafiq Islam', 'Proposal received', iso(-1.5), 'proposals_received')],
    }),
    req({ id: 'rq_3', customerId: 'c3', designerId: 'd3', title: 'Minimal tea garden line art', brief: 'Single line drawing of Sylhet tea hills for a tote bag. Only one ink color.', status: 'sent', productId: 'p_tote', use: 'Gift', styleTags: ['minimal', 'line art'], budget: { min: 1000, max: 1500 }, deadline: iso(5), createdAt: iso(-0.5), timeline: [tl('customer', 'Sadia Islam', 'Sent to Tasnim Rahman', iso(-0.5), 'sent')] }),
    req({
      id: 'rq_4',
      customerId: 'c1',
      designerId: 'd1',
      title: 'Cat mascot for book club',
      brief: 'A sleepy cat reading a book, for our book club hoodies. Warm colors.',
      status: 'in_progress',
      productId: 'p_hoodie',
      use: 'Club merch',
      styleTags: ['cute', 'animals'],
      budget: { min: 1500, max: 2000 },
      createdAt: iso(-4),
      proposals: [{ id: 'pp_3', designerId: 'd1', price: 1800, days: 3, note: 'Love this idea! Sketch in 2 days.', status: 'accepted', at: iso(-3.5) }],
      acceptedProposalId: 'pp_3',
      escrowAmount: 1800,
      messages: [
        { id: 'm1', from: 'customer', authorId: 'c1', text: 'Could the cat wear round glasses?', at: iso(-3) },
        { id: 'm2', from: 'designer', authorId: 'd1', text: 'Absolutely, adding them now.', at: iso(-2.9) },
      ],
      timeline: [tl('customer', 'Ayesha Karim', 'Sent to Nusrat Jahan', iso(-4), 'sent'), tl('customer', 'Ayesha Karim', 'Proposal accepted, ৳1,800 held in escrow', iso(-3.4), 'accepted'), tl('designer', 'Nusrat Jahan', 'Work started', iso(-3.3), 'in_progress')],
    }),
    req({
      id: 'rq_5',
      customerId: 'c2',
      designerId: 'd5',
      title: 'Office party tee',
      brief: 'Fun "Deploy Friday" slogan for our dev team party.',
      status: 'delivered',
      productId: 'p_tee',
      use: 'Event',
      styleTags: ['pop', 'typography'],
      budget: { min: 1800, max: 2500 },
      createdAt: iso(-6),
      proposals: [{ id: 'pp_4', designerId: 'd5', price: 2200, days: 3, note: 'Bold pop type, I will send two colorways.', status: 'accepted', at: iso(-5.5) }],
      acceptedProposalId: 'pp_4',
      escrowAmount: 2200,
      revisionsUsed: 1,
      deliveries: [
        { id: 'dv_1', version: 1, src: '/designs/good-vibes.svg', note: 'First take, pink and violet.', at: iso(-3) },
        { id: 'dv_2', version: 2, src: '/designs/code-chai.svg', note: 'Revised with the green palette you asked for.', at: iso(-1) },
      ],
      timeline: [tl('customer', 'Tanvir Ahmed', 'Proposal accepted', iso(-5.4), 'accepted'), tl('designer', 'Maliha Chowdhury', 'Delivered v1', iso(-3), 'delivered'), tl('customer', 'Tanvir Ahmed', 'Revision requested', iso(-2.5), 'revision_requested'), tl('designer', 'Maliha Chowdhury', 'Delivered v2', iso(-1), 'delivered')],
    }),
    req({
      id: 'rq_6',
      customerId: 'c1',
      designerId: 'd4',
      title: 'Tigers FC crest',
      brief: 'Football club crest, navy and orange, tiger head.',
      status: 'completed',
      productId: 'p_polo',
      use: 'Team kit',
      styleTags: ['sports', 'badge'],
      budget: { min: 2000, max: 3000 },
      createdAt: iso(-25),
      proposals: [{ id: 'pp_5', designerId: 'd4', price: 2500, days: 3, note: 'Crests are my thing.', status: 'accepted', at: iso(-24) }],
      acceptedProposalId: 'pp_5',
      escrowAmount: 0,
      deliveries: [{ id: 'dv_3', version: 1, src: '/designs/team-tigers.svg', note: 'Final crest.', at: iso(-21) }],
      resultDesignId: 'ds_28',
      timeline: [tl('customer', 'Ayesha Karim', 'Approved', iso(-20), 'approved'), tl('system', 'Printloom', 'Completed, design added to My designs', iso(-20), 'completed')],
    }),
  ];
  requests.forEach((r) => (data.requests[r.id] = r));

  // ----- reviews -----
  const rv = (id: string, target: Review['target'], targetId: string, customerId: string, rating: number, text: string, days: number, reply?: string): Review => ({ id, target, targetId, customerId, rating, text, at: iso(-days), reply });
  data.reviews = [
    rv('r1', 'vendor', 'v1', 'c1', 4, 'Great price and bright colors. Took one extra day.', 30),
    rv('r2', 'vendor', 'v1', 'c3', 4, 'DTF print is solid, packaging could be better.', 45, 'Thanks! New boxes arrive next month.'),
    rv('r3', 'vendor', 'v2', 'c2', 5, 'The embroidery is perfect. Worth every taka.', 20),
    rv('r4', 'vendor', 'v2', 'c1', 5, 'Premium fabric, you can feel it.', 60),
    rv('r5', 'vendor', 'v3', 'c3', 5, 'Ordered Monday, wore it Wednesday.', 15),
    rv('r6', 'vendor', 'v3', 'c2', 4, 'Fast, but limited colors.', 40),
    rv('r7', 'vendor', 'v4', 'c1', 5, '22 tees for our team, super cheap and neat.', 18),
    rv('r8', 'vendor', 'v4', 'c2', 4, 'Good for bulk, not for one piece.', 50),
    rv('r9', 'designer', 'd1', 'c1', 5, 'Nusrat nailed the vibe first try.', 25),
    rv('r10', 'designer', 'd2', 'c2', 5, 'Beautiful lettering.', 35),
    rv('r11', 'designer', 'd3', 'c3', 4, 'Clean and simple, exactly what I asked.', 22),
    rv('r12', 'designer', 'd4', 'c1', 5, 'The crest looks official. Team loves it.', 20),
    rv('r13', 'designer', 'd5', 'c2', 5, 'So fun, everyone asked where I got it.', 12),
  ];

  // ----- reports for flagged designs -----
  data.reports = [
    { id: 'rp1', designId: 'ds_06', reporterId: 'c2', reason: 'copyright', note: 'This looks copied from a well known streetwear brand.', status: 'open', at: iso(-2) },
    { id: 'rp2', designId: 'ds_17', reporterId: 'c3', reason: 'copyright', note: 'Character looks like a licensed cartoon.', status: 'open', at: iso(-1) },
  ];

  // ----- payouts history -----
  data.payouts = [
    { id: 'po1', ownerId: 'v1', amount: 22000, method: 'bKash', status: 'paid', at: iso(-14) },
    { id: 'po2', ownerId: 'v1', amount: 18900, method: 'bKash', status: 'paid', at: iso(-28) },
    { id: 'po3', ownerId: 'v2', amount: 31000, method: 'Bank', status: 'paid', at: iso(-14) },
    { id: 'po4', ownerId: 'v3', amount: 12500, method: 'Nagad', status: 'paid', at: iso(-14) },
    { id: 'po5', ownerId: 'v4', amount: 54000, method: 'Bank', status: 'paid', at: iso(-7) },
    { id: 'po6', ownerId: 'd1', amount: 6200, method: 'bKash', status: 'paid', at: iso(-10) },
    { id: 'po7', ownerId: 'd2', amount: 8400, method: 'Bank', status: 'paid', at: iso(-10) },
    { id: 'po8', ownerId: 'd4', amount: 4100, method: 'bKash', status: 'paid', at: iso(-10) },
  ];

  // ----- notifications (12) -----
  const n = (id: string, personaId: string, type: string, title: string, body: string, link: string, hoursAgo: number, read = false): Notification => ({ id, personaId, type, title, body, link, read, at: iso(0, -hoursAgo) });
  const subs = Object.values(data.subOrders);
  const subBy = (st: SubOrder['status']) => subs.find((s) => s.status === st)!;
  data.notifications = [
    n('n1', 'v1', 'order_placed', 'New order', `Order ${data.orders[subBy('placed').orderId].number} from Dhaka is waiting for you.`, `/vendor/orders/${subBy('placed').id}`, 2),
    n('n2', 'c1', 'order_status', 'Printing started', 'Dhaka Ink Lab started printing your hoodie.', `/orders/${subBy('in_production').orderId}`, 20),
    n('n3', 'c2', 'order_rejected', 'Ctg Thread Works could not take your order', 'Choose another shop or get a refund.', `/orders/${subBy('rejected_by_vendor').orderId}`, 60),
    n('n4', 'v2', 'issue', 'Issue reported', 'Tanvir reported a print quality problem.', '/vendor/issues', 30),
    n('n5', 'c2', 'proposal', 'New proposals', '2 designers sent proposals for your club crest.', '/requests/rq_2', 24),
    n('n6', 'd3', 'request', 'New direct request', 'Sadia sent you a request: Minimal tea garden line art.', '/designer/requests/rq_3', 12),
    n('n7', 'd1', 'request', 'New open request matches your tags', 'Logo for my home bakery (cute, illustration).', '/designer/requests/rq_1', 20),
    n('n8', 'c2', 'delivery', 'New delivery', 'Maliha uploaded v2 of your office party tee.', '/requests/rq_5', 24),
    n('n9', 'a1', 'report', 'Design flagged', 'Gangster Monkey was reported for copyright.', '/admin/moderation', 48),
    n('n10', 'd2', 'flagged', 'Your design was flagged', 'Gangster Monkey is hidden while we review a report.', '/designer/designs', 48),
    n('n11', 'c3', 'delivered', 'Delivered. How was it?', 'Review Sylhet Print House.', `/orders/${subBy('delivered').orderId}`, 70, true),
    n('n12', 'd4', 'royalty', 'Royalties earned', 'Your Tigers crest was printed on 22 tees.', '/designer/earnings', 400, true),
  ];

  return data;
}
