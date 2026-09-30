'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Banknote, Check, ChevronDown, CreditCard, Loader2, Lock, MapPin, Plus, Smartphone, Store, Truck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { PriceBreakdown, SplitView } from '@/components/shared/PriceBreakdown';
import { EmptyState, ErrorState, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { AddressForm } from '@/components/checkout/AddressForm';
import { SwitchShopDialog } from '@/components/checkout/SwitchShopDialog';
import { LineThumb } from '@/components/checkout/LineThumb';
import { groupDates, sizeSummary } from '@/components/checkout/helpers';
import { useCustomerId, useStore } from '@/lib/store';
import { cartLineStatus, customerAddress, groupCart } from '@/lib/selectors';
import { paymentFee, zoneFor } from '@/lib/pricing';
import { relativeDay } from '@/lib/dates';
import type { CartLine, PaymentMethod } from '@/lib/types';

type Step = 'address' | 'delivery' | 'payment' | 'review';
const STEPS: Step[] = ['address', 'delivery', 'payment', 'review'];
const STEP_TITLE: Record<Step, string> = { address: 'Address', delivery: 'Delivery', payment: 'Payment', review: 'Review' };

const PAY: { id: PaymentMethod; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'bkash', label: 'bKash', hint: 'Pay from your bKash wallet', icon: Smartphone },
  { id: 'nagad', label: 'Nagad', hint: 'Pay from your Nagad wallet', icon: Wallet },
  { id: 'card', label: 'Card', hint: 'Visa, Mastercard, Amex', icon: CreditCard },
  { id: 'cod', label: 'Cash on delivery', hint: 'Pay the courier when it arrives', icon: Banknote },
];

