'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { ImagePlus, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { useStore } from '@/lib/store';
import type { IssueType } from '@/lib/types';
import { readFilesAsDataUrls } from './helpers';

const TYPES: { id: IssueType; label: string; hint: string }[] = [
  { id: 'damaged', label: 'Damaged', hint: 'Torn, stained or broken' },
  { id: 'wrong_item', label: 'Wrong item', hint: 'Wrong size, color or design' },
  { id: 'print_quality', label: 'Print quality', hint: 'Blurry, cracked or faded' },
  { id: 'late', label: 'Late', hint: 'Past the estimated date' },
];

/**
 * Report a problem (C11). Delivered orders go through the store's reportIssue.
 * A late order that has not arrived yet is logged on the timeline and the shop and Printloom are notified,
 * since the order state machine only opens issues after delivery.
 */
export function ReportIssueDialog({ subId, open, onOpenChange, canReport, late }: { subId: string; open: boolean; onOpenChange: (o: boolean) => void; canReport: boolean; late: boolean }) {
  const reportIssue = useStore((s) => s.reportIssue);
  const [type, setType] = React.useState<IssueType>(late && !canReport ? 'late' : 'damaged');
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [note, setNote] = React.useState('');
  const [desired, setDesired] = React.useState<'refund' | 'reprint'>('reprint');
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setType(late && !canReport ? 'late' : 'damaged');
      setPhotos([]);
      setNote('');
      setError(null);
    }
  }, [open, late, canReport]);

  const available = TYPES.filter((t) => (t.id === 'late' ? late || canReport : canReport));

  const submit = () => {
    if (type !== 'late' && !photos.length) return setError('Add at least one photo so the shop can see the problem');
    if (!note.trim()) return setError('Tell the shop what went wrong in a sentence or two');
    if (canReport) {
      const res = reportIssue(subId, { type, photos, note: note.trim(), desired });
      if (!res.ok) return setError(res.reasons[0]);
      toast.success('Problem reported. The shop usually replies within a day.');
    } else {
      const res = useStore.getState().reportLate(subId, note.trim(), desired);
      if (!res.ok) return setError(res.reasons[0]);
      toast.success('Thanks for telling us. The shop and Printloom support have been notified.');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Report a problem" description="Pick what went wrong, add photos and tell us how to fix it.">
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-sm font-medium">What happened?</div>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Problem type">
              {available.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={type === t.id}
                  onClick={() => setType(t.id)}
                  className={cn('min-h-[56px] rounded-input border p-2.5 text-left text-sm', type === t.id ? 'border-accent bg-accent-soft/60' : 'border-border hover:border-accent/50')}
                >
                  <span className="block font-semibold">{t.label}</span>
                  <span className="block text-xs text-muted">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">Photos {type === 'late' ? '(optional)' : ''}, up to 3</div>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-input border border-border">
                  <img src={p} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < 3 ? (
                <button type="button" onClick={() => inputRef.current?.click()} className="grid h-20 w-20 place-items-center rounded-input border border-dashed border-border text-muted hover:border-accent hover:text-accent-text" aria-label="Add photo">
                  <ImagePlus className="h-6 w-6" />
                </button>
              ) : null}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const urls = await readFilesAsDataUrls(e.target.files, 3 - photos.length);
                  if (e.target.files && e.target.files.length > urls.length) toast.error('Only images, up to 3 photos');
                  setPhotos((x) => [...x, ...urls].slice(0, 3));
                  e.target.value = '';
                }}
              />
            </div>
          </div>
          <Field label="What went wrong?" htmlFor="issue-note">
            <Textarea id="issue-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="The print on the back is cracked after one wash." />
          </Field>
          <div>
            <div className="mb-1.5 text-sm font-medium">How should we fix it?</div>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Desired resolution">
              {(['reprint', 'refund'] as const).map((d) => (
                <button key={d} type="button" role="radio" aria-checked={desired === d} onClick={() => setDesired(d)} className={cn('h-11 rounded-input border text-sm font-semibold', desired === d ? 'border-accent bg-accent-soft/60' : 'border-border')}>
                  {d === 'reprint' ? 'Reprint it' : 'Refund me'}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Send report</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
