'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Banknote, Check, CreditCard, Loader2, Send, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { Dialog, SheetContent, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { Avatar, EmptyState, Rating, SafeImage } from '@/components/shared/bits';
import { useStore } from '@/lib/store';
import { formatDateTime, timeAgo } from '@/lib/dates';
import type { DesignRequest, Proposal } from '@/lib/types';

export function ProposalCard({ proposal, canAccept, onAccept }: { proposal: Proposal; canAccept: boolean; onAccept: () => void }) {
  const designer = useStore((s) => s.designers[proposal.designerId]);
  const sample = useStore((s) => (proposal.sampleDesignId ? s.designs[proposal.sampleDesignId] : undefined));
  return (
    <div className={cn('rounded-card border bg-surface p-4', proposal.status === 'accepted' ? 'border-success/50' : 'border-border')}>
      <div className="flex gap-3">
        <Avatar src={designer?.avatar} name={designer?.name ?? 'Designer'} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{designer?.name ?? 'Designer'}</span>
            {designer ? <Rating value={designer.rating} count={designer.reviewCount} /> : null}
            {proposal.status !== 'pending' ? <StatusPill status={proposal.status} /> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm">
            <MoneyText value={proposal.price} className="font-display text-xl font-bold" />
            <span className="text-muted">
              {proposal.days} {proposal.days === 1 ? 'day' : 'days'}
            </span>
            {designer ? <span className="text-muted">{designer.revisionLimit} revisions included</span> : null}
          </div>
          {proposal.note ? <p className="mt-2 text-sm text-muted">{proposal.note}</p> : null}
        </div>
        {sample ? (
          <div className="hidden w-20 shrink-0 sm:block">
            <SafeImage src={sample.files.src} alt={`Sample: ${sample.title}`} className="h-20 w-20 rounded-input border border-border bg-surface-2" contain />
            <div className="mt-1 truncate text-center text-[11px] text-muted">Sample</div>
          </div>
        ) : null}
      </div>
      {canAccept && proposal.status === 'pending' ? (
        <div className="mt-3 flex justify-end">
          <Button onClick={onAccept}>
            <Check className="h-4 w-4" /> Accept for <MoneyText value={proposal.price} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const METHODS = [
  { id: 'bkash', label: 'bKash', icon: Smartphone },
  { id: 'nagad', label: 'Nagad', icon: Wallet },
  { id: 'card', label: 'Card', icon: CreditCard },
] as const;

/** Fake payment into escrow, then runs onPaid. Also used for paid extra revisions. */
export function EscrowPaySheet({ open, onOpenChange, amount, title, description, onPaid }: { open: boolean; onOpenChange: (o: boolean) => void; amount: number; title: string; description: string; onPaid: () => boolean }) {
  const money = useMoney();
  const failNext = useStore((s) => s.simulate.paymentFail);
  const [method, setMethod] = React.useState<(typeof METHODS)[number]['id']>('bkash');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setBusy(false);
      setErr(null);
    }
  }, [open]);
  const pay = () => {
    setBusy(true);
    setErr(null);
    window.setTimeout(() => {
      if (failNext) {
        setBusy(false);
        setErr('Payment failed. Your bank declined the transaction. Nothing was charged.');
        return;
      }
      const ok = onPaid();
      setBusy(false);
      if (ok) onOpenChange(false);
    }, 1200);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent
        title={title}
        description={description}
        footer={
          <Button size="lg" className="w-full" onClick={pay} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {busy ? 'Processing' : `Pay ${money(amount)} into escrow`}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-card bg-accent-soft p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Amount</div>
            <MoneyText value={amount} className="font-display text-3xl font-bold" />
            <p className="mt-1 text-sm text-muted">Held by Printloom. The designer is paid only after you approve the final design.</p>
          </div>
          <div className="grid gap-2" role="radiogroup" aria-label="Payment method">
            {METHODS.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)} className={cn('flex h-12 items-center gap-3 rounded-input border px-3 text-left text-sm font-semibold', method === m.id ? 'border-accent bg-accent-soft/60' : 'border-border')}>
                <m.icon className="h-5 w-5" /> {m.label}
                {method === m.id ? <Check className="ml-auto h-4 w-4 text-accent-text" /> : null}
              </button>
            ))}
          </div>
          <p className="flex items-center gap-2 text-xs text-muted">
            <Banknote className="h-4 w-4" /> Demo payment, nothing is charged.
          </p>
          {err ? <p className="text-sm font-medium text-danger">{err}</p> : null}
        </div>
      </SheetContent>
    </Dialog>
  );
}

