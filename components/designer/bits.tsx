'use client';
import * as React from 'react';
import Link from 'next/link';
import { CalendarClock, Clock, MapPin, Plus, Tag, Users, Wallet, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyText } from '@/components/shared/MoneyText';
import { Avatar, EmptyState, Rating, SafeImage } from '@/components/shared/bits';
import { relativeDay } from '@/lib/dates';
import type { DesignRequest, DesignStatus } from '@/lib/types';

export function useActiveDesigner() {
  const id = useStore((s) => s.personas.designer);
  const designer = useStore((s) => s.designers[id]);
  return { id, designer };
}

export const STATUS_EXPLAIN: Partial<Record<DesignStatus, string>> = {
  flagged: 'Hidden from the library while Printloom reviews a report. Existing orders still print. You will get a notification when it is decided.',
  removed: 'Removed after review. It no longer appears anywhere and cannot be used in new orders. Existing orders still print.',
  unpublished: 'Hidden from the library. Existing orders are not affected.',
  draft: 'Only you can see drafts. Publish when you are ready.',
};

export const TAG_SUGGESTIONS = ['illustration', 'cute', 'animals', 'vintage', 'typography', 'retro', 'minimal', 'bangladesh', 'line art', 'sports', 'jersey', 'badge', 'pop', 'kawaii', 'streetwear', 'outdoor', 'nature', 'tech'];

/** Chip input for tags with suggestions. */
export function TagInput({ value, onChange, id, suggestions = TAG_SUGGESTIONS }: { value: string[]; onChange: (v: string[]) => void; id?: string; suggestions?: string[] }) {
  const [draft, setDraft] = React.useState('');
  const add = (t: string) => {
    const v = t.trim().toLowerCase();
    if (!v || value.includes(v) || value.length >= 10) return;
    onChange([...value, v]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-1 text-sm font-medium text-accent-text">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent/20" aria-label={`Remove tag ${t}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder="Add a tag and press Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            }
          }}
        />
        <Button variant="secondary" onClick={() => add(draft)} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions
          .filter((s) => !value.includes(s))
          .slice(0, 10)
          .map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="min-h-[32px] rounded-full border border-dashed border-border px-2.5 text-xs text-muted hover:border-accent hover:text-text">
              + {s}
            </button>
          ))}
      </div>
    </div>
  );
}

/** Brief block shared by the open board and the request detail. */
export function RequestBrief({ request }: { request: DesignRequest }) {
  const product = useStore((s) => s.products[request.productId]);
  const customer = useStore((s) => s.customers[request.customerId]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Avatar name={customer?.name ?? 'Customer'} src={customer?.avatar} size={22} color="#6D4AFF" /> {customer?.name ?? 'Customer'}
        </span>
        <span>{product?.name}</span>
        <span>{request.use}</span>
      </div>
      <p className="whitespace-pre-line text-[15px] leading-relaxed">{request.brief}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-input bg-surface-2 p-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted">
            <Wallet className="h-3.5 w-3.5" /> Budget
          </dt>
          <dd className="mt-0.5 font-semibold">
            <MoneyText value={request.budget.min} /> to <MoneyText value={request.budget.max} />
          </dd>
        </div>
        <div className="rounded-input bg-surface-2 p-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted">
            <CalendarClock className="h-3.5 w-3.5" /> Deadline
          </dt>
          <dd className="mt-0.5 font-semibold">{relativeDay(request.deadline)}</dd>
        </div>
      </dl>
      {request.styleTags.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="h-4 w-4 text-muted" />
          {request.styleTags.map((t) => (
            <Badge key={t} tone="accent">
              {t}
            </Badge>
          ))}
        </div>
      ) : null}
      {request.refs.length ? (
        <div>
          <p className="mb-2 text-sm font-semibold">References</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {request.refs.map((r, i) => (
              <a key={i} href={r} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-input border border-border bg-surface-2">
                <SafeImage src={r} alt={`Reference ${i + 1}`} className="h-full w-full" />
              </a>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">No reference images attached.</p>
      )}
    </div>
  );
}

/** The public designer profile, exactly as customers see it at /designer-profile/[id]. */
export function DesignerPublicProfile({ designerId }: { designerId: string }) {
  const designer = useStore((s) => s.designers[designerId]);
  const designs = useStore((s) => s.designs);
  const portfolio = React.useMemo(
    () => Object.values(designs).filter((d) => d.designerId === designerId && d.status === 'published' && !d.isPrivate).sort((a, b) => b.uses - a.uses),
    [designs, designerId],
  );
  if (!designer) return <EmptyState body="This designer could not be found." />;
  return (
    <div className="overflow-hidden rounded-sheet border border-border bg-surface shadow-s1">
      <div className="relative h-40 sm:h-56">
        <SafeImage src={designer.cover} alt={`${designer.name} cover`} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="px-4 pb-6 sm:px-6">
        <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <span className="rounded-full border-4 border-surface">
              <Avatar src={designer.avatar} name={designer.name} size={96} color="#FF3D8B" />
            </span>
            <div className="pb-1">
              <h2 className="font-display text-2xl font-bold">{designer.name}</h2>
              <p className="flex items-center gap-1 text-sm text-muted">
                <MapPin className="h-3.5 w-3.5" /> {designer.location.city}
              </p>
            </div>
          </div>
          {designer.acceptsRequests ? (
            <Button asChild>
              <Link href={`/requests/new?designer=${designer.id}`}>Request a design from {designer.name.split(' ')[0]}</Link>
            </Button>
          ) : (
            <Badge tone="neutral">Not taking requests right now</Badge>
          )}
        </div>
        <p className="mt-4 max-w-2xl text-[15px]">{designer.bio || 'No bio yet.'}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {designer.tags.map((t) => (
            <Badge key={t} tone="accent">
              {t}
            </Badge>
          ))}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Rating">
            <Rating value={designer.rating} count={designer.reviewCount} />
          </Stat>
          <Stat label="Turnaround">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted" /> {designer.turnaroundDays} days
            </span>
          </Stat>
          <Stat label="Starting price">
            <MoneyText value={designer.startingPrice} />
          </Stat>
          <Stat label="Followers">
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4 text-muted" /> {designer.followers.toLocaleString('en-US')}
            </span>
          </Stat>
        </dl>
        <h3 className="mb-3 mt-6 font-display text-lg font-semibold">Portfolio ({portfolio.length})</h3>
        {portfolio.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {portfolio.map((d) => (
              <Link key={d.id} href={`/designs/${d.id}`} className="group overflow-hidden rounded-card border border-border bg-surface-2">
                <div className="aspect-square overflow-hidden">
                  <SafeImage src={d.files.src} alt={d.title} className="h-full w-full transition-transform group-hover:scale-105" />
                </div>
                <div className="flex items-center justify-between gap-2 p-2 text-sm">
                  <span className="truncate font-medium">{d.title}</span>
                  <span className="shrink-0 text-xs text-muted">{d.uses} uses</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState kind="spark" body="No published designs yet." />
        )}
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-input bg-surface-2 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
