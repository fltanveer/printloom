'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Heart, Search, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { publicDesigns } from '@/lib/selectors';
import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, NativeSelect } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { EmptyState, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { Skeleton } from '@/components/ui/misc';
import { DesignCard } from '@/components/customer/cards';
import { CATEGORY_LABEL } from '@/components/customer/shopPricing';

function Library() {
  const data = useStore();
  const customerId = data.personas.customer;
  const favorites = data.customers[customerId]?.favorites ?? [];
  const params = useSearchParams();
  const router = useRouter();
  const loading = useFakeLoading();
  const [q, setQ] = React.useState(params.get('q') ?? '');
  const [tag, setTag] = React.useState<string | null>(params.get('tag'));
  const [cat, setCat] = React.useState<Category | 'all'>((params.get('category') as Category | null) ?? 'all');
  const [designer, setDesigner] = React.useState<string>(params.get('designer') ?? 'all');
  const [favOnly, setFavOnly] = React.useState(false);

  React.useEffect(() => setTag(params.get('tag')), [params]);

  const all = React.useMemo(() => publicDesigns(data).sort((a, b) => b.uses - a.uses), [data]);
  const tags = React.useMemo(() => {
    const count = new Map<string, number>();
    all.forEach((d) => d.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => t);
  }, [all]);

  const pickTag = (t: string | null) => {
    setTag(t);
    router.replace(t ? `/designs?tag=${encodeURIComponent(t)}` : '/designs', { scroll: false });
  };

  const needle = q.trim().toLowerCase();
  const list = all.filter((d) => {
    if (tag && !d.tags.includes(tag)) return false;
    if (cat !== 'all' && !d.compatibleCategories.includes(cat)) return false;
    if (designer !== 'all' && d.designerId !== designer) return false;
    if (favOnly && !favorites.includes(d.id)) return false;
    if (needle) {
      const who = d.designerId ? data.designers[d.designerId]?.name ?? '' : '';
      if (![d.title, who, ...d.tags].some((s) => s.toLowerCase().includes(needle))) return false;
    }
    return true;
  });

  const active = !!needle || !!tag || cat !== 'all' || designer !== 'all' || favOnly;
  const reset = () => {
    setQ('');
    setCat('all');
    setDesigner('all');
    setFavOnly(false);
    pickTag(null);
  };
  const cats = [...new Set(Object.values(data.products).map((p) => p.category))];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <PageHeader title="Design library" subtitle="Made by local designers. Every print pays them a royalty." />

      <div className="sticky top-16 z-20 -mx-4 mb-5 space-y-3 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:top-28">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search designs, tags or designers" className="pl-9" aria-label="Search designs" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <NativeSelect value={cat} onChange={(e) => setCat(e.target.value as Category | 'all')} aria-label="Works on" className="sm:w-40">
              <option value="all">Works on anything</option>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={designer} onChange={(e) => setDesigner(e.target.value)} aria-label="Designer" className="sm:w-44">
              <option value="all">All designers</option>
              {Object.values(data.designers).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button variant={favOnly ? 'soft' : 'secondary'} aria-pressed={favOnly} onClick={() => setFavOnly((x) => !x)}>
            <Heart className={cn('h-4 w-4', favOnly && 'fill-designer text-designer')} /> Favorites ({favorites.length})
          </Button>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button type="button" onClick={() => pickTag(null)} aria-pressed={!tag} className={cn('min-h-[36px] shrink-0 rounded-full border px-3 text-sm font-medium', !tag ? 'border-accent bg-accent text-white' : 'border-border bg-surface hover:border-accent/50')}>
            All
          </button>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => pickTag(tag === t ? null : t)}
              aria-pressed={tag === t}
              className={cn('min-h-[36px] shrink-0 rounded-full border px-3 text-sm font-medium', tag === t ? 'border-accent bg-accent text-white' : 'border-border bg-surface hover:border-accent/50')}
            >
              #{t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={cn('mb-4 w-full break-inside-avoid', i % 3 ? 'h-56' : 'h-72')} />
          ))}
        </div>
      ) : list.length ? (
        <>
          <p className="mb-3 text-sm text-muted">
            {list.length} {list.length === 1 ? 'design' : 'designs'}
            {active ? (
              <button type="button" onClick={reset} className="ml-2 font-semibold text-accent-text hover:underline">
                Clear filters
              </button>
            ) : null}
          </p>
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
            {list.map((d) => (
              <DesignCard key={d.id} design={d} designer={d.designerId ? data.designers[d.designerId] : undefined} masonry />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          kind="search"
          title={favOnly && !favorites.length ? 'No favorites yet' : 'No designs found'}
          body={favOnly && !favorites.length ? 'Tap the heart on any design to keep it here.' : 'Nothing matches those filters. Try another word or tag, or ask a designer to make it for you.'}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={reset}>
                <X className="h-4 w-4" /> Reset filters
              </Button>
              <Button variant="secondary" onClick={() => router.push('/requests/new')}>
                Request a custom design
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}

export default function DesignsPage() {
  return (
    <React.Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><Skeleton className="h-96 w-full" /></div>}>
      <Library />
    </React.Suspense>
  );
}