export function ChatSheet({ request, open, onOpenChange, customerId }: { request: DesignRequest; open: boolean; onOpenChange: (o: boolean) => void; customerId: string }) {
  const sendMessage = useStore((s) => s.sendMessage);
  const designers = useStore((s) => s.designers);
  const customer = useStore((s) => s.customers[customerId]);
  const [text, setText] = React.useState('');
  const endRef = React.useRef<HTMLDivElement>(null);
  const designer = request.designerId ? designers[request.designerId] : null;
  React.useEffect(() => {
    if (open) window.setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 50);
  }, [open, request.messages.length]);
  const canChat = !!designer;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(request.id, 'customer', customerId, text.trim());
    setText('');
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={designer ? `Chat with ${designer.name}` : 'Messages'}
        description={request.title}
        footer={
          canChat ? (
            <form onSubmit={submit} className="flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" aria-label="Message" />
              <Button type="submit" size="icon" aria-label="Send message" disabled={!text.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted">Chat opens once a designer is on your request.</p>
          )
        }
      >
        {request.messages.length === 0 ? (
          <EmptyState kind="inbox" body={canChat ? 'No messages yet. Say hi and share any extra details.' : 'Messages appear here once a designer joins.'} className="border-0" />
        ) : (
          <ul className="space-y-3">
            {request.messages.map((m) => {
              const mine = m.from === 'customer';
              const who = mine ? customer?.name ?? 'You' : designers[m.authorId]?.name ?? 'Designer';
              return (
                <li key={m.id} className={cn('flex gap-2', mine && 'flex-row-reverse')}>
                  <Avatar src={mine ? customer?.avatar : designers[m.authorId]?.avatar} name={who} size={32} />
                  <div className={cn('max-w-[80%] rounded-card px-3 py-2 text-sm', mine ? 'bg-accent text-white' : 'bg-surface-2')}>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <time className={cn('mt-1 block text-[11px]', mine ? 'text-white/75' : 'text-muted')} dateTime={m.at} title={formatDateTime(m.at)}>
                      {timeAgo(m.at)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={endRef} />
      </SheetContent>
    </Dialog>
  );
}

export function RevisionDialog({ request, open, onOpenChange, onPaidExtra }: { request: DesignRequest; open: boolean; onOpenChange: (o: boolean) => void; onPaidExtra: (note: string) => void }) {
  const requestRevision = useStore((s) => s.requestRevision);
  const money = useMoney();
  const [note, setNote] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const remaining = Math.max(0, request.revisionLimit + request.extraRevisionsPaid - request.revisionsUsed);
  React.useEffect(() => {
    if (open) {
      setNote('');
      setErr(null);
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Request a revision" description={remaining > 0 ? `${remaining} of ${request.revisionLimit + request.extraRevisionsPaid} revisions left.` : 'You have used all included revisions.'}>
        <div className="space-y-4">
          <Field label="What should change?" htmlFor="rev-note" error={err}>
            <Textarea id="rev-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Make the cupcake a bit bigger and try a mint background." />
          </Field>
          {remaining === 0 ? (
            <Badge tone="warning" className="whitespace-normal">
              Extra revisions cost {money(request.extraRevisionFee)}, paid into escrow.
            </Badge>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {remaining > 0 ? (
              <Button
                onClick={() => {
                  if (note.trim().length < 5) return setErr('Tell the designer what to change');
                  const r = requestRevision(request.id, note.trim());
                  if (!r.ok) return setErr(r.reasons[0]);
                  toast.success('Revision requested');
                  onOpenChange(false);
                }}
              >
                Send revision request
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (note.trim().length < 5) return setErr('Tell the designer what to change');
                  onPaidExtra(note.trim());
                  onOpenChange(false);
                }}
              >
                Request extra revision for {money(request.extraRevisionFee)}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
