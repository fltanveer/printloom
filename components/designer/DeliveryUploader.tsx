'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { FileWarning, Loader2, Upload } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { SafeImage } from '@/components/shared/bits';
import type { DesignRequest } from '@/lib/types';
import { ACCEPT, SEED_IMAGES, processArtwork } from './imageFile';

/** Upload a new delivery version from a file or from the bundled demo designs. */
export function DeliveryUploader({ request, onDone }: { request: DesignRequest; onDone?: () => void }) {
  const uploadDelivery = useStore((s) => s.uploadDelivery);
  const [src, setSrc] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const nextVersion = request.deliveries.length + 1;

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const r = await processArtwork(file);
    setBusy(false);
    if (r.ok) setSrc(r.art.file.src);
    else setError(r.error);
  };

  const submit = () => {
    if (!src) {
      setError('Pick a file or a sample first.');
      return;
    }
    const r = uploadDelivery(request.id, src, note.trim() || `Version ${nextVersion}`);
    if (!r.ok) {
      toast.error(r.reasons.join(' '));
      return;
    }
    toast.success(`Delivered v${nextVersion}. The customer will review it.`);
    setSrc(null);
    setNote('');
    onDone?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-input border border-dashed border-border bg-surface-2">
          {busy ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : src ? <img src={src} alt="Selected delivery" className="h-full w-full object-contain" /> : <Upload className="h-6 w-6 text-muted" />}
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Version {nextVersion}</p>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-input border border-border bg-surface px-3 font-semibold hover:border-accent/60 focus-within:ring-2 focus-within:ring-accent">
            Choose file
            <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-muted">Or pick from the demo files</p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {SEED_IMAGES.filter((x) => x.endsWith('.svg')).map((x) => (
            <button key={x} type="button" onClick={() => setSrc(x)} aria-pressed={src === x} aria-label={`Use ${x.split('/').pop()}`} className={cn('h-14 w-14 shrink-0 overflow-hidden rounded-input border-2 bg-surface-2', src === x ? 'border-accent' : 'border-transparent hover:border-border')}>
              <SafeImage src={x} alt="" className="h-full w-full" contain />
            </button>
          ))}
        </div>
      </div>
      <Field label="Note for the customer" htmlFor={`dv-note-${request.id}`}>
        <Textarea id={`dv-note-${request.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed in this version?" />
      </Field>
      {error ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <FileWarning className="h-4 w-4" /> {error}
        </p>
      ) : null}
      <Button className="w-full" onClick={submit} disabled={busy}>
        <Upload className="h-4 w-4" /> Deliver v{nextVersion}
      </Button>
    </div>
  );
}
