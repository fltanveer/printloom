// Mockup geometry shared by MockupRenderer (SVG) and the customizer canvas (Konva).
// Every view is drawn in a 400 x 480 box. Print areas are placed in that box and scaled
// so that inches map to pixels consistently.

import type { Category, PrintArea, View } from './types';

export const MOCKUP_W = 400;
export const MOCKUP_H = 480;

interface ViewShape {
  body: string[]; // filled with the garment color
  details: string[]; // darker strokes (seams, collars)
  trims?: { d: string; fill: string }[]; // fixed color parts (mug handle inside, cap brim shadow)
  area: { cx: number; y: number; w: number }; // print area box: center x, top y, width (height follows area ratio)
}

const TEE_FRONT = 'M130 40 Q200 78 270 40 L352 72 L392 162 L338 186 L318 152 L320 452 Q200 466 80 452 L82 152 L62 186 L8 162 L48 72 Z';
const TEE_BACK = 'M130 40 Q200 58 270 40 L352 72 L392 162 L338 186 L318 152 L320 452 Q200 466 80 452 L82 152 L62 186 L8 162 L48 72 Z';
const SLEEVE = 'M70 150 Q90 90 170 70 L330 60 Q360 70 350 110 L330 330 Q320 360 290 360 L120 380 Q80 382 78 340 Z';
const HOODIE_FRONT = 'M128 58 Q200 96 272 58 L350 86 L392 330 L346 344 L318 182 L322 456 Q200 470 78 456 L82 182 L54 344 L8 330 L50 86 Z';
const HOODIE_HOOD = 'M128 60 Q118 14 200 10 Q282 14 272 60 Q236 96 200 98 Q164 96 128 60 Z';
const JERSEY = 'M140 36 L200 92 L260 36 L346 64 L384 150 L334 172 L318 142 L320 452 Q200 464 80 452 L82 142 L66 172 L16 150 L54 64 Z';