export default function CheckoutPage() {
  const loading = useFakeLoading();
  const router = useRouter();
  const cid = useCustomerId();
  const data = useStore();
  const addAddress = useStore((s) => s.addAddress);
  const setDefaultAddress = useStore((s) => s.setDefaultAddress);
  const placeOrder = useStore((s) => s.placeOrder);
  const customer = data.customers[cid];
  const lines = React.useMemo(() => data.carts[cid] ?? [], [data.carts, cid]);
  const address = customerAddress(data, cid);

  const [step, setStep] = React.useState<Step>('address');
  const [done, setDone] = React.useState<Step[]>([]);
  const [adding, setAdding] = React.useState(false);
  const [modes, setModes] = React.useState<Record<string, 'delivery' | 'pickup'>>({});
  const [payment, setPayment] = React.useState<PaymentMethod>('bkash');
  const [processing, setProcessing] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const [error, setError] = React.useState<string[] | null>(null);
  const [switchLine, setSwitchLine] = React.useState<CartLine | null>(null);
  const [splitOpen, setSplitOpen] = React.useState(false);

  const now = React.useMemo(() => new Date(), []);
  const deliveryGroups = React.useMemo(() => groupCart(data, lines, address, now), [data, lines, address, now]);
  const pickupGroups = React.useMemo(
    () => groupCart(data, lines, address, now, Object.fromEntries(deliveryGroups.map((g) => [g.vendorId, 'pickup' as const]))),
    [data, lines, address, now, deliveryGroups],
  );

  // per vendor zone info
  const zoneInfo = React.useMemo(
    () =>
      Object.fromEntries(
        deliveryGroups.map((g) => {
          const vendor = data.vendors[g.vendorId];
          const offering = data.offerings[g.lines[0].line.offeringId];
          const zk = vendor && address ? zoneFor(vendor.location, address) : null;
          const zone = offering?.delivery.zones.find((z) => z.zone === zk);
          return [g.vendorId, { served: !!zone?.served, pickup: !!offering?.delivery.pickupAvailable, cod: !!offering?.delivery.codAvailable, zoneLabel: zone?.label ?? '' }];
        }),
      ) as Record<string, { served: boolean; pickup: boolean; cod: boolean; zoneLabel: string }>,
    [deliveryGroups, data, address],
  );

  const effModes = React.useMemo(
    () => Object.fromEntries(deliveryGroups.map((g) => [g.vendorId, modes[g.vendorId] ?? (!zoneInfo[g.vendorId]?.served && zoneInfo[g.vendorId]?.pickup ? 'pickup' : 'delivery')])) as Record<string, 'delivery' | 'pickup'>,
    [deliveryGroups, modes, zoneInfo],
  );
  const groups = React.useMemo(() => groupCart(data, lines, address, now, effModes), [data, lines, address, now, effModes]);
  const statuses = React.useMemo(() => lines.map((l) => cartLineStatus(data, cid, l)), [data, lines, cid]);
  const blocking = statuses.filter((s) => s.blocking);

  const noDeliveryAnywhere = deliveryGroups.length > 0 && deliveryGroups.every((g) => !zoneInfo[g.vendorId]?.served);
  const unservedGroups = deliveryGroups.filter((g) => !zoneInfo[g.vendorId]?.served);
  const codBlockers = deliveryGroups.filter((g) => !zoneInfo[g.vendorId]?.cod).map((g) => data.vendors[g.vendorId]?.shopName ?? 'A shop');
  const codAllowed = codBlockers.length === 0;
  React.useEffect(() => {
    if (!codAllowed && payment === 'cod') setPayment('bkash');
  }, [codAllowed, payment]);

  const subtotal = groups.reduce((s, g) => s + (g.sub?.total ?? 0), 0);
  const codFee = paymentFee('cod', subtotal, data.settings.codFeePct);
  const fee = paymentFee(payment, subtotal, data.settings.codFeePct);
  const total = subtotal + fee;
  const groupsReady = groups.every((g) => g.sub && g.sub.shipping.served && g.lines.every((l) => l.quote.available));
  const canPlace = !!address && blocking.length === 0 && groupsReady && (payment !== 'cod' || codAllowed);

  const go = (s: Step) => setStep(s);
  const complete = (s: Step) => {
    setDone((d) => (d.includes(s) ? d : [...d, s]));
    const next = STEPS[STEPS.indexOf(s) + 1];
    if (next) setStep(next);
  };

  const place = () => {
    if (!address || !canPlace) return;
    setError(null);
    setProcessing(true);
    window.setTimeout(() => {
      const res = placeOrder(
        cid,
        lines.map((l) => l.id),
        address,
        payment,
        effModes,
      );
      if (res.ok && res.value) {
        setRedirecting(true);
        router.push(`/orders/${res.value}?placed=1`);
      } else {
        setProcessing(false);
        const reasons = res.ok ? ['Something went wrong. Nothing was charged.'] : res.reasons;
        setError(reasons);
        toast.error(reasons[0]);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader title="Checkout" />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Opening your order
        </div>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader title="Checkout" back={{ href: '/cart', label: 'Cart' }} />
        <EmptyState
          kind="shirt"
          body="Nothing here yet. Your next favorite tee is one design away."
          action={
            <Button asChild>
              <Link href="/catalog?category=tshirt">Browse products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const summaryFor: Record<Step, React.ReactNode> = {
    address: address ? `${address.label}: ${address.line}, ${address.area}, ${address.city}` : 'Pick an address',
    delivery: groups.map((g) => `${data.vendors[g.vendorId]?.shopName}: ${effModes[g.vendorId] === 'pickup' ? 'pickup' : 'delivery'}`).join(' · '),
    payment: PAY.find((p) => p.id === payment)?.label,
    review: null,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-10">
      <PageHeader title="Checkout" back={{ href: '/cart', label: 'Cart' }} subtitle={`${groups.length} ${groups.length === 1 ? 'shop' : 'shops'}, each ships separately`} />

      {blocking.length ? (
        <div className="mb-4">
          <ErrorState body={`${blocking.length} ${blocking.length === 1 ? 'item needs' : 'items need'} attention before you can pay: ${blocking[0].flags[0]?.message}.`} />
          <Button asChild variant="link" className="mt-2">
            <Link href="/cart">Fix in cart</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {/* Address */}
          <StepCard n={1} step="address" active={step} done={done} summary={summaryFor.address} onOpen={go}>
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
                {customer?.addresses.map((a) => {
                  const selected = a.id === address?.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setDefaultAddress(cid, a.id)}
                      className={cn('rounded-card border p-3 text-left transition-colors', selected ? 'border-accent bg-accent-soft/60 ring-2 ring-accent/20' : 'border-border hover:border-accent/50')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <MapPin className="h-4 w-4" /> {a.label}
                        </span>
                        {selected ? <Check className="h-4 w-4 text-accent-text" /> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {a.name}, {a.phone}
                      </p>
                      <p className="text-sm text-muted">
                        {a.line}, {a.area}, {a.city}, {a.division}
                      </p>
                    </button>
                  );
                })}
              </div>
              {adding ? (
                <div className="rounded-card border border-border p-3">
                  <AddressForm
                    defaults={{ name: customer?.name ?? '', phone: address?.phone ?? '' }}
                    onCancel={() => setAdding(false)}
                    onSave={(a) => {
                      const id = addAddress(cid, a);
                      setDefaultAddress(cid, id);
                      setAdding(false);
                      toast.success('Address saved');
                    }}
                  />
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" /> Add new address
                </Button>
              )}

              {address && noDeliveryAnywhere ? (
                <div className="rounded-input border border-danger/30 bg-danger/5 p-3 text-sm" role="alert">
                  <p className="font-semibold">No shop in your cart delivers to {address.city} yet.</p>
                  <p className="mt-1 text-muted">
                    {deliveryGroups.some((g) => zoneInfo[g.vendorId]?.pickup && groups.find((x) => x.vendorId === g.vendorId)?.sub)
                      ? 'You can pick up from the shop instead, we set that up for you in the Delivery step.'
                      : 'Try another address, or switch the items to a shop that delivers there.'}
                  </p>
                </div>
              ) : null}
              {address && !noDeliveryAnywhere && unservedGroups.length ? (
                <div className="space-y-2">
                  {unservedGroups.map((g) => {
                    const v = data.vendors[g.vendorId];
                    const pickupOk = zoneInfo[g.vendorId]?.pickup && !!groups.find((x) => x.vendorId === g.vendorId)?.sub;
                    return (
                      <div key={g.vendorId} className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-warning/40 bg-warning/10 p-3 text-sm" role="alert">
                        <span className="flex items-center gap-2 font-medium">
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                          {v?.shopName} doesn&apos;t deliver to {address.city} yet{pickupOk ? ', pickup only' : ''}.
                        </span>
                        <Button size="sm" onClick={() => setSwitchLine(g.lines[0].line)}>
                          <Store className="h-4 w-4" /> Switch shop
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button onClick={() => complete('address')} disabled={!address}>
                  Continue to delivery
                </Button>
              </div>
            </div>
          </StepCard>

          {/* Delivery */}
          <StepCard n={2} step="delivery" active={step} done={done} summary={summaryFor.delivery} onOpen={go}>
            <div className="space-y-4">
              {deliveryGroups.map((g) => {
                const v = data.vendors[g.vendorId];
                const info = zoneInfo[g.vendorId];
                const dates = groupDates(data, cid, g.lines.map((l) => l.line));
                const dShip = g.sub?.shipping;
                const pShip = pickupGroups.find((x) => x.vendorId === g.vendorId)?.sub?.shipping;
                const mode = effModes[g.vendorId];
                return (
                  <div key={g.vendorId}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-semibold">{v?.shopName}</span>
                      <span className="text-xs text-muted">{v?.location.city}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Delivery for ${v?.shopName}`}>
                      <OptionCard
                        selected={mode === 'delivery'}
                        disabled={!info?.served || !dShip}
                        onClick={() => setModes((m) => ({ ...m, [g.vendorId]: 'delivery' }))}
                        icon={<Truck className="h-5 w-5" />}
                        title="Home delivery"
                        line={info?.served && dates ? `Arrives ${relativeDay(dates.deliveryDate)}` : `Doesn't deliver to ${address?.city ?? 'you'} yet`}
                        price={dShip && info?.served ? dShip.freeApplied ? <span className="font-semibold text-green-600 dark:text-green-400">Free</span> : <MoneyText value={dShip.fee} className="font-semibold" /> : null}
                      />
                      <OptionCard
                        selected={mode === 'pickup'}
                        disabled={!info?.pickup || !pShip}
                        onClick={() => setModes((m) => ({ ...m, [g.vendorId]: 'pickup' }))}
                        icon={<Store className="h-5 w-5" />}
                        title="Pick up from shop"
                        line={info?.pickup ? (dates ? `Ready ${relativeDay(dates.shipDate)} in ${v?.location.city}` : `In ${v?.location.city}`) : 'This shop has no pickup'}
                        price={info?.pickup && pShip ? <MoneyText value={pShip.fee} className="font-semibold" /> : null}
                      />
                    </div>
                    {dates?.notices.length ? <p className="mt-1.5 text-xs text-muted">{dates.notices.join('. ')}.</p> : null}
                  </div>
                );
              })}
              <div className="flex justify-end">
                <Button onClick={() => complete('delivery')}>Continue to payment</Button>
              </div>
            </div>
          </StepCard>

          {/* Payment */}
          <StepCard n={3} step="payment" active={step} done={done} summary={summaryFor.payment} onOpen={go}>
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
                {PAY.filter((p) => p.id !== 'cod' || codAllowed).map((p) => {
                  const saved = customer?.savedPayments.find((s) => s.method === p.id);
                  return (
                    <OptionCard
                      key={p.id}
                      selected={payment === p.id}
                      onClick={() => setPayment(p.id)}
                      icon={<p.icon className="h-5 w-5" />}
                      title={p.label}
                      line={saved ? saved.label : p.hint}
                      price={p.id === 'cod' ? <span className="text-xs text-muted">+<MoneyText value={codFee} /> fee</span> : null}
                    />
                  );
                })}
              </div>
              {!codAllowed ? (
                <p className="rounded-input bg-surface-2 px-3 py-2 text-sm text-muted">
                  Cash on delivery isn&apos;t available for this order because {codBlockers.join(' and ')} only take{codBlockers.length === 1 ? 's' : ''} prepaid orders.
                </p>
              ) : null}
              <div className="flex justify-end">
                <Button onClick={() => complete('payment')}>Review order</Button>
              </div>
            </div>
          </StepCard>

          {/* Review */}
          <StepCard n={4} step="review" active={step} done={done} summary={null} onOpen={go}>
            <div className="space-y-4">
              {groups.map((g, i) => {
                const v = data.vendors[g.vendorId];
                const dates = groupDates(data, cid, g.lines.map((l) => l.line));
                return (
                  <div key={g.vendorId} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        Package {i + 1}: {v?.shopName}
                      </span>
                      {dates ? (
                        <span className="text-sm text-muted">
                          {effModes[g.vendorId] === 'pickup' ? `Ready ${relativeDay(dates.shipDate)}` : `Arrives ${relativeDay(dates.deliveryDate)}`}
                        </span>
                      ) : null}
                    </div>
                    <ul className="space-y-2">
                      {g.lines.map(({ line }) => (
                        <li key={line.id} className="flex items-center gap-3 text-sm">
                          <LineThumb customization={line.customization} offeringId={line.offeringId} className="w-12" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{data.products[line.customization.productId]?.name}</div>
                            <div className="text-muted">
                              {line.customization.color} · {sizeSummary(line.sizeBreakdown)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {g.sub ? <PriceBreakdown quote={g.sub.lines} shipping={g.sub.shipping} title={`${v?.shopName} breakdown`} /> : null}
                  </div>
                );
              })}
              <div className="rounded-card border border-border">
                <button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-left" onClick={() => setSplitOpen((o) => !o)} aria-expanded={splitOpen}>
                  <span className="font-semibold">Where your money goes</span>
                  <ChevronDown className={cn('h-5 w-5 text-muted transition-transform', splitOpen && 'rotate-180')} />
                </button>
                <AnimatePresence initial={false}>
                  {splitOpen ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                      <div className="space-y-3 border-t border-border p-4">
                        {groups.map((g) =>
                          g.sub ? (
                            <div key={g.vendorId}>
                              <div className="mb-1 text-sm font-medium">{data.vendors[g.vendorId]?.shopName}</div>
                              <SplitView split={g.sub.split} />
                            </div>
                          ) : null,
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </StepCard>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-border bg-surface p-4">
            <h2 className="mb-3 font-display text-lg font-semibold">Order total</h2>
            <dl className="space-y-1.5 text-sm">
              {groups.map((g) => (
                <div key={g.vendorId} className="flex justify-between gap-3">
                  <dt className="truncate text-muted">{data.vendors[g.vendorId]?.shopName}</dt>
                  <dd>{g.sub ? <MoneyText value={g.sub.total} /> : '-'}</dd>
                </div>
              ))}
              {fee ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Cash on delivery fee ({data.settings.codFeePct}%)</dt>
                  <dd>
                    <MoneyText value={fee} />
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 border-t border-border pt-2 font-semibold">
                <dt>Total</dt>
                <dd>
                  <MoneyText value={total} animated className="font-display text-xl" />
                </dd>
              </div>
            </dl>
            {error ? (
              <div className="mt-3">
                <ErrorState body={error[0]} onRetry={place} />
                <p className="mt-2 text-xs text-muted">No order was created and your cart is unchanged.</p>
              </div>
            ) : null}
            <Button size="lg" className="mt-4 w-full" disabled={!canPlace || processing} onClick={place}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing payment
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Place order · <MoneyText value={total} />
                </>
              )}
            </Button>
            {!canPlace && !processing ? (
              <p className="mt-2 text-xs text-muted">{blocking.length ? 'Fix the flagged items in your cart first.' : !groupsReady ? 'Choose a delivery option every shop supports.' : 'Complete the steps above.'}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted">
              Every shop ships separately, with its own tracking. {payment === 'cod' ? 'Pay the courier when each package arrives.' : 'You pay once for everything.'}
            </p>
          </div>
          <Badge tone="neutral" className="mx-auto flex w-fit">
            <Lock className="h-3 w-3" /> Demo payment, nothing is charged
          </Badge>
        </aside>
      </div>
      <SwitchShopDialog open={!!switchLine} onOpenChange={(o) => !o && setSwitchLine(null)} line={switchLine ?? lines[0]} customerId={cid} />
    </div>
  );
}

function StepCard({ n, step, active, done, summary, onOpen, children }: { n: number; step: Step; active: Step; done: Step[]; summary: React.ReactNode; onOpen: (s: Step) => void; children: React.ReactNode }) {
  const open = active === step;
  const isDone = done.includes(step);
  return (
    <section className={cn('rounded-card border bg-surface transition-colors', open ? 'border-accent/50 shadow-s1' : 'border-border')}>
      <button type="button" onClick={() => onOpen(step)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open}>
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold', isDone && !open ? 'bg-success text-white' : open ? 'bg-accent text-white' : 'bg-surface-2 text-muted')}>
          {isDone && !open ? <Check className="h-4 w-4" /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-semibold">{STEP_TITLE[step]}</span>
          {!open && summary ? <span className="block truncate text-sm text-muted">{summary}</span> : null}
        </span>
        {!open ? <span className="text-sm font-medium text-accent-text">{isDone ? 'Edit' : 'Open'}</span> : null}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="border-t border-border p-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function OptionCard({ selected, disabled, onClick, icon, title, line, price }: { selected: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; title: string; line: string; price?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-[64px] items-center gap-3 rounded-card border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-accent bg-accent-soft/60 ring-2 ring-accent/20' : 'border-border hover:border-accent/50',
      )}
    >
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', selected ? 'bg-accent text-white' : 'bg-surface-2 text-muted')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted">{line}</span>
      </span>
      {price ? <span className="shrink-0 text-sm">{price}</span> : null}
    </button>
  );
}
