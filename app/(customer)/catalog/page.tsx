'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { METHOD_LABEL } from '@/lib/pricing';
import type { Category, PrintMethod } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, SheetContent } from '@/components/ui/dialog';
import { NativeSelect, Label } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { EmptyState, GridSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { ProductCard, productStats } from '@/components/customer/cards';
import { CATEGORY_LABEL, shipsToCustomer } from '@/components/customer/shopPricing';

type Sort = 'popular' | 'price' | 'fastest';
type Speed = 'any' | '2' | '4';
const METHODS: PrintMethod[] = ['DTF', 'DTG', 'screen', 'sublimation', 'embroidery', 'UV'];

interface Filters {
  category: Category | 'all';
  methods: PrintMethod[];
  price: [number, number] | null;
  speed: Speed;
  shipsToMe: boolean;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('inline-flex min-h-[40px] items-center rounded-full border px-3.5 text-sm font-medium transition-colors', active ? 'border-accent bg-accent text-white' : 'border-border bg-surface hover:border-accent/50')}
    >
      {children}
    </button>
  );
}

function Catalog() {
  const data = useStore();
  const customerId = data.personas.customer;
  const params = useSearchParams();
  const router = useRouter();
  const loading = useFakeLoading();
  const initialCat = (params.get('category') as Category | null) ?? 'all';
  const [f, setF] = React.useState<Filters>({ category: initialCat, methods: [], price: null, speed: 'any', shipsToMe: false });
  const [sort, setSort] = React.useState<Sort>('popular');
  const [sheet, setSheet] = React.useState(false);

  React.useEffect(() => {
    setF((x) => ({ ...x, category: (params.get('category') as Category | null) ?? 'all' }));
  }, [params]);

  const rows = React.useMemo(
    () =>
      Object.values(data.products).map((p) => ({ product: p, stats: productStats(data, p), ships: shipsToCustomer(data, p.id, customerId) })),
    [data, customerId],
  );
  const bounds = React.useMemo(() => {
    const prices = rows.map((r) => r.stats.from?.price).filter((x): x is number => typeof x === 'number');
    if (!prices.length) return [0, 1000] as [number, number];
    return [Math.floor(Math.min(...prices) / 50) * 50, Math.ceil(Math.max(...prices) / 50) * 50] as [number, number];
  }, [rows]);
  const price = f.price ?? bounds;

  const setCategory = (c: Category | 'all') => {
    setF((x) => ({ ...x, category: c }));
    router.replace(c === 'all' ? '/catalog' : `/catalog?category=${c}`, { scroll: false });
  };

  const filtered = rows
    .filter((r) => f.category === 'all' || r.product.category === f.category)
    .filter((r) => !f.methods.length || f.methods.some((m) => r.stats.methods.includes(m)))
    .filter((r) => !f.price || (r.stats.from && r.stats.from.price >= price[0] && r.stats.from.price <= price[1]))
    .filter((r) => f.speed === 'any' || (r.stats.days !== null && r.stats.days <= Number(f.speed)))
    .filter((r) => !f.shipsToMe || r.ships)
    .sort((a, b) => {
      if (sort === 'price') return (a.stats.from?.price ?? Infinity) - (b.stats.from?.price ?? Infinity);
      if (sort === 'fastest') return (a.stats.days ?? 99) - (b.stats.days ?? 99);
      return b.product.popularity - a.product.popularity;
    });

  const activeCount = (f.category !== 'all' ? 1 : 0) + f.methods.length + (f.price ? 1 : 0) + (f.speed !== 'any' ? 1 : 0) + (f.shipsToMe ? 1 : 0);
  const reset = () => {
    setF({ category: 'all', methods: [], price: null, speed: 'any', shipsToMe: false });
    router.replace('/catalog', { scroll: false });
  };

  const categories = [...new Set(Object.values(data.products).map((p) => p.category))];

  const panel = (
    <div className="space-y-6">
      <div>
        <Label>Category</Label>
        <div className="flex flex-wrap gap-2">
          <Chip active={f.category === 'all'} onClick={() => setCategory('all')}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={f.category === c} onClick={() => setCategory(c)}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <Label>Print method</Label>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <Chip key={m} active={f.methods.includes(m)} onClick={() => setF((x) => ({ ...x, methods: x.methods.includes(m) ? x.methods.filter((y) => y !== m) : [...x.methods, m] }))}>
              {METHOD_LABEL[m]}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <Label>Price per piece (from)</Label>
        <Slider
          label="Price range"
          min={bounds[0]}
          max={bounds[1]}
          step={10}
          value={price}
          onValueChange={(v) => setF((x) => ({ ...x, price: [v[0], v[1]] as [number, number] }))}
          className="mt-3"
        />
        <div className="mt-2 flex justify-between text-sm text-muted">
          <MoneyText value={price[0]} />
          <MoneyText value={price[1]} />
        </div>
      </div>
      <div>
        <Label htmlFor="speed">Delivery speed</Label>
        <NativeSelect id="speed" value={f.speed} onChange={(e) => setF((x) => ({ ...x, speed: e.target.value as Speed }))}>
          <option value="any">Any speed</option>
          <option value="2">Printed in 2 days or less</option>
          <option value="4">Printed in 4 days or less</option>
        </NativeSelect>
      </div>
      <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-input border border-border bg-surface px-3">
        <span className="text-sm font-medium">Ships to my area</span>
        <Switch checked={f.shipsToMe} onCheckedChange={(v) => setF((x) => ({ ...x, shipsToMe: v }))} aria-label="Ships to my area" />
      </label>
      {activeCount ? (
        <Button variant="ghost" onClick={reset} className="w-full">
          <X className="h-4 w-4" /> Clear all filters
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <PageHeader
        title={f.category === 'all' ? 'All products' : CATEGORY_LABEL[f.category]}
        subtitle="Prices shown are the lowest for a light color, size M, one medium front print. Your exact price updates live as you design."
      />
      <div className="mb-4 flex items-center gap-2">
        <Button variant="secondary" className="lg:hidden" onClick={() => setSheet(true)}>
          <SlidersHorizontal className="h-4 w-4" /> Filters{activeCount ? ` (${activeCount})` : ''}
        </Button>
        <span className="text-sm text-muted">
          {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="sort" className="hidden text-sm text-muted sm:block">
            Sort
          </label>
          <NativeSelect id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-40">
            <option value="popular">Popular</option>
            <option value="price">Lowest price</option>
            <option value="fastest">Fastest</option>
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-card border border-border bg-surface p-4 shadow-s1">{panel}</div>
        </aside>
        <div>
          {loading ? (
            <GridSkeleton items={9} className="lg:grid-cols-3" />
          ) : filtered.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {filtered.map((r) => (
                <ProductCard key={r.product.id} product={r.product} data={data} />
              ))}
            </div>
          ) : (
            <EmptyState
              kind="search"
              title="No products match"
              body="Try fewer filters. Shops add new products every week."
              action={
                <Button onClick={reset}>
                  <X className="h-4 w-4" /> Reset filters
                </Button>
              }
            />
          )}
        </div>
      </div>

      <Dialog open={sheet} onOpenChange={setSheet}>
        <SheetContent title="Filters" footer={<Button className="w-full" onClick={() => setSheet(false)}>Show {filtered.length} {filtered.length === 1 ? 'product' : 'products'}</Button>}>
          {panel}
        </SheetContent>
      </Dialog>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <React.Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><GridSkeleton /></div>}>
      <Catalog />
    </React.Suspense>
  );
}
