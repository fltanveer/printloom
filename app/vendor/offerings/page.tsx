'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Calculator, Copy, Pencil, Plus, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tip } from '@/components/ui/tooltip';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Ago, ColorDots, EmptyState, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { useVendor } from '@/components/vendor/useVendor';
import { lowStock, sizesRange, startingPrice } from '@/components/vendor/helpers';
import { METHOD_LABEL } from '@/lib/pricing';
import type { Offering } from '@/lib/types';

export default function OfferingsPage() {
  return (
    <React.Suspense fallback={<ListSkeleton rows={5} />}>
      <OfferingsInner />
    </React.Suspense>
  );
}

function OfferingsInner() {
  const loading = useFakeLoading();
  const router = useRouter();
  const params = useSearchParams();
  const { data, vendorId, vendor } = useVendor();
  const [addOpen, setAddOpen] = React.useState(false);

  React.useEffect(() => {
    if (params.get('add') === '1') setAddOpen(true);
  }, [params]);

  const offerings = React.useMemo(
    () => Object.values(data.offerings).filter((o) => o.vendorId === vendorId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.offerings, vendorId],
  );
  const prices = React.useMemo(() => Object.fromEntries(offerings.map((o) => [o.id, startingPrice(data, o)])), [data, offerings]);
  const available = React.useMemo(() => Object.values(data.products).filter((p) => !offerings.some((o) => o.productId === p.id)), [data.products, offerings]);

  const toggle = React.useCallback(
    (o: Offering, on: boolean) => {
      const r = data.setOfferingStatus(o.id, on ? 'active' : 'paused');
      if (r.ok) toast.success(on ? 'Live. Customers can order this now.' : 'Paused. Hidden from customers until you turn it back on.');
      else toast.error(`Can't go live yet: ${r.reasons.join('. ')}`);
    },
    [data],
  );

  const duplicate = React.useCallback(
    (o: Offering) => {
      const id = data.duplicateOffering(o.id);
      toast.success('Copied as a draft. Change the product details and go live when ready.');
      router.push(`/vendor/offerings/${id}`);
    },
    [data, router],
  );

  const columns = React.useMemo<ColumnDef<Offering, unknown>[]>(
    () => [
      {
        id: 'product',
        header: 'Product',
        accessorFn: (o) => data.products[o.productId]?.name ?? '',
        cell: ({ row }) => {
          const o = row.original;
          return (
            <div className="min-w-[160px]">
              <Link href={`/vendor/offerings/${o.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                {data.products[o.productId]?.name}
              </Link>
              <div className="mt-0.5">
                <StatusPill status={o.status} />
              </div>
            </div>
          );
        },
      },
      {
        id: 'blank',
        header: 'Blank',
        accessorFn: (o) => o.blank.brand,
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{row.original.blank.brand}</div>
            <div className="text-xs text-muted">
              {row.original.blank.fabric}
              {row.original.blank.gsm ? `, ${row.original.blank.gsm} GSM` : ''}
            </div>
          </div>
        ),
      },
      {
        id: 'methods',
        header: 'Methods',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.methods.map((m) => (
              <Badge key={m} tone="neutral">
                {METHOD_LABEL[m]}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: 'colors',
        header: 'Colors',
        accessorFn: (o) => o.colorGroups.reduce((t, g) => t + g.colors.length, 0),
        cell: ({ row }) => {
          const colors = row.original.colorGroups.flatMap((g) => g.colors);
          return (
            <div className="flex items-center gap-2">
              <ColorDots colors={colors} max={4} />
              <span className="text-xs text-muted tabular-nums">{colors.length}</span>
            </div>
          );
        },
      },
      {
        id: 'sizes',
        header: 'Sizes',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap text-sm">{sizesRange(row.original, data.products[row.original.productId])}</span>,
      },
      {
        id: 'price',
        header: 'Starting price',
        accessorFn: (o) => prices[o.id]?.unitAvg ?? 0,
        cell: ({ row }) => {
          const q = prices[row.original.id];
          return q ? (
            <Tip content={`One ${q.color} ${q.sizes[0]?.size ?? ''} with a medium front print, ${METHOD_LABEL[q.method]}`}>
              <span className="font-semibold">
                <MoneyText value={q.unitAvg} />
              </span>
            </Tip>
          ) : (
            <span className="text-xs text-muted">Not priced yet</span>
          );
        },
      },
      {
        id: 'status',
        header: 'Live',
        enableSorting: false,
        cell: ({ row }) => (
          <span onClick={(e) => e.stopPropagation()} className="inline-flex min-h-11 items-center">
            <Switch checked={row.original.status === 'active'} onCheckedChange={(v) => toggle(row.original, v)} aria-label={`Live: ${data.products[row.original.productId]?.name}`} />
          </span>
        ),
      },
      {
        id: 'stock',
        header: 'Stock',
        enableSorting: false,
        cell: ({ row }) => {
          const low = lowStock(row.original);
          if (!low.length) return <span className="text-xs text-muted">OK</span>;
          return (
            <Tip content={low.map((v) => `${v.color} / ${v.size}: ${v.stock}`).join(', ')}>
              <span className="inline-flex">
                <Badge tone={low.some((v) => v.stock === 0) ? 'danger' : 'warning'}>
                  <TriangleAlert className="h-3 w-3" /> {low.length} low
                </Badge>
              </span>
            </Tip>
          );
        },
      },
      {
        id: 'updated',
        header: 'Updated',
        accessorFn: (o) => o.updatedAt,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted">
            <Ago at={row.original.updatedAt} />, v{row.original.version}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Tip content="Edit">
              <Button variant="ghost" size="icon-sm" asChild aria-label="Edit">
                <Link href={`/vendor/offerings/${row.original.id}`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            </Tip>
            <Tip content="Duplicate">
              <Button variant="ghost" size="icon-sm" onClick={() => duplicate(row.original)} aria-label="Duplicate">
                <Copy className="h-4 w-4" />
              </Button>
            </Tip>
            <Tip content="Simulate price">
              <Button variant="ghost" size="icon-sm" asChild aria-label="Simulate price">
                <Link href={`/vendor/offerings/${row.original.id}?tab=pricing&sim=1`}>
                  <Calculator className="h-4 w-4" />
                </Link>
              </Button>
            </Tip>
          </div>
        ),
      },
    ],
    [data.products, prices, toggle, duplicate],
  );

  if (loading || !vendor) return <ListSkeleton rows={5} />;

  const create = (productId: string) => {
    const id = data.createOffering(vendorId, productId);
    setAddOpen(false);
    toast.success('Draft created. Set your colors, sizes and prices.');
    router.push(`/vendor/offerings/${id}`);
  };

  return (
    <div>
      <PageHeader
        title="Products and pricing"
        subtitle="Everything you sell, with the exact price customers see."
        actions={
          <Button onClick={() => setAddOpen(true)} disabled={!available.length}>
            <Plus className="h-4 w-4" /> Add product
          </Button>
        }
      />
      <DataTable
        data={offerings}
        columns={columns}
        getRowId={(o) => o.id}
        onRowClick={(o) => router.push(`/vendor/offerings/${o.id}`)}
        empty={
          <EmptyState
            kind="shirt"
            title="No products yet"
            body="Pick a blank, set your prices and start taking orders."
            action={
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add your first product
              </Button>
            }
          />
        }
        renderCard={(o) => {
          const q = prices[o.id];
          const low = lowStock(o);
          return (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold">{data.products[o.productId]?.name}</div>
                  <div className="text-xs text-muted">
                    {o.blank.brand}, {o.methods.map((m) => METHOD_LABEL[m]).join(', ')}
                  </div>
                </div>
                <span onClick={(e) => e.stopPropagation()} className="inline-flex min-h-11 items-center">
                  <Switch checked={o.status === 'active'} onCheckedChange={(v) => toggle(o, v)} aria-label="Live" />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <StatusPill status={o.status} />
                <ColorDots colors={o.colorGroups.flatMap((g) => g.colors)} max={5} />
                <span className="text-muted">{sizesRange(o, data.products[o.productId])}</span>
                {low.length ? <Badge tone="warning">{low.length} low stock</Badge> : null}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  From <strong>{q ? <MoneyText value={q.unitAvg} /> : 'not priced'}</strong>
                </span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => duplicate(o)} aria-label="Duplicate">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" asChild aria-label="Simulate price">
                    <Link href={`/vendor/offerings/${o.id}?tab=pricing&sim=1`}>
                      <Calculator className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        }}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add a product" description="Pick a base product you don't sell yet. We start you with sensible prices you can change.">
          {available.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {available.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => create(p.id)}
                  className="min-h-[64px] rounded-card border border-border bg-surface p-3 text-left transition-colors hover:border-accent hover:bg-accent-soft"
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted">
                    {p.sizes.length} sizes, {p.allowedMethods.map((m) => METHOD_LABEL[m]).join(', ')}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState kind="spark" body="You already sell every product in the catalog." className="border-0" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
