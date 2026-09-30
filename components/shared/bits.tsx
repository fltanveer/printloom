'use client';
// Small shared building blocks: Timeline, EmptyState, RoleBadge, ColorSwatch, SizeChip, Rating, Avatar,
// PageHeader, KpiCard, SafeImage, loading helpers.

import * as React from 'react';
import Link from 'next/link';
import { Check, ImageOff, Star, AlertTriangle, RefreshCcw } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/components/ui/cn';
import { Tip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { formatDateTime, timeAgo } from '@/lib/dates';
import type { Role, TimelineEvent } from '@/lib/types';

// ---------- Timeline ----------

const ACTOR_COLOR: Record<string, string> = { customer: '#6D4AFF', vendor: '#FF7A1A', designer: '#FF3D8B', admin: '#0FB5A6', system: '#8b87a6' };

export function Timeline({ events, className }: { events: TimelineEvent[]; className?: string }) {
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  if (!sorted.length) return <p className="text-sm text-muted">No activity yet.</p>;
  return (
    <ol className={cn('relative space-y-4 pl-6', className)}>
      <span className="absolute bottom-2 left-[7px] top-2 w-px bg-border" aria-hidden />
      {sorted.map((e, i) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-6 top-1 grid h-[15px] w-[15px] place-items-center rounded-full border-2 bg-surface" style={{ borderColor: ACTOR_COLOR[e.actor] }}>
            {i === 0 ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACTOR_COLOR[e.actor] }} /> : null}
          </span>
          <div className="text-sm font-semibold">{e.label}</div>
          <div className="text-xs text-muted">
            {e.actorName} · <time dateTime={e.at} title={formatDateTime(e.at)}>{formatDateTime(e.at)}</time>
          </div>
          {e.note ? <p className="mt-1 rounded-input bg-surface-2 px-3 py-2 text-sm text-muted">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}

// ---------- EmptyState with small playful illustrations ----------

export function EmptyIllustration({ kind = 'box' }: { kind?: 'box' | 'search' | 'shirt' | 'inbox' | 'spark' }) {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-36" aria-hidden>
      <ellipse cx="80" cy="108" rx="54" ry="7" fill="var(--surface-2)" />
      {kind === 'search' ? (
        <>
          <circle cx="72" cy="54" r="30" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="6" />
          <path d="M94 76l22 22" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" />
          <path d="M60 50q12-14 24 0" stroke="var(--accent)" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : kind === 'shirt' ? (
        <>
          <path d="M52 22q28 16 56 0l26 12-10 22-12-6v52H48V50l-12 6-10-22z" fill="var(--accent)" />
          <circle cx="80" cy="62" r="12" fill="#FFE14D" />
          <path d="M60 22q20 14 40 0" stroke="#fff" strokeWidth="3" fill="none" opacity=".6" />
        </>
      ) : kind === 'inbox' ? (
        <>
          <rect x="34" y="30" width="92" height="66" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="5" />
          <path d="M34 66h26l8 12h24l8-12h26" stroke="var(--accent)" strokeWidth="5" fill="none" />
          <circle cx="118" cy="30" r="10" fill="#FF3D8B" />
        </>
      ) : kind === 'spark' ? (
        <>
          <path d="M80 12l10 30 30 10-30 10-10 30-10-30-30-10 30-10z" fill="var(--accent)" />
          <circle cx="126" cy="26" r="7" fill="#FFE14D" />
          <circle cx="36" cy="86" r="5" fill="#FF3D8B" />
        </>
      ) : (
        <>
          <path d="M40 44l40-18 40 18v46l-40 18-40-18z" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="5" strokeLinejoin="round" />
          <path d="M40 44l40 18 40-18M80 62v46" stroke="var(--accent)" strokeWidth="5" fill="none" strokeLinejoin="round" />
          <circle cx="124" cy="24" r="8" fill="#FFE14D" />
        </>
      )}
    </svg>
  );
}

export function EmptyState({
  title,
  body,
  action,
  kind,
  className,
}: {
  title?: string;
  body: string;
  action?: React.ReactNode;
  kind?: 'box' | 'search' | 'shirt' | 'inbox' | 'spark';
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center', className)}>
      <EmptyIllustration kind={kind} />
      {title ? <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3> : null}
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ body, onRetry }: { body: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div className="flex-1">
        <p className="font-medium text-text">{body}</p>
        {onRetry ? (
          <Button variant="link" size="sm" onClick={onRetry} className="mt-1">
            <RefreshCcw className="h-4 w-4" /> Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ---------- Role badge ----------

const ROLE_META: Record<Role, { label: string; color: string }> = {
  customer: { label: 'Customer', color: '#6D4AFF' },
  vendor: { label: 'Vendor', color: '#FF7A1A' },
  designer: { label: 'Designer', color: '#FF3D8B' },
  admin: { label: 'Admin', color: '#0FB5A6' },
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const m = ROLE_META[role];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold text-white', className)} style={{ background: m.color }}>
      {m.label}
    </span>
  );
}
export const ROLE_COLOR: Record<Role, string> = { customer: '#6D4AFF', vendor: '#FF7A1A', designer: '#FF3D8B', admin: '#0FB5A6' };

// ---------- Color swatch & size chip ----------

export function ColorSwatch({
  name,
  hex,
  selected,
  disabled,
  hint,
  onClick,
  size = 'md',
}: {
  name: string;
  hex: string;
  selected?: boolean;
  disabled?: boolean;
  hint?: string;
  onClick?: () => void;
  size?: 'sm' | 'md';
}) {
  const light = parseInt(hex.replace('#', '').padEnd(6, '0'), 16) > 0xe0e0e0;
  return (
    <Tip content={hint ? `${name}. ${hint}` : name}>
      <button
        type="button"
        onClick={onClick}
        aria-label={hint ? `${name}, ${hint}` : name}
        aria-pressed={selected}
        disabled={disabled}
        className={cn(
          'relative grid shrink-0 place-items-center rounded-full transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-35',
          size === 'md' ? 'h-11 w-11' : 'h-7 w-7',
          selected && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
        )}
      >
        <span className={cn('block rounded-full', size === 'md' ? 'h-9 w-9' : 'h-6 w-6', light && 'border border-border')} style={{ background: hex }} />
        {selected ? <Check className={cn('absolute h-4 w-4', light ? 'text-black' : 'text-white')} strokeWidth={3} /> : null}
      </button>
    </Tip>
  );
}

export function ColorDots({ colors, max = 6 }: { colors: { name: string; hex: string }[]; max?: number }) {
  return (
    <div className="flex items-center -space-x-1">
      {colors.slice(0, max).map((c) => (
        <span key={c.name} title={c.name} aria-label={c.name} className="h-4 w-4 rounded-full border-2 border-surface" style={{ background: c.hex }} />
      ))}
      {colors.length > max ? <span className="pl-2 text-xs text-muted">+{colors.length - max}</span> : null}
    </div>
  );
}

export function SizeChip({ size, selected, disabledReason, onClick, badge }: { size: string; selected?: boolean; disabledReason?: string | null; onClick?: () => void; badge?: string }) {
  const btn = (
    <button
      type="button"
      onClick={disabledReason ? undefined : onClick}
      aria-disabled={!!disabledReason}
      aria-pressed={selected}
      className={cn(
        'relative h-11 min-w-[48px] rounded-input border px-3 text-sm font-semibold transition-colors',
        selected ? 'border-accent bg-accent text-white' : 'border-border bg-surface hover:border-accent/60',
        disabledReason && 'cursor-not-allowed border-dashed text-muted line-through opacity-60 hover:border-border',
      )}
    >
      {size}
      {badge ? <span className="absolute -right-1.5 -top-1.5 rounded-full bg-warning px-1 text-[10px] font-bold text-black">{badge}</span> : null}
    </button>
  );
  return disabledReason ? <Tip content={disabledReason}>{btn}</Tip> : btn;
}

// ---------- Rating ----------

export function Rating({ value, count, className, size = 'sm' }: { value: number; count?: number; className?: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', size === 'md' ? 'text-base' : 'text-sm', className)}>
      <Star className={cn('fill-amber-400 text-amber-400', size === 'md' ? 'h-5 w-5' : 'h-4 w-4')} />
      <span className="font-semibold">{value.toFixed(1)}</span>
      {count !== undefined ? <span className="text-muted">({count})</span> : null}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="grid h-11 w-11 place-items-center">
          <Star className={cn('h-7 w-7 transition-colors', n <= value ? 'fill-amber-400 text-amber-400' : 'text-border')} />
        </button>
      ))}
    </div>
  );
}

// ---------- Avatar ----------

export function Avatar({ src, name, color, size = 40, className, square }: { src?: string; name: string; color?: string; size?: number; className?: string; square?: boolean }) {
  const [err, setErr] = React.useState(false);
  const isImg = !!src && (src.startsWith('/') || src.startsWith('http') || src.startsWith('data:')) && !err;
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center overflow-hidden font-display font-bold text-white', square ? 'rounded-input' : 'rounded-full', className)}
      style={{ width: size, height: size, background: color ?? 'var(--accent)', fontSize: size * 0.38 }}
    >
      {isImg ? <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setErr(true)} /> : src && src.length <= 3 ? src : initials}
    </span>
  );
}

// ---------- SafeImage with branded placeholder ----------

export function SafeImage({ src, alt, className, contain }: { src: string; alt: string; className?: string; contain?: boolean }) {
  const [err, setErr] = React.useState(false);
  if (err || !src)
    return (
      <div className={cn('grid place-items-center bg-gradient-to-br from-accent/20 to-designer/20 text-accent-text', className)} role="img" aria-label={alt}>
        <div className="flex flex-col items-center gap-1 text-xs font-semibold">
          <ImageOff className="h-6 w-6" />
          Printloom
        </div>
      </div>
    );
  return <img src={src} alt={alt} loading="lazy" onError={() => setErr(true)} className={cn(contain ? 'object-contain' : 'object-cover', className)} />;
}

// ---------- Page header ----------

export function PageHeader({ title, subtitle, actions, back, className }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string }; className?: string }) {
  return (
    <div className={cn('mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-1 inline-flex min-h-[32px] items-center text-sm font-medium text-muted hover:text-text">
            ← {back.label}
          </Link>
        ) : null}
        <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

// ---------- KPI card with sparkline ----------

export function KpiCard({ label, value, delta, spark, icon, className }: { label: string; value: React.ReactNode; delta?: { text: string; good: boolean } | null; spark?: number[]; icon?: React.ReactNode; className?: string }) {
  const data = (spark ?? []).map((v, i) => ({ i, v }));
  const gid = React.useId().replace(/:/g, '');
  return (
    <div className={cn('relative overflow-hidden rounded-card border border-border bg-surface p-4 shadow-s1', className)}>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</div>
      {delta ? <div className={cn('mt-0.5 text-xs font-semibold', delta.good ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{delta.text}</div> : null}
      {data.length > 1 ? (
        <div className="pointer-events-none absolute bottom-0 right-0 h-12 w-28 opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`k-${gid}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} fill={`url(#k-${gid})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

// ---------- loading helpers (fake 300 to 500 ms on first mount) ----------

export function useFakeLoading(ms?: number): boolean {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms ?? 300 + Math.round(Math.random() * 200));
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

export function GridSkeleton({ items = 8, className }: { items?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/5] w-full" />
      ))}
    </div>
  );
}

export function Ago({ at }: { at: string }) {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => setNow(new Date()), []);
  return <time dateTime={at} title={formatDateTime(at)}>{now ? timeAgo(at, now) : formatDateTime(at)}</time>;
}

/** Text that truncates with a tooltip showing the full value. */
export function Truncate({ text, className }: { text: string; className?: string }) {
  return (
    <Tip content={text.length > 28 ? text : null}>
      <span className={cn('block truncate', className)}>{text}</span>
    </Tip>
  );
}
