'use client';
import * as React from 'react';
import { CheckCircle2, FileWarning, ImagePlus, Info, Loader2, UploadCloud } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/components/shared/bits';
import { maxPrintSize } from '@/lib/dpi';
import { ACCEPT, SEED_IMAGES, fileFromUrl, processArtwork, type ProcessedArt } from './imageFile';

/** Drag and drop upload with resolution, transparency and max print size at 150 DPI. */
export function DesignUploader({ value, onChange }: { value: ProcessedArt | null; onChange: (a: ProcessedArt | null) => void }) {
  const [drag, setDrag] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const r = await processArtwork(file);
    setBusy(false);
    if (r.ok) onChange(r.art);
    else setError(r.error);
  };

  const pickSample = async (url: string) => {
    setBusy(true);
    setError(null);
    try {
      await handle(await fileFromUrl(url));
    } catch {
      setBusy(false);
      setError("We couldn't load that sample. Try another one.");
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload artwork. Drag and drop or press Enter to browse"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handle(e.dataTransfer.files[0]);
        }}
        className={cn(
          'flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          drag ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-accent/60',
          error && 'border-danger/60',
        )}
      >
        {busy ? <Loader2 className="h-9 w-9 animate-spin text-accent" /> : <UploadCloud className="h-9 w-9 text-accent" />}
        <p className="font-display text-lg font-semibold">{busy ? 'Reading your file' : 'Drop your artwork here'}</p>
        <p className="text-sm text-muted">PNG with a transparent background or SVG works best. JPG is fine too. Up to 25 MB.</p>
        <Button variant="soft" size="sm" className="mt-1" tabIndex={-1}>
          <ImagePlus className="h-4 w-4" /> Browse files
        </Button>
        <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => void handle(e.target.files?.[0] ?? undefined)} />
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-2 rounded-input bg-danger/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400">
          <FileWarning className="h-4 w-4 shrink-0" /> {error}
        </p>
      ) : null}

      {value ? <ArtSummary art={value} onClear={() => onChange(null)} /> : null}

      <details className="rounded-card border border-border bg-surface p-3">
        <summary className="cursor-pointer text-sm font-semibold">No file handy? Try a sample from the demo library</summary>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {SEED_IMAGES.map((src) => (
            <button key={src} type="button" onClick={() => void pickSample(src)} className="aspect-square overflow-hidden rounded-input border border-border bg-surface-2 hover:border-accent focus-visible:ring-2 focus-visible:ring-accent" aria-label={`Use sample ${src.split('/').pop()}`}>
              <SafeImage src={src} alt="" className="h-full w-full" contain />
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

export function ArtSummary({ art, onClear }: { art: ProcessedArt; onClear?: () => void }) {
  const f = art.file;
  const vector = f.kind === 'svg';
  const max = maxPrintSize(f.widthPx, f.heightPx);
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:flex-row">
      <div className="grid h-40 w-full shrink-0 place-items-center overflow-hidden rounded-input bg-surface-2 sm:w-40" style={{ backgroundImage: 'repeating-conic-gradient(var(--surface-2) 0% 25%, var(--surface) 0% 50%)', backgroundSize: '16px 16px' }}>
        <img src={f.src} alt={art.name} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold" title={art.name}>{art.name}</p>
          {onClear ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Replace
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">{f.kind.toUpperCase()}</Badge>
          <Badge tone="neutral">{vector ? 'Vector' : `${f.widthPx} x ${f.heightPx} px`}</Badge>
          <Badge tone="neutral">{(art.bytes / 1024 / 1024).toFixed(1)} MB</Badge>
        </div>
        <p className="flex items-center gap-2">
          {f.transparent ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Info className="h-4 w-4 text-amber-600" />}
          {f.transparent ? 'Transparent background' : 'Has a background. It will print as a rectangle.'}
        </p>
        <p className="flex items-center gap-2">
          <CheckCircle2 className={cn('h-4 w-4', vector || max.w >= 10 ? 'text-green-600' : 'text-amber-600')} />
          {vector ? 'Vector, prints sharp at any size' : `Prints sharp up to ${max.label}`}
        </p>
        {!vector && max.w < 8 ? <p className="text-amber-700 dark:text-amber-300">This is small for a full chest print. Export at 3000 px or more if you can.</p> : null}
        {art.darkShare > 0.6 ? <p className="text-amber-700 dark:text-amber-300">Mostly dark ink. Check the dark shirts in the next step.</p> : null}
      </div>
    </div>
  );
}
