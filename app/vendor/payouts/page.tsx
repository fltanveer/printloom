'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Clock, Wallet, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, NativeSelect, Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState, KpiCard, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { useVendor } from '@/components/vendor/useVendor';
import { NumInput } from '@/components/vendor/fields';
import { vendorFinance } from '@/lib/selectors';
import { formatDate } from '@/lib/dates';
import type { PayoutRecord } from '@/lib/types';

const METHODS = ['bKash', 'Nagad', 'Bank'];

export default function PayoutsPage() {
  const loading = useFakeLoading();
  const { data, vendorId, vendor } = useVendor();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState<number | undefined>(undefined);
  const [method, setMethod] = React.useState('bKash');
  const [account, setAccount] = React.useState('');

  const fin = React.useMemo(() => vendorFinance(data, vendorId), [data, vendorId]);
  const history = React.useMemo(() => data.payouts.filter((p) => p.ownerId === vendorId), [data.payouts, vendorId]);
  const inFlight = React.useMemo(() => Object.values(data.subOrders).filter((s) => s.vendorId === vendorId && ['placed', 'accepted', 'in_production', 'quality_check', 'shipped', 'delivered', 'reprint'].includes(s.status)).length, [data.subOrders, vendorId]);

  const columns = React.useMemo<ColumnDef<PayoutRecord, unknown>[]>(
    () => [
      { id: 'at', header: 'Date', accessorFn: (p) => p.at, cell: ({ row }) => formatDate(row.original.at, { day: 'numeric', month: 'short', year: 'numeric' }) },
      { id: 'amount', header: 'Amount', accessorFn: (p) => p.amount, cell: ({ row }) => <MoneyText value={row.original.amount} className="font-semibold" /> },
      { id: 'method', header: 'Sent to', accessorFn: (p) => p.method },
      { id: 'status', header: 'Status', accessorFn: (p) => p.status, cell: ({ row }) => <StatusPill status={row.original.status} /> },
    ],
    [],
  );

  if (loading || !vendor) return <ListSkeleton rows={4} />;

  const openDialog = () => {
    const pm = vendor.payoutMethod ?? '';
    const m = METHODS.find((x) => pm.toLowerCase().startsWith(x.toLowerCase())) ?? 'bKash';
    setMethod(m);
    setAccount(pm.replace(/^(bkash|nagad|bank:?)\s*/i, ''));
    setAmount(Math.floor(fin.available));
    setOpen(true);
  };
  const valid = amount !== undefined && amount >= 100 && amount <= fin.available && account.trim().length >= 4;
  const submit = () => {
    if (!valid || amount === undefined) return;
    data.requestPayout(vendorId, amount, `${method} ${account.trim()}`);
    setOpen(false);
    toast.success('Payout requested. It usually lands within 1 working day.');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payouts"
        subtitle="Money from completed orders, after Printloom commission."
        actions={
          <Button onClick={openDialog} disabled={fin.available < 100}>
            <Wallet className="h-4 w-4" /> Request payout
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Available to withdraw" value={<MoneyText value={fin.available} />} icon={<Wallet className="h-4 w-4" />} />
        <KpiCard label="Pending, orders in progress" value={<MoneyText value={fin.pending} />} delta={{ text: `${inFlight} ${inFlight === 1 ? 'order' : 'orders'} in flight`, good: true }} icon={<Clock className="h-4 w-4" />} />
        <KpiCard label="Refunded to customers" value={<MoneyText value={fin.refunded} />} icon={<Undo2 className="h-4 w-4" />} />
      </div>
      <p className="text-sm text-muted">
        Pending money becomes available when an order is completed. That happens when the customer reviews it or 3 days after delivery.{' '}
        <Link href="/vendor/orders?tab=shipped" className="font-medium text-accent-text hover:underline">
          See shipped orders
        </Link>
      </p>
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">History</h2>
        <DataTable data={history} columns={columns} getRowId={(p) => p.id} empty={<EmptyState kind="inbox" body="No payouts yet. Your first one shows up here." />} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Request payout" description="We send it to your bKash, Nagad or bank account.">
          <div className="space-y-3">
            <Field label="Amount" hint="Minimum ৳100." error={amount !== undefined && amount > fin.available ? 'More than your available balance' : amount !== undefined && amount < 100 ? 'Minimum ৳100' : null}>
              <NumInput value={amount} allowEmpty min={100} max={fin.available} prefix="৳" onChange={setAmount} aria-label="Payout amount" />
            </Field>
            <p className="text-sm text-muted">
              Available <MoneyText value={fin.available} />
            </p>
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <Field label="Method">
                <NativeSelect value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={method === 'Bank' ? 'Bank and account' : 'Wallet number'}>
                <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder={method === 'Bank' ? 'City Bank ****2231' : '01711-000111'} />
              </Field>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!valid}>
              Request payout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
