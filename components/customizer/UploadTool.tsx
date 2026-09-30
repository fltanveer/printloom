'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { AlertCircle, ImageUp, Loader2 } from 'lucide-react';
import { layerDpi } from '@/lib/dpi';
import { VIEW_LABEL } from '@/lib/mockups';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { useCustomizer } from './model';
import { ACCEPT_ATTR, processUpload, validateFile } from './imageUtils';
import { centeredBox, isVectorLayer, newLayerId } from './draft';
import { DpiMeter } from './DpiMeter';

export interface UploadState {
  busy: boolean;
  error: string | null;
  lastLayerId: string | null;
  lastName: string | null;
  handleFiles: (files: File[]) => Promise<void>;
  clearError: () => void;
}

/** Upload handler shared by the Upload tool and drag and drop on the canvas. */
export function useUpload(): UploadState {
  const { addLayer, activeArea } = useCustomizer();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [last, setLast] = React.useState<{ id: string; name: string } | null>(null);

  const handleFiles = React.useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      const invalid = validateFile(file);
      if (invalid) {
        setError(invalid);
        return;
      }
      setError(null);
      setBusy(true);
      try {
        const up = await processUpload(file);
        const box = centeredBox(activeArea, up.pxWidth / up.pxHeight || 1, 0.7);
        const id = newLayerId();
        addLayer({
          id,
          kind: 'image',
          src: up.src,
          printAreaId: activeArea.id,
          ...box,
          rotation: 0,
          pxWidth: up.isVector ? undefined : up.pxWidth,
          pxHeight: up.isVector ? undefined : up.pxHeight,
          transparent: up.transparent,
          outOfBounds: false,
        });
        setLast({ id, name: file.name });
        const dpi = up.isVector ? null : Math.round(Math.min(up.pxWidth / box.widthIn, up.pxHeight / box.heightIn));
        toast.success(`Added ${file.name}`, { description: dpi === null ? 'Vector file, prints sharp at any size.' : `${dpi} DPI at ${box.widthIn.toFixed(1)} x ${box.heightIn.toFixed(1)} in on the ${VIEW_LABEL[activeArea.view].toLowerCase()}.` });
        if (files.length > 1) toast('Only the first file was added', { description: 'Drop files one at a time.' });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not open this image. Try another file.');
      } finally {
        setBusy(false);
      }
    },
    [activeArea, addLayer],
  );

  return { busy, error, lastLayerId: last?.id ?? null, lastName: last?.name ?? null, handleFiles, clearError: () => setError(null) };
}

export function UploadTool({ upload }: { upload: UploadState }) {
  const { draft, designs, activeArea, setSelectedId, selectedId } = useCustomizerWithDesigns();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const layer = draft.customization.layers.find((l) => l.id === (selectedId && draft.customization.layers.find((x) => x.id === selectedId)?.kind === 'image' ? selectedId : upload.lastLayerId));
  const dpi = layer ? layerDpi(layer, isVectorLayer(layer, designs)) : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-base font-semibold">Upload your image</h3>
        <p className="text-xs text-muted">PNG, JPG, SVG or WEBP up to 25 MB. It goes on the {VIEW_LABEL[activeArea.view].toLowerCase()}.</p>
      </div>
      <label
        className={cn(
          'flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border bg-surface-2 p-5 text-center transition-colors hover:border-customer/60 focus-within:border-accent',
          over && 'border-accent bg-accent-soft',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void upload.handleFiles(Array.from(e.dataTransfer.files));
        }}
      >
        {upload.busy ? <Loader2 className="h-8 w-8 animate-spin text-accent" /> : <ImageUp className="h-8 w-8 text-accent" />}
        <span className="text-sm font-semibold">{upload.busy ? 'Reading your image' : 'Drop an image here'}</span>
        <span className="text-xs text-muted">or tap to choose a file</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={(e) => {
            void upload.handleFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </label>
      {upload.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-input border border-danger/30 bg-danger/5 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div className="flex-1">
            <p className="font-medium">{upload.error}</p>
            <p className="text-xs text-muted">Nothing was added.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={upload.clearError}>
            OK
          </Button>
        </div>
      ) : null}
      {layer && dpi ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="checker grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-input border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={layer.src} alt="" className="max-h-full max-w-full object-contain" />
            </span>
            <div className="min-w-0 text-sm">
              <div className="truncate font-semibold">{layer.id === upload.lastLayerId && upload.lastName ? upload.lastName : 'Selected image'}</div>
              <div className="text-xs text-muted">
                Printing at {layer.widthIn.toFixed(1)} x {layer.heightIn.toFixed(1)} in{layer.transparent ? ', transparent background' : ', has a background'}
              </div>
            </div>
          </div>
          <DpiMeter dpi={dpi.dpi} pxWidth={layer.pxWidth} pxHeight={layer.pxHeight} vector={dpi.dpi === null} />
          {layer.id !== selectedId ? (
            <Button variant="soft" size="sm" onClick={() => setSelectedId(layer.id)}>
              Select on canvas
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted">Tip: images of 2000 px or more stay sharp on a large print. We check the resolution as soon as you add it.</p>
      )}
    </div>
  );
}

function useCustomizerWithDesigns() {
  const m = useCustomizer();
  return { ...m, designs: m.state.designs };
}
