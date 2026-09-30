'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { publicDesigns } from '@/lib/selectors';
import { VIEW_LABEL } from '@/lib/mockups';
import type { Design } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmptyState, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { Skeleton } from '@/components/ui/misc';
import { MoneyText } from '@/components/shared/MoneyText';
import { designLayerFor, designUsable, useCustomizer } from './model';

export function LibraryTool() {
  const { state, product, customerId, addLayer, activeArea } = useCustomizer();
  const loading = useFakeLoading(350);
  const [q, setQ] = React.useState('');
  const [tab, setTab] = React.useState('library');

  const matches = (d: Design) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return d.title.toLowerCase().includes(s) || d.tags.some((t) => t.toLowerCase().includes(s)) || (state.designers[d.designerId ?? '']?.name.toLowerCase().includes(s) ?? false);
  };
  const library = publicDesigns(state)
    .filter((d) => d.compatibleCategories.includes(product.category))
    .filter(matches)
    .sort((a, b) => b.uses - a.uses);
  const mine = Object.values(state.designs)
    .filter((d) => (d.isPrivate || d.designerId === null) && d.ownerCustomerId === customerId && designUsable(d, customerId))
    .filter(matches);

  const add = (d: Design) => {
    if (!designUsable(d, customerId)) {
      toast.error('This design is not available anymore');
      return;
    }
    addLayer(designLayerFor(d, activeArea));
    toast.success(`${d.title} added to the ${VIEW_LABEL[activeArea.view].toLowerCase()}`, { description: d.isPrivate || !d.designerId ? 'Your own design, no royalty.' : `Includes a designer royalty on every piece.` });
  };

  const grid = (list: Design[], empty: React.ReactNode) =>
    loading ? (
      <div className="grid grid-cols-2 gap-2" aria-busy="true" aria-label="Loading designs">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    ) : list.length ? (
      <ul className="grid grid-cols-2 gap-2">
        {list.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => add(d)} className="group w-full overflow-hidden rounded-card border border-border bg-surface text-left transition-shadow hover:shadow-s2 focus-visible:ring-2 focus-visible:ring-accent" aria-label={`Add ${d.title}`}>
              <span className="checker relative block aspect-square overflow-hidden">
                <SafeImage src={d.files.src} alt={d.title} contain className="h-full w-full p-1.5" />
                <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-accent text-white opacity-0 shadow-s2 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Plus className="h-4 w-4" />
                </span>
              </span>
              <span className="block p-2">
                <span className="block truncate text-xs font-semibold" title={d.title}>
                  {d.title}
                </span>
                <span className="block truncate text-[11px] text-muted">
                  {d.isPrivate || !d.designerId ? (
                    'Yours, no royalty'
                  ) : (
                    <>
                      +<MoneyText value={d.royalty.amount} /> royalty · {state.designers[d.designerId]?.name}
                    </>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    ) : (
      empty
    );

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-base font-semibold">Designs</h3>
        <p className="text-xs text-muted">Made by local designers. A small royalty goes to them on every piece.</p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cute, cricket, retro..." className="pl-9" aria-label="Search designs" />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="library" className="flex-1">
            Library ({library.length})
          </TabsTrigger>
          <TabsTrigger value="mine" className="flex-1">
            My designs ({mine.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          {grid(
            library,
            <EmptyState
              kind="search"
              body={q ? `No designs match "${q}".` : 'No designs for this product yet.'}
              action={
                q ? (
                  <Button variant="soft" size="sm" onClick={() => setQ('')}>
                    Clear search
                  </Button>
                ) : (
                  <Button asChild variant="soft" size="sm">
                    <Link href={`/requests/new?product=${product.id}`}>Request a custom design</Link>
                  </Button>
                )
              }
              className="py-6"
            />,
          )}
        </TabsContent>
        <TabsContent value="mine">
          {grid(
            mine,
            <EmptyState
              kind="spark"
              body={q ? `None of your designs match "${q}".` : 'Designs made for you by a designer show up here.'}
              action={
                <Button asChild variant="soft" size="sm">
                  <Link href={`/requests/new?product=${product.id}`}>Request a custom design</Link>
                </Button>
              }
              className="py-6"
            />,
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
