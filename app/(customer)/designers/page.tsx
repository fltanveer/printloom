'use client';
import * as React from 'react';
import Link from 'next/link';
import { Search, X, Palette } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input, NativeSelect } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { EmptyState, GridSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { DesignerCard } from '@/components/customer/cards';

type Sort = 'rating' | 'price' | 'fastest';

export default function DesignersPage() {
  const designers = useStore((s) => s.designers);
  const loading = useFakeLoading();
  const [q, setQ] = React.useState('');
  const [openOnly, setOpenOnly] = React.useState(false);
  const [sort, setSort] = React.useState<Sort>('rating');

  const needle = q.trim().toLowerCase();
  const list = Object.values(designers)
    .filter((d) => d.onboarded)
    .filter((d) => !openOnly || d.acceptsRequests)
    .filter((d) => !needle || [d.name, d.bio, ...d.tags].some((s) => s.toLowerCase().includes(needle)))
    .sort((a, b) => (sort === 'price' ? a.startingPrice - b.startingPrice : sort === 'fastest' ? a.turnaroundDays - b.turnaroundDays : b.rating - a.rating));

  const reset = () => {
    setQ('');
    setOpenOnly(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Designers"
        subtitle="Local artists who make one of a kind designs for your tees, teams and brands."
        actions={
          <Button asChild variant="secondary">
            <Link href="/requests/new">
              <Palette className="h-4 w-4 text-designer" /> Post a request to everyone
            </Link>
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or style, like vintage or cute" className="pl-9" aria-label="Search designers" />
        </div>
        <label className="flex min-h-[44px] items-center gap-2 rounded-input border border-border bg-surface px-3 text-sm font-medium">
          <Switch checked={openOnly} onCheckedChange={setOpenOnly} aria-label="Open for requests only" /> Open for requests
        </label>
        <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort designers" className="sm:w-44">
          <option value="rating">Top rated</option>
          <option value="price">Lowest starting price</option>
          <option value="fastest">Fastest turnaround</option>
        </NativeSelect>
      </div>
      {loading ? (
        <GridSkeleton items={6} className="lg:grid-cols-3" />
      ) : list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => (
            <DesignerCard key={d.id} designer={d} />
          ))}
        </div>
      ) : (
        <EmptyState
          kind="search"
          title="No designers found"
          body="Try another style, or post your idea and let designers come to you."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={reset}>
                <X className="h-4 w-4" /> Reset filters
              </Button>
              <Button asChild variant="secondary">
                <Link href="/requests/new">Post a request</Link>
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
