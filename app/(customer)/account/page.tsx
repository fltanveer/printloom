'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, CheckCheck, CreditCard, Heart, Home, Lock, MapPin, Package, Palette, Plus, Shirt, Sparkles, Star, Trash2, Wallet } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatDate } from '@/lib/dates';
import { REQUEST_STATUS_LABEL } from '@/lib/stateMachines';
import type { Address, Design, Division, PaymentMethod } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Field, Input, NativeSelect } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tip } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/cn';
import { StatusPill } from '@/components/shared/StatusPill';
import { MoneyText } from '@/components/shared/MoneyText';
import { Ago, Avatar, EmptyState, ListSkeleton, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { ProductPickerDialog } from '@/components/customer/ProductPicker';
import { FavoriteButton } from '@/components/customer/cards';
import { DIVISIONS } from '@/components/customer/shopPricing';

const TABS = [
  { id: 'orders', label: 'My orders', icon: Package },
  { id: 'designs', label: 'My designs', icon: Palette },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'requests', label: 'My requests', icon: Sparkles },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'payments', label: 'Payment methods', icon: Wallet },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;
type TabId = (typeof TABS)[number]['id'];

function Account() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get('tab');
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : 'orders';
  const customerId = useStore((s) => s.personas.customer);
  const customer = useStore((s) => s.customers[customerId]);
  const unread = useStore((s) => s.notifications.filter((n) => n.personaId === customerId && !n.read).length);

  if (!customer) return <EmptyState body="Pick a customer persona from the Demo Bar to see an account." />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex items-center gap-4 rounded-sheet bg-gradient-to-br from-accent via-designer to-vendor p-5 text-white shadow-s3 sm:p-6">
        <Avatar name={customer.name} src={customer.avatar} size={64} className="border-2 border-white/60 bg-white/20" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{customer.name}</h1>
          <p className="truncate text-sm text-white/80">{customer.email}</p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={(v) => router.replace(`/account?tab=${v}`, { scroll: false })}>
        <TabsList aria-label="Account sections">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="min-h-[44px]">
              <t.icon className="h-4 w-4" /> {t.label}
              {t.id === 'notifications' && unread ? <span className="ml-1 rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{unread}</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="orders">
          <OrdersTab customerId={customerId} />
        </TabsContent>
        <TabsContent value="designs">
          <DesignsTab customerId={customerId} mode="mine" />
        </TabsContent>
        <TabsContent value="favorites">
          <DesignsTab customerId={customerId} mode="favorites" />
        </TabsContent>
        <TabsContent value="requests">
          <RequestsTab customerId={customerId} />
        </TabsContent>
        <TabsContent value="addresses">
          <AddressesTab customerId={customerId} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab customerId={customerId} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab customerId={customerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AccountPage() {
  return (
    <React.Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8"><ListSkeleton /></div>}>
      <Account />
    </React.Suspense>
  );
}

// ---------- orders ----------

function OrdersTab({ customerId }: { customerId: string }) {
  const orders = useStore((s) => s.orders);
  const subOrders = useStore((s) => s.subOrders);
  const vendors = useStore((s) => s.vendors);
  const loading = useFakeLoading();
  const list = Object.values(orders)
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (loading) return <ListSkeleton />;
  if (!list.length)
    return <EmptyState kind="shirt" title="No orders yet" body="Nothing here yet. Your next favorite tee is one design away." action={<Button asChild><Link href="/catalog">Start designing</Link></Button>} />;
  return (
    <div className="space-y-3">
      {list.slice(0, 5).map((o) => {
        const subs = o.subOrderIds.map((id) => subOrders[id]).filter(Boolean);
        return (
          <Link key={o.id} href={`/orders/${o.id}`} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-s1 transition-shadow hover:shadow-s2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="font-display font-semibold">Order {o.number}</div>
              <div className="text-sm text-muted">
                {formatDate(o.createdAt)} · {subs.map((s) => vendors[s.vendorId]?.shopName).join(', ')}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {subs.map((s) => (
                <StatusPill key={s.id} status={s.status} />
              ))}
              <MoneyText value={o.total} className="ml-auto font-display font-bold sm:ml-2" />
            </div>
          </Link>
        );
      })}
      <Button asChild variant="secondary" className="w-full">
        <Link href="/orders">See all orders ({list.length})</Link>
      </Button>
    </div>
  );
}

// ---------- designs ----------

function DesignsTab({ customerId, mode }: { customerId: string; mode: 'mine' | 'favorites' }) {
  const designs = useStore((s) => s.designs);
  const designers = useStore((s) => s.designers);
  const favorites = useStore((s) => s.customers[customerId]?.favorites ?? []);
  const loading = useFakeLoading();
  const [picked, setPicked] = React.useState<Design | null>(null);

  const list: Design[] =
    mode === 'mine'
      ? Object.values(designs).filter((d) => d.isPrivate && d.ownerCustomerId === customerId)
      : favorites.map((id) => designs[id]).filter((d): d is Design => !!d);

  if (loading) return <ListSkeleton rows={3} />;
  if (!list.length)
    return mode === 'mine' ? (
      <EmptyState kind="spark" title="No designs of your own yet" body="Designs you commission or upload in the customizer land here, ready to print." action={<Button asChild><Link href="/requests/new">Request a custom design</Link></Button>} />
    ) : (
      <EmptyState kind="spark" title="No favorites yet" body="Tap the heart on any design in the library to keep it here." action={<Button asChild><Link href="/designs">Browse designs</Link></Button>} />
    );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {list.map((d) => {
          const available = d.status === 'published' && (!d.isPrivate || d.ownerCustomerId === customerId);
          return (
            <div key={d.id} className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-s1">
              <div className={cn('relative aspect-square', d.files.transparent ? 'checker' : 'bg-surface-2')}>
                <SafeImage src={d.files.src} alt={d.title} contain className={cn('h-full w-full', d.files.transparent && 'p-4', !available && 'opacity-40 grayscale')} />
                {mode === 'favorites' ? <FavoriteButton designId={d.id} className="absolute right-2 top-2" /> : null}
                {d.isPrivate ? (
                  <Badge tone="dark" className="absolute left-2 top-2">
                    <Lock className="h-3 w-3" /> Private
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{d.title}</div>
                  <div className="truncate text-xs text-muted">{d.designerId ? `by ${designers[d.designerId]?.name ?? 'a designer'}` : 'Your upload'}</div>
                </div>
                {available ? (
                  <Button size="sm" className="mt-auto w-full" onClick={() => setPicked(d)}>
                    <Shirt className="h-4 w-4" /> Use on a product
                  </Button>
                ) : (
                  <p className="mt-auto rounded-input bg-surface-2 px-2 py-1.5 text-xs text-muted">No longer available to print</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ProductPickerDialog design={picked} open={!!picked} onOpenChange={(o) => !o && setPicked(null)} />
    </>
  );
}

// ---------- requests ----------

function RequestsTab({ customerId }: { customerId: string }) {
  const requests = useStore((s) => s.requests);
  const designers = useStore((s) => s.designers);
  const loading = useFakeLoading();
  const list = Object.values(requests)
    .filter((r) => r.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (loading) return <ListSkeleton />;
  if (!list.length)
    return <EmptyState kind="inbox" title="No requests yet" body="Describe your idea and local designers will send proposals." action={<Button asChild><Link href="/requests/new">Request a custom design</Link></Button>} />;
  return (
    <div className="space-y-3">
      {list.map((r) => (
        <Link key={r.id} href={`/requests/${r.id}`} className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-s1 transition-shadow hover:shadow-s2">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-designer/10 text-designer">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{r.title}</div>
            <div className="truncate text-sm text-muted">
              {r.designerId ? `With ${designers[r.designerId]?.name ?? 'a designer'}` : 'Posted publicly'} · {r.proposals.length} {r.proposals.length === 1 ? 'proposal' : 'proposals'}
            </div>
          </div>
          <StatusPill status={r.status} label={REQUEST_STATUS_LABEL[r.status]} />
        </Link>
      ))}
      <Button asChild variant="secondary" className="w-full">
        <Link href="/requests">Open requests page</Link>
      </Button>
    </div>
  );
}

// ---------- addresses ----------

const EMPTY_ADDR: Omit<Address, 'id'> = { label: 'Home', name: '', phone: '', division: 'Dhaka', city: '', area: '', line: '' };

function AddressesTab({ customerId }: { customerId: string }) {
  const customer = useStore((s) => s.customers[customerId]);
  const addAddress = useStore((s) => s.addAddress);
  const removeAddress = useStore((s) => s.removeAddress);
  const setDefault = useStore((s) => s.setDefaultAddress);
  const loading = useFakeLoading();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Omit<Address, 'id'>>(EMPTY_ADDR);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Address, string>>>({});
  const [toRemove, setToRemove] = React.useState<Address | null>(null);

  const startAdd = () => {
    setDraft({ ...EMPTY_ADDR, name: customer.name });
    setErrors({});
    setOpen(true);
  };
  const save = () => {
    const e: Partial<Record<keyof Address, string>> = {};
    if (!draft.label.trim()) e.label = 'Give it a short name, like Home or Office';
    if (!draft.name.trim()) e.name = 'Who should the courier ask for?';
    if (!/^01\d{3}-?\d{6}$/.test(draft.phone.trim())) e.phone = 'Use a Bangladeshi mobile number, like 01712-345678';
    if (!draft.city.trim()) e.city = 'Add your city';
    if (!draft.area.trim()) e.area = 'Add your area';
    if (!draft.line.trim()) e.line = 'Add house and road';
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = addAddress(customerId, { ...draft, label: draft.label.trim(), name: draft.name.trim(), phone: draft.phone.trim(), city: draft.city.trim(), area: draft.area.trim(), line: draft.line.trim() });
    if (customer.addresses.length === 0) setDefault(customerId, id);
    setOpen(false);
    toast.success('Address saved');
  };
  const set = (k: keyof Omit<Address, 'id'>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  if (loading) return <ListSkeleton rows={2} />;
  const only = customer.addresses.length <= 1;

  return (
    <div className="space-y-3">
      {customer.addresses.length ? (
        customer.addresses.map((a) => {
          const isDefault = a.id === customer.defaultAddressId;
          return (
            <div key={a.id} className={cn('rounded-card border bg-surface p-4 shadow-s1', isDefault ? 'border-accent' : 'border-border')}>
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
                  <Home className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{a.label}</span>
                    {isDefault ? <Badge tone="solid">Default</Badge> : null}
                  </div>
                  <p className="text-sm text-muted">
                    {a.name}, {a.phone}
                  </p>
                  <p className="text-sm text-muted">
                    {a.line}, {a.area}, {a.city}, {a.division}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {!isDefault ? (
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => {
                      setDefault(customerId, a.id);
                      toast.success(`${a.label} is now your default address`, { description: 'Prices and delivery times now use this address.' });
                    }}
                  >
                    <Star className="h-4 w-4" /> Set as default
                  </Button>
                ) : null}
                <Tip content={only ? 'Keep at least one address for delivery' : null}>
                  <span>
                    <Button variant="ghost" size="sm" disabled={only} onClick={() => setToRemove(a)} className="text-danger">
                      <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                  </span>
                </Tip>
              </div>
            </div>
          );
        })
      ) : (
        <EmptyState kind="box" body="No addresses yet. Add one so shops can quote delivery." />
      )}
      <Button onClick={startAdd} variant="secondary" className="w-full">
        <Plus className="h-4 w-4" /> Add address
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Add address" description="Delivery fees and times depend on your division and city.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Label" htmlFor="a-label" error={errors.label}>
              <Input id="a-label" value={draft.label} onChange={set('label')} placeholder="Home, Office" />
            </Field>
            <Field label="Recipient name" htmlFor="a-name" error={errors.name}>
              <Input id="a-name" value={draft.name} onChange={set('name')} />
            </Field>
            <Field label="Mobile number" htmlFor="a-phone" error={errors.phone} className="sm:col-span-2">
              <Input id="a-phone" inputMode="tel" value={draft.phone} onChange={set('phone')} placeholder="01712-345678" />
            </Field>
            <Field label="Division" htmlFor="a-div">
              <NativeSelect id="a-div" value={draft.division} onChange={(e) => setDraft((d) => ({ ...d, division: e.target.value as Division }))}>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="City" htmlFor="a-city" error={errors.city}>
              <Input id="a-city" value={draft.city} onChange={set('city')} placeholder="Dhaka" />
            </Field>
            <Field label="Area" htmlFor="a-area" error={errors.area}>
              <Input id="a-area" value={draft.area} onChange={set('area')} placeholder="Dhanmondi" />
            </Field>
            <Field label="House and road" htmlFor="a-line" error={errors.line}>
              <Input id="a-line" value={draft.line} onChange={set('line')} placeholder="House 12, Road 5" />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save address</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Remove this address?"
        description={toRemove ? `${toRemove.label}: ${toRemove.line}, ${toRemove.area}, ${toRemove.city}` : ''}
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (!toRemove) return;
          removeAddress(customerId, toRemove.id);
          toast.success('Address removed');
          setToRemove(null);
        }}
      />
    </div>
  );
}

// ---------- payments ----------

const PAY_META: Record<PaymentMethod, { label: string; color: string }> = {
  bkash: { label: 'bKash', color: '#E2136E' },
  nagad: { label: 'Nagad', color: '#F6921E' },
  card: { label: 'Card', color: '#1D2A55' },
  cod: { label: 'Cash on delivery', color: '#16A34A' },
};

function PaymentsTab({ customerId }: { customerId: string }) {
  const saved = useStore((s) => s.customers[customerId]?.savedPayments ?? []);
  const add = useStore((s) => s.addPaymentMethod);
  const loading = useFakeLoading();
  const [open, setOpen] = React.useState(false);
  const [method, setMethod] = React.useState<'bkash' | 'nagad' | 'card'>('bkash');
  const [num, setNum] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);

  const save = () => {
    const digits = num.replace(/\D/g, '');
    let label: string;
    if (method === 'card') {
      if (digits.length < 13 || digits.length > 19) return setErr('Card numbers have 13 to 19 digits');
      const brand = digits.startsWith('4') ? 'Visa' : digits.startsWith('5') ? 'Mastercard' : digits.startsWith('3') ? 'Amex' : 'Card';
      label = `${brand} ending ${digits.slice(-4)}`;
    } else {
      if (!/^01\d{9}$/.test(digits)) return setErr('Use an 11 digit mobile number starting with 01');
      label = `${PAY_META[method].label} ${digits.slice(0, 3)}••••${digits.slice(-4)}`;
    }
    add(customerId, method, label);
    toast.success(`${label} saved`, { description: 'This is a demo. No real payment details are stored.' });
    setOpen(false);
    setNum('');
    setErr(null);
  };

  if (loading) return <ListSkeleton rows={2} />;
  return (
    <div className="space-y-3">
      {saved.length ? (
        saved.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-s1">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-input text-white" style={{ background: PAY_META[p.method].color }}>
              {p.method === 'card' ? <CreditCard className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{p.label}</div>
              <div className="text-sm text-muted">{PAY_META[p.method].label}</div>
            </div>
          </div>
        ))
      ) : (
        <EmptyState kind="box" body="No saved payment methods. You can also pay cash on delivery at most shops." />
      )}
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add payment method
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Add payment method" description="Demo only. We only keep a masked label.">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Method">
            {(['bkash', 'nagad', 'card'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => {
                  setMethod(m);
                  setErr(null);
                }}
                className={cn('flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-input border text-sm font-semibold', method === m ? 'border-accent bg-accent-soft' : 'border-border hover:border-accent/50')}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: PAY_META[m].color }} />
                {PAY_META[m].label}
              </button>
            ))}
          </div>
          <Field label={method === 'card' ? 'Card number' : `${PAY_META[method].label} number`} htmlFor="pm-num" error={err} className="mt-4">
            <Input
              id="pm-num"
              inputMode="numeric"
              value={num}
              onChange={(e) => {
                setNum(e.target.value);
                setErr(null);
              }}
              placeholder={method === 'card' ? '4242 4242 4242 4242' : '01712345678'}
            />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- notifications ----------

function NotificationsTab({ customerId }: { customerId: string }) {
  const all = useStore((s) => s.notifications);
  const markRead = useStore((s) => s.markNotificationRead);
  const markAll = useStore((s) => s.markAllRead);
  const router = useRouter();
  const loading = useFakeLoading();
  const list = all.filter((n) => n.personaId === customerId).sort((a, b) => b.at.localeCompare(a.at));
  const unread = list.filter((n) => !n.read).length;
  if (loading) return <ListSkeleton />;
  if (!list.length) return <EmptyState kind="inbox" body="No notifications yet. Order updates and designer replies will show up here." />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{unread ? `${unread} unread` : 'All caught up'}</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={!unread}
          onClick={() => {
            markAll(customerId);
            toast.success('All marked as read');
          }}
        >
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>
      <ul className="overflow-hidden rounded-card border border-border bg-surface shadow-s1">
        {list.map((n) => (
          <li key={n.id} className="border-b border-border last:border-0">
            <button
              type="button"
              onClick={() => {
                markRead(n.id);
                router.push(n.link);
              }}
              className={cn('flex w-full items-start gap-3 p-4 text-left hover:bg-surface-2', !n.read && 'bg-accent-soft/60')}
            >
              <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent')} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{n.title}</span>
                <span className="block text-sm text-muted">{n.body}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  <Ago at={n.at} />
                  {!n.read ? <span className="sr-only">, unread</span> : null}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
