'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Flag, Lock, Shirt, Sparkles, EyeOff } from 'lucide-react';
import { useStore } from '@/lib/store';
import { COLORS } from '@/lib/seed';
import { publicDesigns } from '@/lib/selectors';
import type { Report } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/misc';
import { cn } from '@/components/ui/cn';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { MoneyText } from '@/components/shared/MoneyText';
import { Avatar, EmptyState, Rating, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { DesignCard, FavoriteButton } from '@/components/customer/cards';
import { ProductPickerDialog } from '@/components/customer/ProductPicker';
import { CATEGORY_LABEL, fitDesignLayer } from '@/components/customer/shopPricing';

const MOCK_COLORS: (keyof typeof COLORS)[] = ['White', 'Black', 'Heather Grey'];
const REASONS: { id: Report['reason']; label: string; hint: string }[] = [
  { id: 'copyright', label: 'Copied or trademarked', hint: 'Looks like someone else’s artwork, logo or character' },
  { id: 'offensive', label: 'Offensive or hateful', hint: 'Hurtful, violent or inappropriate' },
  { id: 'other', label: 'Something else', hint: 'Tell us what is wrong' },
];

export default function DesignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useStore();
  const customerId = data.personas.customer;
  const reportDesign = useStore((s) => s.reportDesign);
  const loading = useFakeLoading();
  const design = data.designs[id];
  const [picker, setPicker] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reason, setReason] = React.useState<Report['reason']>('copyright');
  const [note, setNote] = React.useState('');
  const [noteErr, setNoteErr] = React.useState<string | null>(null);

  if (loading)
    return (
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );

  const mine = !!design && design.isPrivate && design.ownerCustomerId === customerId;
  const visible = !!design && ((design.status === 'published' && !design.isPrivate) || mine);

  if (!design || !visible) {
    const reasonText = !design
      ? 'We could not find this design. It may have been deleted.'
      : design.isPrivate
        ? 'This is a private design that belongs to another customer.'
        : design.status === 'flagged'
          ? 'This design is hidden while we review a report about it.'
          : design.status === 'removed'
            ? 'This design was removed and can no longer be printed.'
            : 'The designer has taken this design offline for now.';
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          kind="spark"
          title={design ? `${design.title} is not available` : 'Design not found'}
          body={reasonText}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/designs">Browse other designs</Link>
              </Button>
              {design?.designerId && !design.isPrivate ? (
                <Button asChild variant="secondary">
                  <Link href={`/designer-profile/${design.designerId}`}>See the designer</Link>
                </Button>
              ) : null}
            </div>
          }
        />
      </div>
    );
  }

  const designer = design.designerId ? data.designers[design.designerId] : undefined;
  const compatible = Object.values(data.products)
    .filter((p) => design.compatibleCategories.includes(p.category))
    .sort((a, b) => b.popularity - a.popularity);
  const mockups = compatible.slice(0, 3);
  const more = designer ? publicDesigns(data).filter((d) => d.designerId === designer.id && d.id !== design.id).slice(0, 4) : [];

  const submitReport = () => {
    if (reason === 'other' && note.trim().length < 5) {
      setNoteErr('Tell us a little more so we can check it');
      return;
    }
    reportDesign(design.id, customerId, reason, note.trim());
    setReportOpen(false);
    toast.success('Thanks for letting us know', { description: 'We hid the design while our team reviews it.' });
    router.push('/designs');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <Link href="/designs" className="mb-3 inline-flex min-h-[40px] items-center text-sm font-medium text-muted hover:text-text">
        ← Design library
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div>
          <div className={cn('relative overflow-hidden rounded-sheet border border-border shadow-s2', design.files.transparent ? 'checker' : 'bg-surface-2')}>
            <SafeImage src={design.files.src} alt={design.title} contain className={cn('aspect-square w-full', design.files.transparent && 'p-10')} />
            <FavoriteButton designId={design.id} className="absolute right-3 top-3" />
            {mine ? (
              <Badge tone="dark" className="absolute left-3 top-3">
                <Lock className="h-3 w-3" /> Private, only you can see it
              </Badge>
            ) : null}
          </div>
          <h2 className="mb-3 mt-6 font-display text-lg font-semibold">How it looks on products</h2>
          <div className="grid grid-cols-3 gap-3">
            {mockups.map((p, i) => {
              const layer = fitDesignLayer(p, design);
              return (
                <Link key={p.id} href={`/product/${p.id}?design=${design.id}`} className="group rounded-card border border-border bg-gradient-to-b from-accent-soft to-surface-2 p-2 text-center shadow-s1 transition-all hover:-translate-y-0.5 hover:shadow-s2">
                  <MockupRenderer product={p} colorHex={COLORS[MOCK_COLORS[i % MOCK_COLORS.length]]} layers={layer ? [layer] : []} label={`${design.title} on ${p.name}`} />
                  <span className="mt-1 block truncate text-xs font-semibold">{p.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{design.title}</h1>
            <p className="mt-2 text-muted">{design.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {design.tags.map((t) => (
                <Link key={t} href={`/designs?tag=${encodeURIComponent(t)}`} className="inline-flex min-h-[32px] items-center rounded-full bg-surface-2 px-3 text-xs font-semibold text-muted hover:bg-accent-soft hover:text-accent-text">
                  #{t}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface p-4 shadow-s1">
            {design.royalty.amount > 0 ? (
              <p className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-designer" />
                <span>
                  Adds <MoneyText value={design.royalty.amount} className="font-bold" /> per piece. That goes straight to {designer?.name ?? 'the designer'}.
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted">No royalty on this design. You only pay for the print.</p>
            )}
            <p className="mt-1 text-xs text-muted">
              Works on {design.compatibleCategories.map((c) => CATEGORY_LABEL[c].toLowerCase()).join(', ')}. {design.files.kind === 'svg' ? 'Vector art, sharp at any size.' : `${design.files.widthPx} x ${design.files.heightPx} px.`}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button size="lg" className="flex-1" onClick={() => setPicker(true)}>
                <Shirt className="h-5 w-5" /> Use on product
              </Button>
              <FavoriteButton designId={design.id} withLabel />
            </div>
          </div>

          {designer ? (
            <Link href={`/designer-profile/${designer.id}`} className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-s1 transition-shadow hover:shadow-s2">
              <Avatar src={designer.avatar} name={designer.name} size={56} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-designer">Designer</div>
                <div className="truncate font-display text-lg font-semibold">{designer.name}</div>
                <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
                  <Rating value={designer.rating} count={designer.reviewCount} />
                  <span>{designer.followers.toLocaleString()} followers</span>
                </div>
              </div>
              <span className="hidden text-sm font-semibold text-accent-text sm:block">View profile →</span>
            </Link>
          ) : null}

          {!mine ? (
            <button type="button" onClick={() => setReportOpen(true)} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted hover:text-danger">
              <Flag className="h-4 w-4" /> Report design
            </button>
          ) : null}
        </div>
      </div>

      {more.length ? (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-xl font-bold">More from {designer?.name}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {more.map((d) => (
              <DesignCard key={d.id} design={d} designer={designer} />
            ))}
          </div>
        </section>
      ) : null}

      <ProductPickerDialog design={design} open={picker} onOpenChange={setPicker} />

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent title="Report design" description="Reports are private. We hide the design while our team checks it.">
          <div className="space-y-2" role="radiogroup" aria-label="Reason">
            {REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={reason === r.id}
                onClick={() => setReason(r.id)}
                className={cn('flex w-full items-start gap-3 rounded-input border p-3 text-left', reason === r.id ? 'border-accent bg-accent-soft' : 'border-border hover:border-accent/50')}
              >
                <span className={cn('mt-0.5 h-4 w-4 shrink-0 rounded-full border-2', reason === r.id ? 'border-accent bg-accent' : 'border-border')} />
                <span>
                  <span className="block text-sm font-semibold">{r.label}</span>
                  <span className="block text-xs text-muted">{r.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <Field label="Details" hint={reason === 'other' ? 'Required' : 'Optional'} error={noteErr} className="mt-4" htmlFor="report-note">
            <Textarea
              id="report-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteErr(null);
              }}
              placeholder="Anything that helps us check faster"
            />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitReport}>
              <EyeOff className="h-4 w-4" /> Send report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
