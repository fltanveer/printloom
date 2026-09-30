'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { FastForward, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ORDER_STATUS_LABEL, NEXT_ORDER_STATUS } from '@/lib/stateMachines';
import { isLate } from '@/lib/selectors';
import { formatDateTime, relativeDay } from '@/lib/dates';
import type { OrderStatus, SubOrder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, SheetContent } from '@/components/ui/dialog';
import { Input, NativeSelect } from '@/components/ui/input';
import { DataTable } from '@/components/shared/DataTable';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { PriceBreakdown } from '@/components/shared/PriceBreakdown';
import { EmptyState, ListSkeleton, PageHeader, Timeline, useFakeLoading } from '@/components/shared/bits';

interface Row {
  sub: SubOrder;
  number: string;
  customer: string;
  vendor: string;
  qty: number;
  late: boolean;
}

export default function AdminOrdersPage() {
  const loading = useFakeLoading();
  const state = useStore();
  const [status, setStatus] = React.useState<'all' | OrderStatus>('all');
  const [vendor, setVendor] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [openId, setOpenId] = React.useState<string | null>(null);

  const rows = React.useMemo<Row[]>(() => {
    return Object.values(state.subOrders)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((sub) => ({
        sub,
        number: state.orders[sub.orderId]?.number ?? sub.orderId,
        customer: state.customers[sub.customerId]?.name ?? sub.customerId,
        vendor: state.vendors[sub.vendorId]?.shopName ?? sub.vendorId,
        qty: sub.lines.reduce((s, l) => s + l.quote.qty, 0),
        late: isLate(sub),
      }));
  }, [state.subOrders, state.orders, state.customers, state.vendors]);

  const filtered = rows.filter((r) => (status === 'all' || r.sub.status === status) && (vendor === 'all' || r.sub.vendorId === vendor) && (!q.trim() || r.number.toLowerCase().includes(q.trim().toLowerCase())));
  const statuses = [...new Set(rows.map((r) => r.sub.status))];

  const columns: ColumnDef<Row, unknown>[] = [
    { header: 'Order', accessorKey: 'number', cell: ({ row }) => <span className="font-semibold tabular-nums">{row.original.number}</span> },
    { header: 'Placed', id: 'placed', accessorFn: (r) => r.sub.createdAt, cell: ({ row }) => <span className="whitespace-nowrap">{relativeDay(row.original.sub.createdAt)}</span> },
    { header: 'Customer', accessorKey: 'customer' },
    { header: 'Shop', accessorKey: 'vendor' },
    {
      header: 'Status',
      id: 'status',
      accessorFn: (r) => r.sub.status,
      cell: ({ row }) => (
        <span className="flex flex-wrap gap-1">
          <StatusPill status={row.original.sub.status} />
          {row.original.late ? <StatusPill status="delayed" /> : null}
        </span>
      ),
    },
    { header: 'Items', accessorKey: 'qty', cell: ({ row }) => <span className="tabular-nums">{row.original.qty}</span> },
    { header: 'Total', id: 'total', accessorFn: (r) => r.sub.total, cell: ({ row }) => <MoneyText value={row.original.sub.total} className="font-semibold" /> },
    { header: 'Printloom', id: 'platform', accessorFn: (r) => r.sub.split.platform, cell: ({ row }) => <MoneyText value={row.original.sub.split.platform} decimals /> },
  ];

  const open = openId ? state.subOrders[openId] : null;
  const next = open ? NEXT_ORDER_STATUS[open.status] : undefined;
  const canAdvance = !!next && (next === 'delivered' || next === 'completed');

  return (
    <div>
      <PageHeader title="All orders" subtitle="Every shop order on the platform, with the full money split." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by order number" aria-label="Search by order number" className="pl-9" />
        </div>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as 'all' | OrderStatus)} aria-label="Filter by status" className="sm:w-48">
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={vendor} onChange={(e) => setVendor(e.target.value)} aria-label="Filter by shop" className="sm:w-48">
          <option value="all">All shops</option>
          {Object.values(state.vendors).map((v) => (
            <option key={v.id} value={v.id}>
              {v.shopName}
            </option>
          ))}
        </NativeSelect>
      </div>

      {loading ? (
        <ListSkeleton rows={6} />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r) => r.sub.id}
          onRowClick={(r) => setOpenId(r.sub.id)}
          empty={
            <EmptyState
              kind="search"
              body={rows.length ? 'No orders match these filters.' : 'No orders yet.'}
              action={
                rows.length ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQ('');
                      setStatus('all');
                      setVendor('all');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open ? (
          <SheetContent
            title={`Order ${state.orders[open.orderId]?.number ?? ''}`}
            description={`${state.vendors[open.vendorId]?.shopName} for ${state.customers[open.customerId]?.name}`}
            footer={
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button variant="secondary" asChild>
                  <Link href={`/orders/${open.orderId}`}>Customer view</Link>
                </Button>
                {canAdvance && next ? (
                  <Button
                    onClick={() => {
                      const r = state.advanceSubOrder(open.id, 'system');
                      if (r.ok) toast.success(`Moved to ${ORDER_STATUS_LABEL[next].toLowerCase()} (demo).`);
                      else toast.error(r.reasons.join(' '));
                    }}
                  >
                    <FastForward className="h-4 w-4" /> Mark {ORDER_STATUS_LABEL[next].toLowerCase()} (demo)
                  </Button>
                ) : null}
              </div>
            }
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <StatusPill status={open.status} />
                <span className="text-muted">Placed {formatDateTime(open.createdAt)}</span>
                <span className="text-muted">Est. delivery {relativeDay(open.estDelivery)}</span>
              </div>
              {open.lines.length ? (
                <PriceBreakdown quote={open.lines.map((l) => l.quote)} shipping={open.shipping} split={open.split} showSplit defaultOpen collapsible={false} title="Price and split" />
              ) : (
                <EmptyState body="No lines on this order." />
              )}
              {open.refundAmount ? (
                <p className="rounded-input bg-surface-2 p-3 text-sm">
                  Refunded <MoneyText value={open.refundAmount} className="font-semibold" />
                </p>
              ) : null}
              <div>
                <h3 className="mb-2 font-semibold">Timeline</h3>
                <Timeline events={open.timeline} />
              </div>
            </div>
          </SheetContent>
        ) : null}
      </Dialog>
    </div>
  );
}