const SHAPES: Record<Category, Partial<Record<View, ViewShape>>> = {
  tshirt: {
    front: { body: [TEE_FRONT], details: ['M160 44 Q200 86 240 44', 'M82 152 L62 186', 'M318 152 L338 186'], area: { cx: 200, y: 108, w: 132 } },
    back: { body: [TEE_BACK], details: ['M150 44 Q200 62 250 44'], area: { cx: 200, y: 90, w: 132 } },
    left_sleeve: { body: [SLEEVE], details: ['M120 380 L290 360'], area: { cx: 215, y: 150, w: 120 } },
    right_sleeve: { body: [SLEEVE], details: ['M120 380 L290 360'], area: { cx: 215, y: 150, w: 120 } },
  },
  polo: {
    front: {
      body: [TEE_FRONT],
      details: ['M160 44 L200 74 L240 44', 'M200 74 L200 140', 'M82 152 L62 186', 'M318 152 L338 186'],
      trims: [{ d: 'M150 40 L200 78 L176 96 L140 50 Z M250 40 L200 78 L224 96 L260 50 Z', fill: 'rgba(0,0,0,.08)' }],
      area: { cx: 200, y: 150, w: 120 },
    },
    back: { body: [TEE_BACK], details: ['M150 44 Q200 58 250 44'], area: { cx: 200, y: 96, w: 124 } },
    left_sleeve: { body: [SLEEVE], details: ['M120 380 L290 360'], area: { cx: 215, y: 150, w: 120 } },
    right_sleeve: { body: [SLEEVE], details: ['M120 380 L290 360'], area: { cx: 215, y: 150, w: 120 } },
  },
  hoodie: {
    front: {
      body: [HOODIE_HOOD, HOODIE_FRONT],
      details: ['M150 380 L250 380 L270 440 L130 440 Z', 'M180 98 L176 150', 'M220 98 L224 150'],
      area: { cx: 200, y: 140, w: 136 },
    },
    back: { body: [HOODIE_FRONT], details: ['M128 58 Q200 20 272 58'], area: { cx: 200, y: 110, w: 136 } },
    left_sleeve: { body: [SLEEVE], details: ['M120 380 L290 360'], area: { cx: 215, y: 150, w: 120 } },
    right_sleeve: { body: [SLEEVE], details: ['M120 380 L290 360'], area: { cx: 215, y: 150, w: 120 } },
  },
  jersey: {
    front: { body: [JERSEY], details: ['M140 36 L200 92 L260 36', 'M82 142 L66 172', 'M318 142 L334 172'], area: { cx: 200, y: 104, w: 176 } },
    back: { body: [JERSEY.replace('L200 92', 'L200 52')], details: ['M140 36 Q200 58 260 36'], area: { cx: 200, y: 84, w: 176 } },
  },
  mug: {
    wrap: {
      body: ['M60 120 L320 120 L312 400 Q300 420 280 420 L100 420 Q80 420 68 400 Z'],
      details: ['M60 120 L320 120'],
      trims: [{ d: 'M318 170 Q390 170 388 250 Q386 330 312 330 L314 300 Q356 298 356 250 Q356 200 318 200 Z', fill: 'var(--mug-handle, currentColor)' }],
      area: { cx: 190, y: 170, w: 250 },
    },
  },
  tote: {
    front: {
      body: ['M70 150 L330 150 L348 460 L52 460 Z'],
      details: [],
      trims: [{ d: 'M130 150 Q130 40 200 40 Q270 40 270 150 L252 150 Q252 60 200 60 Q148 60 148 150 Z', fill: 'var(--tote-handle, #cbbd9e)' }],
      area: { cx: 200, y: 190, w: 200 },
    },
  },
  poster: {
    front: {
      body: ['M50 20 L350 20 L350 460 L50 460 Z'],
      details: ['M50 20 L350 20 L350 460 L50 460 Z'],
      area: { cx: 200, y: 40, w: 262 },
    },
  },
  phonecase: {
    back: {
      body: ['M120 20 Q100 20 100 44 L100 436 Q100 460 124 460 L276 460 Q300 460 300 436 L300 44 Q300 20 276 20 Z'],
      details: [],
      trims: [{ d: 'M122 40 Q116 40 116 48 L116 112 Q116 120 124 120 L176 120 Q184 120 184 112 L184 48 Q184 40 176 40 Z', fill: 'rgba(20,20,30,.85)' }],
      area: { cx: 200, y: 36, w: 190 },
    },
  },
  cap: {
    front: {
      body: ['M60 300 Q60 110 200 100 Q340 110 340 300 Z'],
      details: ['M200 100 L200 300', 'M130 118 Q110 200 120 300', 'M270 118 Q290 200 280 300'],
      trims: [{ d: 'M40 300 Q200 250 360 300 Q380 360 200 370 Q20 360 40 300 Z', fill: 'rgba(0,0,0,.18)' }],
      area: { cx: 200, y: 170, w: 130 },
    },
  },
};

export interface AreaBox {
  x: number;
  y: number;
  w: number;
  h: number;
  ppi: number; // mockup pixels per inch
}

export function viewShape(category: Category, view: View): ViewShape | undefined {
  return SHAPES[category]?.[view];
}

export function areaBox(category: Category, area: PrintArea): AreaBox {
  const shape = viewShape(category, area.view);
  const a = shape?.area ?? { cx: 200, y: 100, w: 150 };
  const ppi = a.w / area.widthIn;
  const h = area.heightIn * ppi;
  return { x: a.cx - a.w / 2, y: a.y, w: a.w, h, ppi };
}

export const VIEW_LABEL: Record<View, string> = {
  front: 'Front',
  back: 'Back',
  left_sleeve: 'Left sleeve',
  right_sleeve: 'Right sleeve',
  wrap: 'Wrap',
};

/** Pick a readable ink for text on a garment color. */
export function contrastInk(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.6 ? '#141414' : '#FFFFFF';
}

export function isDarkHex(hex: string): boolean {
  return contrastInk(hex) === '#FFFFFF';
}
