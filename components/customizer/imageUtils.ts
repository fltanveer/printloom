// Browser-only helpers for uploads: validation, downscaling, transparency detection, white background removal.

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
export const ACCEPT_ATTR = '.png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp';
export const MAX_BYTES = 25 * 1024 * 1024;
export const MAX_STORED_PX = 1400;

export interface ProcessedUpload {
  src: string;
  pxWidth: number;
  pxHeight: number;
  transparent: boolean;
  isVector: boolean;
  name: string;
  bytes: number;
}

export function validateFile(f: File): string | null {
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  const okType = ACCEPTED_TYPES.includes(f.type) || ['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext);
  if (!okType) return `${f.name} is not supported. Use PNG, JPG, SVG or WEBP.`;
  if (f.size > MAX_BYTES) return `${f.name} is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 25 MB.`;
  if (f.size === 0) return `${f.name} looks empty. Try another file.`;
  return null;
}

function readAsDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the file'));
    r.readAsDataURL(f);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not open this image'));
    img.src = src;
  });
}

function drawScaled(img: HTMLImageElement, w: number, h: number, max: number) {
  const s = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * s));
  const ch = Math.max(1, Math.round(h * s));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(img, 0, 0, cw, ch);
  return { canvas, ctx, cw, ch };
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  const step = Math.max(1, Math.floor((w * h) / 40000)) * 4;
  for (let i = 3; i < data.length; i += step) if (data[i] < 250) return true;
  return false;
}

export async function processUpload(file: File): Promise<ProcessedUpload> {
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  if (isSvg) {
    const w = img.naturalWidth || 1200;
    const h = img.naturalHeight || 1200;
    // keep vectors as-is when small, otherwise rasterize to protect storage
    if (dataUrl.length < 400_000) return { src: dataUrl, pxWidth: w, pxHeight: h, transparent: true, isVector: true, name: file.name, bytes: file.size };
    const { canvas } = drawScaled(img, w, h, MAX_STORED_PX);
    return { src: canvas.toDataURL('image/png'), pxWidth: w, pxHeight: h, transparent: true, isVector: true, name: file.name, bytes: file.size };
  }
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error('This image has no size. Try another file.');
  const { canvas, ctx, cw, ch } = drawScaled(img, w, h, MAX_STORED_PX);
  const mayHaveAlpha = file.type === 'image/png' || file.type === 'image/webp' || /\.(png|webp)$/i.test(file.name);
  const transparent = mayHaveAlpha ? hasTransparency(ctx, cw, ch) : false;
  const src = transparent ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.88);
  return { src, pxWidth: w, pxHeight: h, transparent, isVector: false, name: file.name, bytes: file.size };
}

/** Demo pixel pass: near-white pixels become transparent, with a soft edge. */
export async function removeWhiteBackground(src: string): Promise<string> {
  const img = await loadImage(src);
  const { canvas, ctx, cw, ch } = drawScaled(img, img.naturalWidth || 1000, img.naturalHeight || 1000, MAX_STORED_PX);
  const id = ctx.getImageData(0, 0, cw, ch);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const m = Math.min(d[i], d[i + 1], d[i + 2]);
    if (m >= 238) d[i + 3] = 0;
    else if (m >= 215) d[i + 3] = Math.min(d[i + 3], Math.round(((238 - m) / 23) * 255));
  }
  ctx.putImageData(id, 0, 0);
  return canvas.toDataURL('image/png');
}
