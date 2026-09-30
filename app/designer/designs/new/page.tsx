'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Copy, PartyPopper, ShieldCheck } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/switch';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { EmptyState, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { Skeleton } from '@/components/ui/misc';
import { useActiveDesigner } from '@/components/designer/bits';
import { ArtSummary, DesignUploader } from '@/components/designer/DesignUploader';
import { ALL_CATEGORIES, CATEGORY_LABEL, MockupPreviewStrip } from '@/components/designer/MockupPreviewStrip';
import { DetailsFields, RoyaltyField, detailsErrors, royaltyError, type DetailsDraft } from '@/components/designer/DesignFields';
import type { ProcessedArt } from '@/components/designer/imageFile';

const STEPS = ['Upload', 'Preview', 'Details', 'Royalty', 'Rights', 'Publish'];

export default function NewDesignPage() {
  const loading = useFakeLoading();
  const router = useRouter();
  const { id, designer } = useActiveDesigner();
  const createDesign = useStore((s) => s.createDesign);

  const [step, setStep] = React.useState(0);
  const [art, setArt] = React.useState<ProcessedArt | null>(null);
  const [details, setDetails] = React.useState<DetailsDraft>({ title: '', description: '', tags: [], categories: ['tshirt', 'hoodie', 'tote', 'mug'] });
  const [royalty, setRoyalty] = React.useState('60');
  const [rights, setRights] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [published, setPublished] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (art && !details.title) {
      const t = art.name.replace(/\.[a-z]+$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      setDetails((d) => ({ ...d, title: t, categories: art.file.kind === 'svg' ? (ALL_CATEGORIES as Category[]) : d.categories }));
    }
  }, [art, details.title]);

  if (!designer) return <EmptyState body="Pick a designer persona in the Demo Bar to upload designs." />;
  if (loading) return <Skeleton className="h-[520px]" />;

  const canNext = (s: number): string | null => {
    if (s === 0 && !art) return 'Upload a file first.';
    if (s === 2 && Object.keys(detailsErrors(details)).length) return 'Fill in the details first.';
    if (s === 3 && royaltyError(royalty)) return royaltyError(royalty);
    if (s === 4 && !rights) return 'Confirm you own the rights to this artwork.';
    return null;
  };

  const next = () => {
    const err = canNext(step);
    if (err) {
      setShowErrors(true);
      toast.error(err);
      return;
    }
    setShowErrors(false);
    setStep(Math.min(STEPS.length - 1, step + 1));
  };

  const goTo = (i: number) => {
    for (let s = 0; s < i; s++) {
      const err = canNext(s);
      if (err) {
        setStep(s);
        setShowErrors(true);
        toast.error(err);
        return;
      }
    }
    setStep(i);
  };

  const save = (status: 'draft' | 'published') => {
    if (!art) return goTo(0);
    if (status === 'published' && !rights) {
      setStep(4);
      toast.error('Confirm you own the rights before publishing.');
      return;
    }
    const newId = createDesign({
      designerId: id,
      title: details.title.trim(),
      description: details.description.trim() || `${details.title.trim()} by ${designer.name}.`,
      files: art.file,
      tags: details.tags,
      compatibleCategories: details.categories,
      royalty: { type: 'fixed', amount: Number(royalty) },
      status,
      isPrivate: false,
      palette: art.palette,
    });
    if (status === 'draft') {
      toast.success('Saved as a draft. Publish it from My designs when you are ready.');
      router.push('/designer/designs');
    } else setPublished(newId);
  };

  const shareUrl = published && typeof window !== 'undefined' ? `${window.location.origin}/designs/${published}` : '';

  return (
    <div className="pb-24 md:pb-0">
      <PageHeader title="Upload a design" subtitle="Six quick steps. Your design earns a royalty every time it is printed." back={{ href: '/designer/designs', label: 'My designs' }} />

      <nav aria-label="Steps" className="no-scrollbar mb-5 flex gap-1 overflow-x-auto">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => goTo(i)}
            aria-current={i === step ? 'step' : undefined}
            className={cn('flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium', i === step ? 'bg-accent text-white' : i < step ? 'bg-accent-soft text-accent-text' : 'text-muted hover:bg-surface-2')}
          >
            <span className={cn('grid h-6 w-6 place-items-center rounded-full text-xs font-bold', i === step ? 'bg-white/25' : 'bg-surface-2')}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            {s}
          </button>
        ))}
      </nav>

      <Card className="p-4 sm:p-6">
        {step === 0 ? (
          <>
            <h2 className="mb-3 font-display text-xl font-semibold">Upload your artwork</h2>
            <DesignUploader value={art} onChange={setArt} />
          </>
        ) : null}

        {step === 1 && art ? (
          <>
            <h2 className="font-display text-xl font-semibold">Preview on products</h2>
            <p className="mb-4 text-sm text-muted">This is how customers will see it. Check the dark row carefully.</p>
            <MockupPreviewStrip src={art.file.src} widthPx={art.file.widthPx} heightPx={art.file.heightPx} categories={details.categories} />
            {art.darkShare > 0.6 ? <p className="mt-3 rounded-input bg-warning/15 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">Most of your ink is dark, so it may vanish on black shirts. Consider removing dark shirts from compatible products, or add an outline.</p> : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="mb-4 font-display text-xl font-semibold">Details</h2>
            <DetailsFields value={details} onChange={setDetails} showErrors={showErrors} />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="mb-4 font-display text-xl font-semibold">Set your royalty</h2>
            <RoyaltyField value={royalty} onChange={setRoyalty} />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2 className="mb-4 font-display text-xl font-semibold">Rights</h2>
            <label className={cn('flex cursor-pointer items-start gap-3 rounded-card border p-4', showErrors && !rights ? 'border-danger/60' : 'border-border')}>
              <Checkbox checked={rights} onCheckedChange={(v) => setRights(v === true)} aria-label="I own this artwork" className="mt-0.5" />
              <span className="text-sm">
                <span className="block font-semibold">I created this artwork or have the rights to sell it</span>
                <span className="text-muted">No copied logos, characters or brand names. Designs reported for copyright are hidden while we review them.</span>
              </span>
            </label>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <ShieldCheck className="h-4 w-4" /> You keep the copyright. Printloom only prints it when a customer orders.
            </p>
          </>
        ) : null}

        {step === 5 && art ? (
          <>
            <h2 className="mb-4 font-display text-xl font-semibold">Ready to go</h2>
            <ArtSummary art={art} />
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Summary label="Title" value={details.title} />
              <Summary label="Tags" value={details.tags.join(', ')} />
              <Summary label="Works on" value={details.categories.map((c) => CATEGORY_LABEL[c]).join(', ')} />
              <Summary label="Royalty per print" value={<MoneyText value={Number(royalty)} />} />
              <Summary label="Rights confirmed" value={rights ? 'Yes' : 'Not yet'} />
            </dl>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => save('draft')}>
                Save draft
              </Button>
              <Button onClick={() => save('published')} disabled={!rights}>
                Publish to library
              </Button>
            </div>
          </>
        ) : null}
      </Card>

      {step < 5 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-between gap-2 border-t border-border bg-surface/95 p-3 backdrop-blur md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
          <Button variant="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={next}>
            Next: {STEPS[step + 1]} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <Button variant="ghost" onClick={() => setStep(4)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      )}

      <Dialog open={!!published} onOpenChange={(o) => !o && router.push('/designer/designs')}>
        {published ? (
          <DialogContent title="Your design is live" description="It is in the library now and on your public profile.">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent">
                <PartyPopper className="h-8 w-8" />
              </span>
              <p className="text-sm text-muted">Share the link so fans can order it right away.</p>
              <div className="flex w-full gap-2">
                <Input readOnly value={shareUrl} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(shareUrl)
                      .then(() => toast.success('Link copied'))
                      .catch(() => toast.error("Couldn't copy. Select the link and copy it."));
                  }}
                >
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
              <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
                <Button variant="secondary" className="flex-1" onClick={() => router.push('/designer/designs')}>
                  Go to My designs
                </Button>
                <Button asChild className="flex-1">
                  <Link href={`/designs/${published}`}>View in library</Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-input bg-surface-2 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold">{value || 'None'}</dd>
    </div>
  );
}
