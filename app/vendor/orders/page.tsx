'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Check, Columns3, Link2, Printer, Rows3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/components/ui/cn';
import { DataTable, type ColumnDef, type RowSelectionState } from '@/components/shared/DataTable';
import { EmptyState, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { useVendor } from '@/components/vendor/useVendor';
import { ORDER_TABS, type OrderTab } from '@/components/vendor/helpers';
import { orderInfo } from '@/components/vendor/orderInfo';
import { OrderKanban } from '@/components/vendor/OrderKanban';
import { RejectDialog } from '@/components/vendor/RejectDialog';
import { subOrdersForVendor } from '@/lib/selectors';
import { NEXT_ORDER_STATUS, ORDER_STATUS_LABEL } from '@/lib/stateMachines';
import { relativeDay } from '@/lib/dates';
import type { SubOrder } from '@/lib/types';

export default function OrdersPage() {
  return (
    <React.Suspense fallback={<ListSkeleton rows={6} />}>
      <OrdersInner />
    </React.Suspense>
  );
}

function OrdersInner() {
  const loading = useFakeLoading();
  const router = useRouter();
  const params = useSearchParams();
  const { data, vendorId, vendor } = useVendor();
  const [view, setView] = React.useState<'table' | 'kanban'>('table');
  const [selection, setSelection] = React.useState<RowSelectionState>({});
  const [rejecting, setRejecting] = React.useState<SubOrder | null>(null);

  const tabParam = params.get('tab') as OrderTab | null;
  const tab: OrderTab = ORDER_TABS.some((t) => t.key === tabParam) ? (tabParam as OrderTab) : 'new';
  const tabDef = ORDER_TABS.find((t) => t.key === tab)!;

  const all = React.useMemo(() => subOrdersForVendor(data, vendorId), [data, vendorId]);
  const rows = React.useMemo(() => all.filter((s) => tabDef.statuses.includes(s.status)), [all, tabDef]);
  const counts = React.useMemo(() => Object.fromEntries(ORDER_TABS.map((t) => [t.key, all.filter((s) => t.statuses.includes(s.status)).length])), [all]);

  React.useEffect(() => setSelection({}), [tab]);

  const advance = React.useCallback(
    (s: SubOrder) => {
      const r = data.advanceSubOrder(s.id);
      if (r.ok) toast.success(`${data.orders[s.orderId]?.number}: ${r.message ?? 'updated'}. The customer has been notified.`);
      else toast.error(r.reasons.join('. '));
    },
    [data],
  );

  const columns = React.useMemo<ColumnDef<SubOrder, unknown>[]>(
    () => [
      {
        id: 'number',
        header: 'Order',
        accessorFn: (s) => data.orders[s.orderId]?.number ?? '',
        cell: ({ row }) => (
          <Link href={`/vendor/orders/${row.original.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
            {data.orders[row.original.orderId]?.number}
          </Link>
        ),
      },
      { id: 'city', header: 'Customer city', accessorFn: (s) => data.orders[s.orderId]?.address.city ?? '' },
      { id: 'items', header: 'Items', enableSorting: false, cell: ({ row }) => <span className="block max-w-[200px] truncate">{orderInfo(data, row.original).items}</span> },
      { id: 'method', header: 'Method', enableSorting: false, cell: ({ row }) => orderInfo(data, row.original).methods },
      {
        id: 'due',
        header: 'Due',
        accessorFn: (s) => orderInfo(data, s).due,
        cell: ({ row }) => {
          const i = orderInfo(data, row.original);
          return <span className={cn('whitespace-nowrap', (i.late || i.dueSoon) && 'font-semibold text-danger')}>{i.late ? `Late, ${relativeDay(i.due)}` : relativeDay(i.due)}</span>;
        },
      },
      { id: 'total', header: 'Total', accessorFn: (s) => s.total, cell: ({ row }) => <MoneyText value={row.original.total} /> },
      { id: 'payout', header: 'Your payout', accessorFn: (s) => s.split.vendor, cell: ({ row }) => <MoneyText value={row.original.split.vendor} className="font-semibold" /> },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (s) => s.status,
        cell: ({ row }) => <StatusPill status={orderInfo(data, row.original).late ? 'delayed' : row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const s = row.original;
          const next = NEXT_ORDER_STATUS[s.status];
          return (
            <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              {s.status === 'placed' ? (
                <>
                  <Button size="sm" onClick={() => advance(s)}>
                    <Check className="h-4 w-4" /> Accept
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setRejecting(s)}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </>
              ) : next && next !== 'completed' && tab !== 'issues' ? (
                <Button size="sm" variant="soft" onClick={() => advance(s)}>
                  {ORDER_STATUS_LABEL[next]} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : tab === 'issues' ? (
                <Button size="sm" variant="secondary" asChild>
                  <Link href="/vendor/issues">Resolve</Link>
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [data, advance, tab],
  );

  if (loading || !vendor) return <ListSkeleton rows={6} />;

  const selected = rows.filter((r) => selection[r.id]);
  const setTab = (t: string) => router.replace(`/vendor/orders?tab=${t}`, { scroll: false });

  const acceptSelected = () => {
    const targets = selected.filter((s) => s.status === 'placed');
    if (!targets.length) return toast.error('None of the selected orders are new');
    targets.forEach((s) => data.advanceSubOrder(s.id));
    toast.success(`Accepted ${targets.length} ${targets.length === 1 ? 'order' : 'orders'}`);
    setSelection({});
  };
  const advanceSelected = () => {
    let ok = 0;
    const fails: string[] = [];
    const id = toast.loading(`Updating ${selected.length} orders...`);
    selected.forEach((s) => {
      const next = NEXT_ORDER_STATUS[s.status];
      if (!next || next === 'completed') return fails.push(data.orders[s.orderId]?.number ?? s.id);
      const r = data.advanceSubOrder(s.id);
      if (r.ok) ok++;
      else fails.push(data.orders[s.orderId]?.number ?? s.id);
    });
    toast.dismiss(id);
    if (ok) toast.success(`Moved ${ok} ${ok === 1 ? 'order' : 'orders'} to the next step`);
    if (fails.length) toast.error(`Couldn't move ${fails.join(', ')}`);
    setSelection({});
  };
  const copyLink = async () => {
    const url = `${window.location.origin}/shop/${vendorId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Shop link copied. Share it on Facebook or WhatsApp.');
    } catch {
      toast(`Your shop link: ${url}`);
    }
  };

  const empty =
    tab === 'new' ? (
      <EmptyState
        kind="inbox"
        body="No new orders. Share your shop link to get the first one."
        action={
          <Button onClick={copyLink}>
            <Link2 className="h-4 w-4" /> Copy shop link
          </Button>
        }
      />
    ) : (
      <EmptyState kind="inbox" body={`Nothing in ${tabDef.label.toLowerCase()} right now.`} action={<Button variant="secondary" onClick={() => setTab('new')}>See new orders</Button>} />
    );

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Accept, print and ship. Every step updates the customer."
        actions={
          <div className="flex rounded-input bg-surface-2 p-1" role="group" aria-label="View">
            <Button size="sm" variant={view === 'table' ? 'secondary' : 'ghost'} onClick={() => setView('table')} aria-pressed={view === 'table'}>
              <Rows3 className="h-4 w-4" /> Table
            </Button>
            <Button size="sm" variant={view === 'kanban' ? 'secondary' : 'ghost'} onClick={() => setView('kanban')} aria-pressed={view === 'kanban'}>
              <Columns3 className="h-4 w-4" /> Board
            </Button>
          </div>
        }
      />

      {view === 'kanban' ? (
        all.length ? <OrderKanban data={data} subs={all} onAdvance={advance} /> : empty
      ) : (
        <>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              {ORDER_TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                  {counts[t.key] ? <span className="rounded-full bg-accent-soft px-1.5 text-xs tabular-nums text-accent-text">{counts[t.key]}</span> : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {selected.length ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-card border border-accent/40 bg-accent-soft/60 p-2.5">
              <span className="px-1 text-sm font-semibold">{selected.length} selected</span>
              {tab === 'new' ? (
                <Button size="sm" onClick={acceptSelected}>
                  <Check className="h-4 w-4" /> Accept selected
                </Button>
              ) : null}
              {tab !== 'completed' && tab !== 'issues' ? (
                <Button size="sm" variant="secondary" onClick={advanceSelected}>
                  <ArrowRight className="h-4 w-4" /> Move to next status
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={() => toast.success(`${selected.length} packing ${selected.length === 1 ? 'slip' : 'slips'} sent to your printer`)}>
                <Printer className="h-4 w-4" /> Print packing slips
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelection({})}>
                Clear
              </Button>
            </div>
          ) : null}
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(s) => s.id}
            selectable
            selection={selection}
            onSelectionChange={setSelection}
            onRowClick={(s) => router.push(`/vendor/orders/${s.id}`)}
            rowClassName={(s) => (orderInfo(data, s).late ? 'bg-danger/5' : undefined)}
            empty={empty}
            renderCard={(s) => {
              const i = orderInfo(data, s);
              return (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{i.number}</div>
                      <div className="text-xs text-muted">
                        {i.city}, {i.methods}
                      </div>
                    </div>
                    <StatusPill status={i.late ? 'delayed' : s.status} />
                  </div>
                  <p className="truncate text-sm">{i.items}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn((i.late || i.dueSoon) && 'font-semibold text-danger')}>Due {relativeDay(i.due)}</span>
                    <span>
                      Payout <MoneyText value={s.split.vendor} className="font-semibold" />
                    </span>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {s.status === 'placed' ? (
                      <>
                        <Button className="flex-1" onClick={() => advance(s)}>
                          Accept
                        </Button>
                        <Button className="flex-1" variant="secondary" onClick={() => setRejecting(s)}>
                          Reject
                        </Button>
                      </>
                    ) : NEXT_ORDER_STATUS[s.status] && NEXT_ORDER_STATUS[s.status] !== 'completed' && tab !== 'issues' ? (
                      <Button className="flex-1" variant="soft" onClick={() => advance(s)}>
                        Move to {ORDER_STATUS_LABEL[NEXT_ORDER_STATUS[s.status]!].toLowerCase()}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            }}
          />
        </>
      )}

      <RejectDialog subId={rejecting?.id ?? null} orderNumber={rejecting ? data.orders[rejecting.orderId]?.number : undefined} open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)} />
    </div>
  );
}
