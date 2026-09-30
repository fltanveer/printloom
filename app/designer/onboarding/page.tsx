'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, CheckCircle2, Circle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress, Skeleton } from '@/components/ui/misc';
import { cn } from '@/components/ui/cn';
import { EmptyState, PageHeader, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { TagInput, useActiveDesigner } from '@/components/designer/bits';
import { SEED_IMAGES, titleFromFile } from '@/components/designer/imageFile';
import { ALL_CATEGORIES } from '@/components/designer/MockupPreviewStrip';

const AVATARS = ['/stock/designer-1.jpg', '/stock/designer-2.jpg', '/stock/designer-3.jpg', '/stock/designer-4.jpg', '/stock/designer-5.jpg'];

interface Draft {
  name: string;
  avatar: string;
  cover: string;
  bio: string;
  tags: string[];
  acceptsRequests: boolean;
  startingPrice: string;
  turnaroundDays: string;
  revisionLimit: string;
  extraRevisionFee: string;
}

export default function DesignerOnboarding() {
  const loading = useFakeLoading();
  const router = useRouter();
  const { id, designer } = useActiveDesigner();
  const designs = useStore((s) => s.designs);
  const updateDesigner = useStore((s) => s.updateDesigner);
  const createDesign = useStore((s) => s.createDesign);

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [picked, setPicked] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!designer) return;
    setDraft({
      name: designer.name,
      avatar: designer.avatar,
      cover: designer.cover,
      bio: designer.bio,
      tags: designer.tags,
      acceptsRequests: designer.acceptsRequests,
      startingPrice: String(designer.startingPrice),
      turnaroundDays: String(designer.turnaroundDays),
      revisionLimit: String(designer.revisionLimit),
      extraRevisionFee: String(designer.extraRevisionFee),
    });
    setPicked([]);
    // reset the draft only when the active designer changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const mine = React.useMemo(() => Object.values(designs).filter((d) => d.designerId === id && !d.isPrivate), [designs, id]);
  const mySrcs = new Set(mine.map((d) => d.files.src));
  const takenByOthers = new Set(Object.values(designs).filter((d) => d.designerId !== id).map((d) => d.files.src));
  const importable = SEED_IMAGES.filter((s) => !mySrcs.has(s) && !takenByOthers.has(s));

  if (!designer) return <EmptyState body="Pick a designer persona in the Demo Bar to set up a profile." />;
  if (loading || !draft) return <Skeleton className="h-[600px]" />;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const num = (v: string) => Number(v);
  const settingsOk = num(draft.startingPrice) >= 200 && num(draft.turnaroundDays) >= 1 && num(draft.revisionLimit) >= 0 && num(draft.extraRevisionFee) >= 0;
  const steps = [
    { label: 'Profile', done: draft.name.trim().length >= 2 && !!draft.avatar },
    { label: 'Bio', done: draft.bio.trim().length >= 20 },
    { label: 'Specialties', done: draft.tags.length >= 1 },
    { label: 'Portfolio', done: mine.length + picked.length >= 1 },
    { label: 'Request settings', done: settingsOk },
  ];
  const progress = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);

  const save = () => {
    const missing = steps.filter((s) => !s.done).map((s) => s.label);
    if (missing.length) {
      toast.error(`Almost there. Still missing: ${missing.join(', ')}.`);
      return;
    }
    updateDesigner(id, (d) => {
      d.name = draft.name.trim();
      d.avatar = draft.avatar;
      d.cover = draft.cover;
      d.bio = draft.bio.trim();
      d.tags = draft.tags;
      d.acceptsRequests = draft.acceptsRequests;
      d.startingPrice = Math.round(num(draft.startingPrice));
      d.turnaroundDays = Math.round(num(draft.turnaroundDays));
      d.revisionLimit = Math.round(num(draft.revisionLimit));
      d.extraRevisionFee = Math.round(num(draft.extraRevisionFee));
      d.onboarded = true;
    });
    picked.forEach((src) => {
      const svg = src.endsWith('.svg');
      createDesign({
        designerId: id,
        title: titleFromFile(src),
        description: `${titleFromFile(src)} by ${draft.name.trim()}.`,
        files: svg ? { src, widthPx: 3600, heightPx: 3600, transparent: true, kind: 'svg' } : { src, widthPx: 3000, heightPx: 3000, transparent: false, kind: 'jpg' },
        tags: draft.tags.slice(0, 3),
        compatibleCategories: svg ? ALL_CATEGORIES : ALL_CATEGORIES.filter((c) => c !== 'cap'),
        royalty: { type: 'fixed', amount: 60 },
        status: 'draft',
        isPrivate: false,
        palette: [],
      });
    });
    toast.success(picked.length ? `Profile saved. ${picked.length} portfolio piece${picked.length > 1 ? 's' : ''} added as drafts in My designs.` : 'Profile saved. You are all set.');
    router.push('/designer');
  };

  return (
    <div className="pb-24">
      <PageHeader title="Set up your designer profile" subtitle="Customers see this on your public page. You can change it any time." />

      <Card className="mb-5 p-4">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold">
          <span>{progress === 100 ? 'Ready to go' : 'Profile progress'}</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <Progress value={progress} />
        <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {steps.map((s) => (
            <li key={s.label} className={cn('flex items-center gap-1.5', s.done ? 'text-text' : 'text-muted')}>
              {s.done ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />} {s.label}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold">1. Profile</h2>
          <Field label="Display name" htmlFor="ob-name">
            <Input id="ob-name" value={draft.name} onChange={(e) => set('name', e.target.value)} maxLength={60} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">Profile photo</p>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button key={a} type="button" onClick={() => set('avatar', a)} aria-pressed={draft.avatar === a} aria-label={`Use photo ${a.split('/').pop()}`} className={cn('relative h-14 w-14 overflow-hidden rounded-full border-2', draft.avatar === a ? 'border-accent' : 'border-transparent')}>
                  <SafeImage src={a} alt="" className="h-full w-full" />
                  {draft.avatar === a ? <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" /> : null}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Cover image</p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {SEED_IMAGES.map((c) => (
                <button key={c} type="button" onClick={() => set('cover', c)} aria-pressed={draft.cover === c} aria-label={`Use cover ${c.split('/').pop()}`} className={cn('h-14 w-20 shrink-0 overflow-hidden rounded-input border-2', draft.cover === c ? 'border-accent' : 'border-transparent')}>
                  <SafeImage src={c} alt="" className="h-full w-full" />
                </button>
              ))}
            </div>
          </div>
          <h2 className="pt-2 font-display text-lg font-semibold">2. Bio</h2>
          <Field label="A few lines about you and your style" htmlFor="ob-bio" hint={`${draft.bio.trim().length} characters, at least 20`}>
            <Textarea id="ob-bio" rows={4} value={draft.bio} onChange={(e) => set('bio', e.target.value)} maxLength={400} />
          </Field>
          <h2 className="pt-2 font-display text-lg font-semibold">3. Specialties</h2>
          <p className="-mt-2 text-sm text-muted">Open requests with these tags show up on your dashboard.</p>
          <TagInput id="ob-tags" value={draft.tags} onChange={(v) => set('tags', v)} />
        </Card>

        <div className="space-y-5">
          <Card className="space-y-3 p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold">4. Portfolio</h2>
            <p className="text-sm text-muted">
              You have {mine.length} design{mine.length === 1 ? '' : 's'}. Import more from your files below. They are added as drafts so you can set royalties before publishing.
            </p>
            {importable.length ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {importable.map((src) => {
                  const on = picked.includes(src);
                  return (
                    <button key={src} type="button" onClick={() => setPicked(on ? picked.filter((x) => x !== src) : [...picked, src])} aria-pressed={on} aria-label={`Import ${titleFromFile(src)}`} className={cn('relative aspect-square overflow-hidden rounded-input border-2 bg-surface-2', on ? 'border-accent' : 'border-transparent hover:border-border')}>
                      <SafeImage src={src} alt="" className="h-full w-full" contain />
                      {on ? (
                        <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-white">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">Everything in the demo library is already in a portfolio.</p>
            )}
            {picked.length ? <p className="text-sm font-medium">{picked.length} selected to import</p> : null}
          </Card>

          <Card className="space-y-4 p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold">5. Request settings</h2>
            <label className="flex min-h-[44px] items-center justify-between gap-3">
              <span>
                <span className="block font-medium">Accept custom design requests</span>
                <span className="text-sm text-muted">Customers can send you direct requests.</span>
              </span>
              <Switch checked={draft.acceptsRequests} onCheckedChange={(v) => set('acceptsRequests', v)} aria-label="Accept custom design requests" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starting price (৳)" htmlFor="ob-price" error={num(draft.startingPrice) < 200 ? 'At least ৳200' : null}>
                <Input id="ob-price" type="number" min={200} value={draft.startingPrice} onChange={(e) => set('startingPrice', e.target.value)} />
              </Field>
              <Field label="Turnaround (days)" htmlFor="ob-days" error={num(draft.turnaroundDays) < 1 ? 'At least 1 day' : null}>
                <Input id="ob-days" type="number" min={1} value={draft.turnaroundDays} onChange={(e) => set('turnaroundDays', e.target.value)} />
              </Field>
              <Field label="Free revisions" htmlFor="ob-rev">
                <Input id="ob-rev" type="number" min={0} max={10} value={draft.revisionLimit} onChange={(e) => set('revisionLimit', e.target.value)} />
              </Field>
              <Field label="Extra revision fee (৳)" htmlFor="ob-fee">
                <Input id="ob-fee" type="number" min={0} value={draft.extraRevisionFee} onChange={(e) => set('extraRevisionFee', e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.push('/designer/profile')}>
            Preview public page
          </Button>
          <Button onClick={save}>{designer.onboarded ? 'Save changes' : 'Finish setup'}</Button>
        </div>
      </div>
    </div>
  );
}
