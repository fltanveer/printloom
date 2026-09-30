'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Globe, ImagePlus, Send, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { cn } from '@/components/ui/cn';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { Avatar, ListSkeleton, PageHeader, Rating, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { readFilesAsDataUrls } from '@/components/checkout/helpers';
import { useCustomerId, useStore } from '@/lib/store';
import { addDays } from '@/lib/dates';

const USES = ['Personal', 'Gift', 'Small business', 'Event', 'Team or club', 'Office'];
const HINTS = ['Main character or object:', 'Colors I like:', 'Text to include:', 'Mood (fun, serious, cozy):', 'Where it will be printed:', 'Things to avoid:'];
const STEPS = ['Product', 'Brief', 'References', 'Style', 'Budget', 'Send'] as const;

export default function NewRequestPage() {
  return (
    <React.Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-6"><ListSkeleton rows={4} /></div>}>
      <Wizard />
    </React.Suspense>
  );
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function Wizard() {
  const loading = useFakeLoading();
  const router = useRouter();
  const search = useSearchParams();
  const cid = useCustomerId();
  const products = useStore((s) => s.products);
  const designers = useStore((s) => s.designers);
  const createRequest = useStore((s) => s.createRequest);
  const money = useMoney();

  const presetDesigner = search.get('designer');
  const presetProduct = search.get('product');
  const [step, setStep] = React.useState(0);
  const [productId, setProductId] = React.useState(presetProduct && products[presetProduct] ? presetProduct : 'p_tee');
  const [use, setUse] = React.useState(USES[0]);
  const [title, setTitle] = React.useState('');
  const [brief, setBrief] = React.useState('');
  const [refs, setRefs] = React.useState<string[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);
  const [budget, setBudget] = React.useState({ min: 1500, max: 3000 });
  const [deadline, setDeadline] = React.useState(toDateInput(addDays(new Date(), 7)));
  const [target, setTarget] = React.useState<'direct' | 'public'>(presetDesigner && designers[presetDesigner] ? 'direct' : 'public');
  const [designerId, setDesignerId] = React.useState<string>(presetDesigner && designers[presetDesigner] ? presetDesigner : Object.values(designers).find((d) => d.acceptsRequests)?.id ?? '');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const allTags = React.useMemo(() => [...new Set(Object.values(designers).flatMap((d) => d.tags))].sort(), [designers]);
  const designer = target === 'direct' ? designers[designerId] : null;
  const belowStart = !!designer && budget.max < designer.startingPrice;
  const minDate = toDateInput(addDays(new Date(), 1));

  const errors: Record<number, string | null> = {
    0: productId ? null : 'Pick a product',
    1: title.trim().length < 3 ? 'Give your request a short title' : brief.trim().length < 20 ? 'Describe your idea in at least a sentence or two (20 characters)' : null,
    2: null,
    3: tags.length ? null : 'Pick at least one style so the right designers see it',
    4: budget.min <= 0 || budget.max < budget.min ? 'Maximum budget must be at least the minimum' : deadline < minDate ? 'Pick a deadline from tomorrow onward' : null,
    5: target === 'direct' && !designer ? 'Pick a designer' : null,
  };

  const next = () => {
    setTried(true);
    if (errors[step]) return;
    setTried(false);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const send = () => {
    const id = createRequest({
      customerId: cid,
      designerId: target === 'direct' ? designerId : null,
      title: title.trim(),
      brief: brief.trim(),
      refs,
      styleTags: tags,
      productId,
      use,
      budget,
      deadline: new Date(`${deadline}T18:00:00+06:00`).toISOString(),
      status: target === 'direct' ? 'sent' : 'open',
    });
    toast.success(target === 'direct' ? `Sent to ${designer?.name}` : 'Posted. Designers who match your styles were notified.');
    router.push(`/requests/${id}`);
  };

  const trySend = () => {
    setTried(true);
    const firstBad = Object.entries(errors).find(([, e]) => e);
    if (firstBad) {
      setStep(Number(firstBad[0]));
      return;
    }
    if (belowStart) setConfirmOpen(true);
    else send();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  const err = tried ? errors[step] : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="relative mb-6 h-36 overflow-hidden rounded-sheet sm:h-44">
        <SafeImage src="/stock/request.jpg" alt="A designer sketching ideas" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">New design request</h1>
          <p className="text-sm text-white/85">Tell a designer what you want. Pay only when you accept a proposal.</p>
        </div>
      </div>

      <ol className="mb-5 flex gap-1.5" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step} className="w-full text-left" aria-current={i === step ? 'step' : undefined}>
              <span className={cn('block h-1.5 rounded-full', i <= step ? 'bg-accent' : 'bg-surface-2')} />
              <span className={cn('mt-1 hidden text-xs sm:block', i === step ? 'font-semibold text-text' : 'text-muted')}>{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-sheet border border-border bg-surface p-4 sm:p-6">
        {step === 0 ? (
          <div className="space-y-4">
            <PageHeader title="What is it for?" className="!mb-2" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Product">
              {Object.values(products).map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={productId === p.id} onClick={() => setProductId(p.id)} className={cn('min-h-[52px] rounded-input border px-3 py-2 text-left text-sm font-medium', productId === p.id ? 'border-accent bg-accent-soft/60' : 'border-border hover:border-accent/50')}>
                  {p.name}
                </button>
              ))}
            </div>
            <Field label="How will you use it?" htmlFor="use">
              <NativeSelect id="use" value={use} onChange={(e) => setUse(e.target.value)}>
                {USES.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <PageHeader title="Your idea" subtitle="The more specific, the better the proposals." className="!mb-2" />
            <Field label="Title" htmlFor="title">
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Logo for my home bakery" maxLength={80} />
            </Field>
            <Field label="Brief" htmlFor="brief" hint={`${brief.trim().length} characters`}>
              <Textarea id="brief" value={brief} onChange={(e) => setBrief(e.target.value)} className="min-h-[140px]" placeholder="A cute cupcake mascot with the name Mishti Bites. Pastel colors, friendly." />
            </Field>
            <div>
              <div className="mb-1.5 text-sm font-medium">Need a nudge? Tap to add a prompt</div>
              <div className="flex flex-wrap gap-2">
                {HINTS.map((h) => (
                  <button key={h} type="button" onClick={() => setBrief((b) => `${b}${b && !b.endsWith('\n') ? '\n' : ''}${h} `)} className="min-h-[36px] rounded-full border border-border px-3 text-sm hover:border-accent hover:text-accent-text">
                    + {h.replace(':', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <PageHeader title="References" subtitle="Optional. Photos, sketches or styles you like, up to 5." className="!mb-2" />
            <div className="flex flex-wrap gap-3">
              {refs.map((r, i) => (
                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-input border border-border">
                  <img src={r} alt={`Reference ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" aria-label={`Remove reference ${i + 1}`} onClick={() => setRefs((x) => x.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {refs.length < 5 ? (
                <button type="button" onClick={() => fileRef.current?.click()} className="grid h-24 w-24 place-items-center rounded-input border border-dashed border-border text-muted hover:border-accent hover:text-accent-text" aria-label="Upload reference">
                  <ImagePlus className="h-7 w-7" />
                </button>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const big = Array.from(e.target.files ?? []).some((f) => f.size > 25 * 1024 * 1024);
                  if (big) {
                    toast.error('Files must be under 25 MB');
                    e.target.value = '';
                    return;
                  }
                  const urls = await readFilesAsDataUrls(e.target.files, 5 - refs.length);
                  if ((e.target.files?.length ?? 0) > urls.length) toast.error('Only images, up to 5 in total');
                  setRefs((x) => [...x, ...urls].slice(0, 5));
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <PageHeader title="Style" subtitle="Designers who work in these styles get notified." className="!mb-2" />
            <div className="flex flex-wrap gap-2">
              {allTags.map((t) => {
                const on = tags.includes(t);
                return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => setTags((x) => (on ? x.filter((y) => y !== t) : [...x, t]))} className={cn('min-h-[40px] rounded-full border px-4 text-sm font-medium capitalize', on ? 'border-accent bg-accent text-white' : 'border-border hover:border-accent/50')}>
                    {on ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <PageHeader title="Budget and deadline" subtitle="Designers can counter-propose, so a range works best." className="!mb-2" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minimum (৳)" htmlFor="bmin">
                <Input id="bmin" type="number" min={0} step={100} value={budget.min} onChange={(e) => setBudget((b) => ({ ...b, min: Math.max(0, Number(e.target.value)) }))} />
              </Field>
              <Field label="Maximum (৳)" htmlFor="bmax">
                <Input id="bmax" type="number" min={0} step={100} value={budget.max} onChange={(e) => setBudget((b) => ({ ...b, max: Math.max(0, Number(e.target.value)) }))} />
              </Field>
            </div>
            <p className="text-sm text-muted">
              Your range: <MoneyText value={budget.min} /> to <MoneyText value={budget.max} />. You only pay the accepted price, held safely until you approve.
            </p>
            <Field label="Deadline" htmlFor="deadline">
              <Input id="deadline" type="date" min={minDate} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <PageHeader title="Who should design it?" className="!mb-2" />
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Send to">
              <button type="button" role="radio" aria-checked={target === 'direct'} onClick={() => setTarget('direct')} className={cn('flex items-start gap-3 rounded-card border p-3 text-left', target === 'direct' ? 'border-accent bg-accent-soft/60' : 'border-border')}>
                <User className="mt-0.5 h-5 w-5" />
                <span>
                  <span className="block font-semibold">A specific designer</span>
                  <span className="block text-xs text-muted">Only they see it and can propose</span>
                </span>
              </button>
              <button type="button" role="radio" aria-checked={target === 'public'} onClick={() => setTarget('public')} className={cn('flex items-start gap-3 rounded-card border p-3 text-left', target === 'public' ? 'border-accent bg-accent-soft/60' : 'border-border')}>
                <Globe className="mt-0.5 h-5 w-5" />
                <span>
                  <span className="block font-semibold">Post publicly</span>
                  <span className="block text-xs text-muted">Any matching designer can send a proposal</span>
                </span>
              </button>
            </div>
            {target === 'direct' ? (
              <div className="grid gap-2">
                {Object.values(designers).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!d.acceptsRequests}
                    onClick={() => setDesignerId(d.id)}
                    aria-pressed={designerId === d.id}
                    className={cn('flex items-center gap-3 rounded-input border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50', designerId === d.id ? 'border-accent bg-accent-soft/60' : 'border-border')}
                  >
                    <Avatar src={d.avatar} name={d.name} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{d.name}</span>
                      <span className="block truncate text-xs capitalize text-muted">{d.tags.join(', ')}</span>
                    </span>
                    <span className="text-right text-xs">
                      <Rating value={d.rating} />
                      <span className="block text-muted">{d.acceptsRequests ? <>From <MoneyText value={d.startingPrice} /></> : 'Not taking requests'}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {belowStart && designer ? (
              <div className="flex items-start gap-2 rounded-input border border-warning/40 bg-warning/10 p-3 text-sm" role="alert">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Budget is below {designer.name.split(' ')[0]}&apos;s starting price of {money(designer.startingPrice)}. They can still counter-propose.
                </span>
              </div>
            ) : null}
            <div className="rounded-input bg-surface-2 p-3 text-sm">
              <div className="font-semibold">{title || 'Untitled request'}</div>
              <div className="text-muted">
                {products[productId]?.name} · {use} · <MoneyText value={budget.min} /> to <MoneyText value={budget.max} /> · {refs.length} references · {tags.join(', ') || 'no styles'}
              </div>
            </div>
          </div>
        ) : null}

        {err ? <p className="mt-4 text-sm font-medium text-danger">{err}</p> : null}

        <div className="mt-6 flex justify-between gap-2">
          <Button variant="ghost" onClick={() => (step === 0 ? router.push('/requests') : setStep((s) => s - 1))}>
            <ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={trySend}>
              <Send className="h-4 w-4" /> {target === 'direct' ? `Send to ${designer?.name.split(' ')[0] ?? 'designer'}` : 'Post request'}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send with a lower budget?"
        description={designer ? `Budget is below ${designer.name.split(' ')[0]}'s starting price of ${money(designer.startingPrice)}. They can still counter-propose.` : ''}
        confirmLabel="Send anyway"
        onConfirm={send}
      />
    </div>
  );
}
