// Pure helpers for reading uploaded artwork in the browser (designer panel only).

import type { DesignFile } from '@/lib/types';

export const MAX_BYTES = 25 * 1024 * 1024;
export const MAX_PREVIEW_PX = 1400;
export const ACCEPT = 'image/png,image/svg+xml,image/jpeg';

/** Every file bundled in /public/designs, used for portfolio import and demo picks. */
export const SEED_IMAGES: string[] = [
  'bengal-tiger.svg',
  'cha-break.svg',
  'code-chai.svg',
  'cricket-fever.svg',
  'dhaka-vibes.svg',
  'good-vibes.svg',
  'monsoon-mood.svg',
  'rickshaw-art.svg',
  'smile-club.svg',
  'stay-wild.svg',
  'sundarbans.svg',
  'team-tigers.svg',
  ...Array.from({ length: 18 }, (_, i) => `stock-${i + 1}.jpg`),
].map((f) => `/designs/${f}`);

export interface ProcessedArt {
  file: DesignFile;
  name: string;
  bytes: number;
  palette: string[];
  /** Share (0..1) of opaque pixels that are dark. High values may vanish on dark garments. */
  darkShare: number;
}

export type ProcessResult = { ok: true; art: ProcessedArt } | { ok: false; error: string };

function kindOf(file: File): DesignFile['kind'] | null {
  const n = file.name.toLowerCase();
  if (file.type === 'image/png' || n.endsWith('.png')) return 'png';
  if (file.type === 'image/svg+xml' || n.endsWith('.svg')) return 'svg';
  if (file.type === 'image/jpeg' || n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'jpg';
  return null;
}

function readAs(file: File, mode: 'dataURL' | 'text'): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read failed'));
    if (mode === 'dataURL') r.readAsDataURL(file);
    else r.readAsText(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function svgSize(text: string): { w: number; h: number } {
  const vb = text.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (vb) return { w: Number(vb[1]), h: Number(vb[2]) };
  const w = text.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i);
  const h = text.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
  return { w: w ? Number(w[1]) : 1, h: h ? Number(h[1]) : 1 };
}

/** Validates type and size, reads resolution, checks transparency, stores a downscaled data URL (keeps original px size). */
export async function processArtwork(file: File): Promise<ProcessResult> {
  const kind = kindOf(file);
  if (!kind) return { ok: false, error: "That file type isn't supported. Use PNG, SVG or JPG." };
  if (file.size > MAX_BYTES) return { ok: false, error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 25 MB, try a smaller export.` };
  try {
    if (kind === 'svg') {
      const text = await readAs(file, 'text');
      if (!/<svg[\s>]/i.test(text)) return { ok: false, error: "That SVG looks broken. Try exporting it again." };
      const { w, h } = svgSize(text);
      const scale = 3600 / Math.max(w, h, 1);
      const colors = [...new Set((text.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((c) => c.toUpperCase()))].slice(0, 6);
      const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(text)));
      const dark = colors.filter((c) => luminance(c) < 0.25).length;
      return {
        ok: true,
        art: {
          file: { src, widthPx: Math.round(w * scale), heightPx: Math.round(h * scale), transparent: true, kind: 'svg' },
          name: file.name,
          bytes: file.size,
          palette: colors.length ? colors : ['#141414'],
          darkShare: colors.length ? dark / colors.length : 0,
        },
      };
    }
    const dataUrl = await readAs(file, 'dataURL');
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const s = Math.min(1, MAX_PREVIEW_PX / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * s));
    canvas.height = Math.max(1, Math.round(h * s));
    const ctx = canvas.getContext('2d');
    if (!ctx) return { ok: false, error: 'Your browser could not read this image.' };
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // sample about 20k pixels for transparency, palette and darkness
    const step = Math.max(1, Math.floor(data.length / 4 / 20000)) * 4;
    let transparentPx = 0;
    let opaque = 0;
    let darkPx = 0;
    const buckets = new Map<string, number>();
    for (let i = 0; i < data.length; i += step) {
      const a = data[i + 3];
      if (a < 250) transparentPx++;
      if (a < 128) continue;
      opaque++;
      const r = data[i] & 0xf0;
      const g = data[i + 1] & 0xf0;
      const b = data[i + 2] & 0xf0;
      if ((0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.25) darkPx++;
      const k = toHex(r, g, b);
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    const transparent = kind === 'png' && transparentPx > 0;
    const palette = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
    // Non-transparent images are stored as JPEG to keep the demo storage small.
    const src = transparent ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.88);
    return {
      ok: true,
      art: { file: { src, widthPx: w, heightPx: h, transparent, kind }, name: file.name, bytes: file.size, palette, darkShare: opaque ? darkPx / opaque : 0 },
    };
  } catch {
    return { ok: false, error: "We couldn't read that image. Try another file." };
  }
}

/** Loads one of the bundled /public/designs files as if it had been uploaded. */
export async function fileFromUrl(url: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  const name = url.split('/').pop() ?? 'design';
  return new File([blob], name, { type: blob.type || (name.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg') });
}

export function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export function titleFromFile(src: string): string {
  const base = (src.split('/').pop() ?? 'Design').replace(/\.[a-z]+$/i, '').replace(/[-_]+/g, ' ');
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}
