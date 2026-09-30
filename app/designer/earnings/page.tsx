'use client';
import * as React from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { Banknote, Clock, Lock, Wallet } from 'lucide-react';
import { useStore } from '@/lib/store';
import { designerEarnings, type DesignerEarnings } from '@/lib/selectors';
import { formatDate } from '@/lib/dates';
import type { PayoutRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Input, NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/misc';
import { DataTable } from '@/components/shared/DataTable';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState, KpiCard, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { useActiveDesigner } from '@/components/designer/bits';

type Entry = DesignerEarnings['entries'][number];

const entryCols: ColumnDef<Entry, unknown>[] = [
  { header: 'Date', accessorKey: 'at', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.at, { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
  { header: 'What', accessorKey: 'label' },
  { header: 'Type', accessorKey: 'kind', cell: ({ row }) => (row.original.kind === 'royalty' ? 'Royalty' : 'Commission') },
  {
    header: 'State',
    accessorKey: 'state',
    cell: ({ row }) => {
      const s = row.original.state;
      return <StatusPill status={s === 'available' ? 'paid' : s === 'voided' ? 'cancelled_by_customer' : s === 'escrow' ? 'in_progress' : 'pending'} label={s === 'available' ? 'Available' : s === 'voided' ? 'Voided' : s === 'escrow' ? 'In escrow' : 'Pending'} />;
    },
  },
  { header: 'Amount', accessorKey: 'amount', cell: ({ row }) => <MoneyText value={row.original.amount} decimals={row.original.amount % 1 !== 0} className={row.original.state === 'voided' ? 'text-muted line-through' : 'font-semibold'} /> },
];

const payoutCols: ColumnDef<PayoutRecord, unknown>[] = [
  { header: 'Date', accessorKey: 'at', cell: ({ row }) => formatDate(row.original.at, { day: 'numeric', month: 'short', year: 'numeric' }) },
  { header: 'Method', accessorKey: 'method' },
  { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusPill status={row.original.status} /> },
  { header: 'Amount', accessorKey: 'amount', cell: ({ row }) => <MoneyText value={row.original.amount} className="font-semibold" /> },
];

export default function DesignerEarningsPage() {
  const loading = useFakeLoading();
  const state = useStore();
  const { id, designer } = useActiveDesigner();
  const money = useMoney();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [method, setMethod] = React.useState('bKash');
  const [error, setError] = React.useState<string | null>(null);

  const e = React.useMemo(() => designerEarnings(state, id), [state, id]);
  const payouts = React.useMemo(() => state.payouts.filter((p) => p.ownerId === id), [state.payouts, id]);

  if (!designer) return <EmptyState body="Pick a designer persona in the Demo Bar to see earnings." />;

  const royaltiesTotal = e.royaltiesPending + e.royaltiesAvailable;
  const commissionsTotal = e.commissionsEscrow + e.commissionsEarned;

  const submit = () => {
    const n = Math.floor(Number(amount));
    if (!Number.isFinite(n) || n <= 0) return setError('Enter an amount above zero.');
    if (n < 500) return setError(`The minimum payout is ${money(500)}.`);
    if (n > e.balance) return setError(`You can withdraw up to ${money(e.balance)}.`);
    state.requestPayout(id, n, method);
    toast.success(`Payout of ${money(n)} requested to ${method}. It usually arrives within 2 working days.`);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Earnings"
        subtitle="Royalties come from each printed order. Commissions come from finished custom requests, minus the platform fee."
        actions={
          <Button
            onClick={() => {
              setAmount(String(Math.floor(e.balance)));
              setError(null);
              setOpen(true);
            }}
            disabled={e.balance < 1}
          >
            <Banknote className="h-4 w-4" /> Request payout
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Available to withdraw" value={<MoneyText value={e.balance} />} icon={<Wallet className="h-4 w-4" />} spark={e.byMonth.map((m) => m.royalties + m.commissions)} />
          <KpiCard label="Pending royalties" value={<MoneyText value={e.royaltiesPending} decimals={e.royaltiesPending % 1 !== 0} />} icon={<Clock className="h-4 w-4" />} delta={{ text: 'Available once delivered', good: true }} />
          <KpiCard label="In escrow" value={<MoneyText value={e.commissionsEscrow} />} icon={<Lock className="h-4 w-4" />} delta={{ text: 'Released when the customer approves', good: true }} />
          <KpiCard label="Paid out" value={<MoneyText value={e.paidOut} />} icon={<Banknote className="h-4 w-4" />} delta={{ text: `${payouts.length} payouts`, good: true }} />
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Royalties</h2>
            <MoneyText value={royaltiesTotal} className="font-display text-lg font-bold" decimals={royaltiesTotal % 1 !== 0} />
          </div>
          <SplitRow label="Pending (order in progress)" value={e.royaltiesPending} />
          <SplitRow label="Available (delivered)" value={e.royaltiesAvailable} />
          <SplitRow label="Voided (cancelled or refunded)" value={e.royaltiesVoided} muted />
          <p className="mt-2 text-xs text-muted">Same amounts as the designer share in each order&apos;s split.</p>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Commissions</h2>
            <MoneyText value={commissionsTotal} className="font-display text-lg font-bold" />
          </div>
          <SplitRow label="In escrow (work in progress)" value={e.commissionsEscrow} />
          <SplitRow label="Earned (approved)" value={e.commissionsEarned} />
          <p className="mt-2 text-xs text-muted">After the {state.settings.requestFeePct}% platform fee.</p>
        </Card>
      </div>

      <h2 className="mb-3 mt-6 font-display text-lg font-semibold">All entries</h2>
      {loading ? (
        <ListSkeleton />
      ) : (
        <DataTable data={e.entries} columns={entryCols} getRowId={(r) => `${r.at}-${r.label}-${r.amount}`} empty={<EmptyState kind="spark" body="No earnings yet. Publish designs and send proposals to get started." />} />
      )}

      <h2 className="mb-3 mt-6 font-display text-lg font-semibold">Payout history</h2>
      {loading ? (
        <ListSkeleton rows={2} />
      ) : (
        <DataTable data={payouts} columns={payoutCols} getRowId={(r) => r.id} empty={<EmptyState kind="box" body="No payouts yet. Request one when you have a balance." />} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Request payout" description={`Available: ${money(e.balance)}`}>
          <div className="space-y-4">
            <Field label="Amount (৳)" htmlFor="po-amount" error={error}>
              <Input id="po-amount" type="number" min={500} max={Math.floor(e.balance)} value={amount} onChange={(ev) => setAmount(ev.target.value)} />
            </Field>
            <Field label="Send to" htmlFor="po-method">
              <NativeSelect id="po-method" value={method} onChange={(ev) => setMethod(ev.target.value)}>
                <option>bKash</option>
                <option>Nagad</option>
                <option>Bank</option>
              </NativeSelect>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit}>Request payout</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SplitRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-border py-2 text-sm first-of-type:border-t-0">
      <span className={muted ? 'text-muted' : ''}>{label}</span>
      <MoneyText value={value} decimals={value % 1 !== 0} className={muted ? 'text-muted' : 'font-semibold'} />
    </div>
  );
}
