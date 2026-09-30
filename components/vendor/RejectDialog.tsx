'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { useStore } from '@/lib/store';
import { REJECT_REASONS } from './helpers';

/** Reject a new order with a reason (rejectSubOrder). The customer gets alternatives or a refund. */
export function RejectDialog({ subId, orderNumber, open, onOpenChange, onDone }: { subId: string | null; orderNumber?: string; open: boolean; onOpenChange: (o: boolean) => void; onDone?: () => void }) {
  const reject = useStore((s) => s.rejectSubOrder);
  const [reason, setReason] = React.useState('');
  React.useEffect(() => {
    if (open) setReason('');
  }, [open]);
  const submit = () => {
    if (!subId) return;
    const r = reject(subId, reason.trim());
    if (!r.ok) return toast.error(r.reasons.join('. '));
    toast.success('Order rejected. The customer can pick another shop in one click.');
    onOpenChange(false);
    onDone?.();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Reject order ${orderNumber ?? ''}`.trim()} description="Tell the customer why. They will get pre-quoted alternatives or a full refund.">
        <div className="mb-3 flex flex-wrap gap-2">
          {REJECT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={cn('min-h-9 rounded-full border px-3 text-sm', reason === r ? 'border-accent bg-accent-soft text-accent-text' : 'border-border hover:border-accent/50')}
            >
              {r}
            </button>
          ))}
        </div>
        <Field label="Reason" error={reason.trim().length > 0 && reason.trim().length < 5 ? 'A few more words please' : null}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Out of Cream blanks this week, sorry." />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Keep order
          </Button>
          <Button variant="danger" disabled={reason.trim().length < 5} onClick={submit}>
            Reject order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
