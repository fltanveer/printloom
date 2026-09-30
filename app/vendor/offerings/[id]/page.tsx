'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Calculator, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Label, NativeSelect } from '@/components/ui/input';
import { Switch, Checkbox } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, SheetContent } from '@/components/ui/dialog';
import { EmptyState, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { StatusPill } from '@/components/shared/StatusPill';
import { useVendor } from '@/components/vendor/useVendor';
import { clone, validateOffering } from '@/components/vendor/helpers';
import { NumInput, Section, type Mutate } from '@/components/vendor/fields';
import { VariantMatrix, ensureVariant } from '@/components/vendor/VariantMatrix';
import { PriceRuleEditor } from '@/components/vendor/PriceRuleEditor';
import { ZoneTable } from '@/components/vendor/ZoneTable';
import { PriceSimulator } from '@/components/vendor/PriceSimulator';
import { METHOD_HINT, METHOD_LABEL } from '@/lib/pricing';
import { WEEKDAYS } from '@/lib/dates';
import type { BaseProduct, Offering, PrintMethod, QualityTier } from '@/lib/types';

const TABS = [
  { key: 'basics', label: 'Basics' },
  { key: 'colors', label: 'Colors and sizes' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'production', label: 'Production' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'promotions', label: 'Promotions' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const CONTENT_KEYS = ['status', 'blank', 'methods', 'colorGroups', 'variants', 'pricing', 'production', 'delivery'] as const;
const content = (o: Offering) => JSON.stringify(CONTENT_KEYS.map((k) => o[k]));

export default function OfferingEditorPage() {
  return (
    <React.Suspense fallback={<ListSkeleton rows={6} />}>
      <Editor />
    </React.Suspense>
  );
}

function Editor() {
  const loading = useFakeLoading();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { data, vendorId, vendor } = useVendor();
  const offering = data.offerings[id];
  const product = offering ? data.products[offering.productId] : undefined;
  const [draft, setDraft] = React.useState<Offering | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [simOpen, setSimOpen] = React.useState(false);
  const [flash, setFlash] = React.useState(false);
  const simRef = React.useRef<HTMLDivElement>(null);

  const tabParam = params.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'basics';

  React.useEffect(() => {
    if (offering && (!draft || draft.id !== offering.id)) setDraft(clone(offering));
  }, [offering, draft]);

  // "Simulate price" entry: focus the simulator
  React.useEffect(() => {
    if (loading || params.get('sim') !== '1') return;
    if (window.matchMedia('(min-width: 1024px)').matches) {
      simRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1600);
      return () => clearTimeout(t);
    }
    setSimOpen(true);
  }, [loading, params]);

  const dirty = !!draft && !!offering && content(draft) !== content(offering);

  React.useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const mutate: Mutate = React.useCallback((fn) => setDraft((d) => {
    if (!d) return d;
    const c = clone(d);
    fn(c);
    return c;
  }), []);

  if (loading) return <ListSkeleton rows={6} />;
  if (!offering || !product || offering.vendorId !== vendorId || !vendor)
    return (
      <EmptyState
        kind="search"
        title="Product not found"
        body="This product doesn't exist or belongs to another shop."
        action={
          <Button asChild>
            <Link href="/vendor/offerings">Back to products</Link>
          </Button>
        }
      />
    );
  if (!draft) return <ListSkeleton rows={6} />;

  const setTab = (t: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set('tab', t);
    sp.delete('sim');
    router.replace(`/vendor/offerings/${id}?${sp.toString()}`, { scroll: false });
  };

  const save = () => {
    const v = validateOffering(draft, draft.status === 'active');
    setErrors(v.errors);
    if (v.errors.length) {
      toast.error(`Fix ${v.errors.length} ${v.errors.length === 1 ? 'thing' : 'things'} before saving: ${v.errors[0]}`);
      return;
    }
    const payload = clone(draft);
    data.updateOffering(id, (o) => {
      Object.assign(o, {
        status: payload.status,
        blank: payload.blank,
        methods: payload.methods,
        colorGroups: payload.colorGroups,
        variants: payload.variants,
        pricing: payload.pricing,
        production: payload.production,
        delivery: payload.delivery,
      });
    });
    toast.success(`Saved as version ${offering.version + 1}. Carts with this product re-quote automatically.`);
  };

  const discard = () => {
    setDraft(clone(offering));
    setErrors([]);
    toast('Changes discarded');
  };

  const sim = <PriceSimulator data={data} draft={draft} product={product} vendor={vendor} dirty={dirty} />;

  return (
    <div>
      <PageHeader
        back={{ href: '/vendor/offerings', label: 'Products and pricing' }}
        title={product.name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusPill status={offering.status} /> Version {offering.version}. {draft.blank.brand}, {draft.blank.fabric}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" className="lg:hidden" onClick={() => setSimOpen(true)}>
              <Calculator className="h-4 w-4" /> Simulate price
            </Button>
            <Button onClick={save} disabled={!dirty}>
              <Save className="h-4 w-4" /> Save changes
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {errors.length ? (
            <div className="mb-4 rounded-card border border-danger/30 bg-danger/5 p-4 text-sm" role="alert">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-danger" /> Fix these before saving
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-muted">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="basics">
              <BasicsTab draft={draft} product={product} mutate={mutate} />
            </TabsContent>
            <TabsContent value="colors">
              <ColorsTab draft={draft} product={product} mutate={mutate} />
            </TabsContent>
            <TabsContent value="pricing">
              <PriceRuleEditor draft={draft} product={product} mutate={mutate} />
            </TabsContent>
            <TabsContent value="production">
              <ProductionTab draft={draft} mutate={mutate} />
            </TabsContent>
            <TabsContent value="delivery">
              <DeliveryTab draft={draft} mutate={mutate} />
            </TabsContent>
            <TabsContent value="promotions">
              <PromotionsTab draft={draft} mutate={mutate} />
            </TabsContent>
          </Tabs>

          <AnimatePresence>
            {dirty ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.18 }}
                className="sticky bottom-3 z-30 mt-5 flex flex-wrap items-center gap-2 rounded-card border border-accent/40 bg-surface p-3 shadow-s3"
              >
                <span className="flex-1 text-sm font-semibold">You have unsaved changes</span>
                <Button variant="ghost" onClick={discard}>
                  <RotateCcw className="h-4 w-4" /> Discard
                </Button>
                <Button onClick={save}>
                  <Save className="h-4 w-4" /> Save changes
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <aside className="hidden lg:block">
          <div ref={simRef} className={`sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-card border bg-surface p-4 shadow-s2 transition-shadow ${flash ? 'border-accent shadow-glow' : 'border-border'}`}>
            {sim}
          </div>
        </aside>
      </div>

      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <SheetContent side="bottom" title="Price simulator" description="Try any setup and see what customers pay and what you earn." className="lg:hidden">
          {sim}
        </SheetContent>
      </Dialog>
    </div>
  );
}

// ---------- Basics ----------

function BasicsTab({ draft, product, mutate }: { draft: Offering; product: BaseProduct; mutate: Mutate }) {
  const toggleMethod = (m: PrintMethod, on: boolean) =>
    mutate((o) => {
      if (on) {
        if (!o.methods.includes(m)) o.methods.push(m);
        if (!o.pricing.printTable[m]) {
          const face = { small: 70, medium: 120, large: 180, full: 250 };
          o.pricing.printTable[m] = Object.fromEntries(product.printAreas.map((a) => [a.view, Object.fromEntries(a.sizeTiers.map((t) => [t, face[t]]))]));
        }
        o.production.standardDays[m] ??= 4;
      } else o.methods = o.methods.filter((x) => x !== m);
    });
  return (
    <div className="space-y-4">
      <Section title="Blank" hint="Shown to customers as badges, like 200 GSM, combed cotton, Premium.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Product">
            <Input value={product.name} disabled />
          </Field>
          <Field label="Blank brand">
            <Input value={draft.blank.brand} onChange={(e) => mutate((o) => void (o.blank.brand = e.target.value))} />
          </Field>
          <Field label="Fabric" hint="Sublimation needs a polyester blank.">
            <Input value={draft.blank.fabric} onChange={(e) => mutate((o) => void (o.blank.fabric = e.target.value))} />
          </Field>
          <Field label="GSM (fabric weight)">
            <NumInput value={draft.blank.gsm} min={0} onChange={(v) => mutate((o) => void (o.blank.gsm = Math.max(0, Math.round(v ?? 0))))} aria-label="GSM" />
          </Field>
          <Field label="Fit">
            <Input value={draft.blank.fit} onChange={(e) => mutate((o) => void (o.blank.fit = e.target.value))} />
          </Field>
          <Field label="Quality tier">
            <NativeSelect value={draft.blank.qualityTier} onChange={(e) => mutate((o) => void (o.blank.qualityTier = e.target.value as QualityTier))}>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </NativeSelect>
          </Field>
        </div>
      </Section>
      <Section title="Print methods" hint="Only methods that work on this product are listed.">
        <div className="grid gap-2 sm:grid-cols-2">
          {product.allowedMethods.map((m) => {
            const on = draft.methods.includes(m);
            return (
              <label key={m} className={`flex min-h-[64px] cursor-pointer items-start gap-3 rounded-card border p-3 ${on ? 'border-accent bg-accent-soft/60' : 'border-border'}`}>
                <Checkbox checked={on} onCheckedChange={(v) => toggleMethod(m, !!v)} className="mt-0.5" aria-label={METHOD_LABEL[m]} />
                <span>
                  <span className="block font-semibold">{METHOD_LABEL[m]}</span>
                  <span className="block text-xs text-muted">{METHOD_HINT[m]}</span>
                </span>
              </label>
            );
          })}
        </div>
        {!draft.methods.length ? <p className="mt-2 text-xs font-medium text-danger">Pick at least one method before going live.</p> : null}
      </Section>
      <Section title="Status" hint="Live products show up for customers. Draft and paused ones stay hidden.">
        <div className="flex flex-wrap gap-2">
          {(['draft', 'active', 'paused'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => mutate((o) => void (o.status = s))}
              aria-pressed={draft.status === s}
              className={`h-11 rounded-input border px-4 text-sm font-semibold ${draft.status === s ? 'border-accent bg-accent text-white' : 'border-border hover:border-accent/50'}`}
            >
              {s === 'active' ? 'Live' : s === 'draft' ? 'Draft' : 'Paused'}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ---------- Colors and sizes ----------

function ColorsTab({ draft, product, mutate }: { draft: Offering; product: BaseProduct; mutate: Mutate }) {
  const [name, setName] = React.useState('');
  const [hex, setHex] = React.useState('#FF7A1A');
  const [group, setGroup] = React.useState(draft.colorGroups[0]?.name ?? 'Light');
  const [newGroup, setNewGroup] = React.useState('');
  const all = draft.colorGroups.flatMap((g) => g.colors);
  const custom = group === '__new';

  const add = () => {
    const n = name.trim();
    const g = custom ? newGroup.trim() : group;
    if (!n) return toast.error('Give the color a name, like Mustard');
    if (all.some((c) => c.name.toLowerCase() === n.toLowerCase())) return toast.error(`You already have ${n}`);
    if (!g) return toast.error('Name the new color group');
    mutate((o) => {
      let grp = o.colorGroups.find((x) => x.name.toLowerCase() === g.toLowerCase());
      if (!grp) {
        grp = { id: g.toLowerCase().replace(/\s+/g, '-'), name: g, colors: [] };
        o.colorGroups.push(grp);
        o.pricing.colorGroupUpcharge[g] ??= 0;
      }
      grp.colors.push({ name: n, hex: hex.toUpperCase() });
      product.sizes.forEach((s) => (ensureVariant(o, o.vendorId, product, n, s).enabled = true));
    });
    toast.success(`${n} added in every size. Turn off sizes you don't stock.`);
    setName('');
    if (custom) {
      setGroup(g);
      setNewGroup('');
    }
  };

  const remove = (color: string) =>
    mutate((o) => {
      o.colorGroups.forEach((g) => (g.colors = g.colors.filter((c) => c.name !== color)));
      o.colorGroups = o.colorGroups.filter((g) => g.colors.length);
      o.variants = o.variants.filter((v) => v.color !== color);
    });

  return (
    <div className="space-y-4">
      <Section title="Colors" hint="Groups decide upcharges. Dark colors cost more to print on with DTG and DTF.">
        <div className="space-y-3">
          {draft.colorGroups.map((g) => (
            <div key={g.id}>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{g.name}</div>
              <div className="flex flex-wrap gap-2">
                {g.colors.map((c) => (
                  <span key={c.name} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface pl-1.5 pr-1 text-sm">
                    <span className="h-7 w-7 rounded-full border border-border" style={{ background: c.hex }} aria-hidden />
                    {c.name}
                    <button type="button" onClick={() => remove(c.name)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger" aria-label={`Remove ${c.name}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 rounded-card bg-surface-2/60 p-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
          <Field label="New color name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mustard" onKeyDown={(e) => e.key === 'Enter' && add()} />
          </Field>
          <div>
            <Label htmlFor="new-hex">Hex</Label>
            <div className="flex items-center gap-2">
              <input id="new-hex" type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-11 w-11 cursor-pointer rounded-input border border-border bg-surface" aria-label="Pick color" />
              <Input value={hex} onChange={(e) => setHex(e.target.value)} className="w-28 font-mono" aria-label="Hex value" />
            </div>
          </div>
          <div className="grid gap-2">
            <Field label="Group">
              <NativeSelect value={group} onChange={(e) => setGroup(e.target.value)}>
                {[...new Set(['Light', 'Dark', 'Heather', 'Neon', ...draft.colorGroups.map((g) => g.name)])].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="__new">New group...</option>
              </NativeSelect>
            </Field>
            {custom ? <Input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="Group name, e.g. Pastel" aria-label="New group name" /> : null}
          </div>
          <Button onClick={add} disabled={!/^#[0-9a-fA-F]{6}$/.test(hex)}>
            <Plus className="h-4 w-4" /> Add color
          </Button>
        </div>
      </Section>
      <Section
        title="Variant grid"
        hint="Every color and size you stock. Custom-priced cells replace the base price for that one variant."
        actions={<Badge tone="neutral">{draft.variants.filter((v) => v.enabled).length} of {all.length * product.sizes.length} on</Badge>}
      >
        <VariantMatrix draft={draft} product={product} mutate={mutate} />
      </Section>
    </div>
  );
}

// ---------- Production ----------

function ProductionTab({ draft, mutate }: { draft: Offering; mutate: Mutate }) {
  const p = draft.production;
  const minStd = draft.methods.length ? Math.min(...draft.methods.map((m) => p.standardDays[m] ?? 4)) : 0;
  const rushBad = p.rush.available && p.rush.days >= minStd;
  return (
    <div className="space-y-4">
      <Section title="Standard production days" hint="Working days from order to handing it to the courier.">
        {draft.methods.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {draft.methods.map((m) => (
              <Field key={m} label={METHOD_LABEL[m]} error={(p.standardDays[m] ?? 0) < 1 ? 'At least 1 day' : null}>
                <NumInput value={p.standardDays[m] ?? 4} min={1} suffix="days" className="pr-12" onChange={(v) => mutate((o) => void (o.production.standardDays[m] = Math.round(v ?? 0)))} aria-label={`${METHOD_LABEL[m]} days`} />
              </Field>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Pick a print method in Basics first.</p>
        )}
      </Section>
      <Section title="Rush orders" hint="Customers pay extra to get it sooner." actions={<Switch checked={p.rush.available} onCheckedChange={(v) => mutate((o) => void (o.production.rush.available = v))} aria-label="Offer rush" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rush days" error={rushBad ? `Must be fewer than your fastest standard time (${minStd} days)` : null}>
            <NumInput value={p.rush.days} min={1} disabled={!p.rush.available} onChange={(v) => mutate((o) => void (o.production.rush.days = Math.round(v ?? 0)))} aria-label="Rush days" />
          </Field>
          <Field label="Rush fee" hint="Percent of garment and print.">
            <NumInput value={p.rush.feePct} min={0} suffix="%" disabled={!p.rush.available} onChange={(v) => mutate((o) => void (o.production.rush.feePct = v ?? 0))} aria-label="Rush fee percent" />
          </Field>
        </div>
      </Section>
      <Section title="Schedule">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Daily capacity (pieces)" hint={`${p.bookedToday} booked today. Past capacity, dates shift a day.`}>
            <NumInput value={p.dailyCapacity} min={1} onChange={(v) => mutate((o) => void (o.production.dailyCapacity = Math.round(v ?? 0)))} aria-label="Daily capacity" />
          </Field>
          <Field label="Order cutoff" hint="Orders after this start the next working day.">
            <Input type="time" value={p.cutoffTime} onChange={(e) => mutate((o) => void (o.production.cutoffTime = e.target.value || '14:00'))} />
          </Field>
          <Field label="Weekly off day">
            <NativeSelect value={p.weeklyOffDay} onChange={(e) => mutate((o) => void (o.production.weeklyOffDay = Number(e.target.value)))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Section>
    </div>
  );
}

// ---------- Delivery ----------

function DeliveryTab({ draft, mutate }: { draft: Offering; mutate: Mutate }) {
  const d = draft.delivery;
  return (
    <div className="space-y-4">
      <Section title="Delivery zones" hint="Zones are worked out from your shop location and the customer's address.">
        <ZoneTable zones={d.zones} onChange={(i, patch) => mutate((o) => void Object.assign(o.delivery.zones[i], patch))} />
      </Section>
      <Section title="Fees and options">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Per extra item" hint="Added for every piece after the first.">
            <NumInput value={d.perExtraItemFee} min={0} prefix="৳" onChange={(v) => mutate((o) => void (o.delivery.perExtraItemFee = v ?? 0))} aria-label="Per extra item fee" />
          </Field>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="mb-0">Free delivery above</Label>
              <Switch checked={d.freeShippingThreshold !== null} onCheckedChange={(v) => mutate((o) => void (o.delivery.freeShippingThreshold = v ? 3000 : null))} aria-label="Offer free delivery" />
            </div>
            <NumInput value={d.freeShippingThreshold ?? undefined} allowEmpty min={0} prefix="৳" disabled={d.freeShippingThreshold === null} placeholder="No free delivery" onChange={(v) => mutate((o) => void (o.delivery.freeShippingThreshold = v ?? 0))} aria-label="Free delivery threshold" />
          </div>
          <label className="flex min-h-[56px] items-center justify-between gap-3 rounded-card border border-border p-3">
            <span>
              <span className="block font-semibold">Cash on delivery</span>
              <span className="block text-xs text-muted">If off, customers pay online for your items.</span>
            </span>
            <Switch checked={d.codAvailable} onCheckedChange={(v) => mutate((o) => void (o.delivery.codAvailable = v))} aria-label="Cash on delivery" />
          </label>
          <label className="flex min-h-[56px] items-center justify-between gap-3 rounded-card border border-border p-3">
            <span>
              <span className="block font-semibold">Pickup from shop</span>
              <span className="block text-xs text-muted">Free for customers in your city.</span>
            </span>
            <Switch checked={d.pickupAvailable} onCheckedChange={(v) => mutate((o) => void (o.delivery.pickupAvailable = v))} aria-label="Pickup from shop" />
          </label>
        </div>
      </Section>
    </div>
  );
}

// ---------- Promotions ----------

const toDate = (iso: string) => iso.slice(0, 10);
const fromDate = (d: string, end = false) => new Date(`${d}T${end ? '23:59:59' : '00:00:00'}+06:00`).toISOString();

function PromotionsTab({ draft, mutate }: { draft: Offering; mutate: Mutate }) {
  const promos = draft.pricing.promotions;
  const now = Date.now();
  const add = () =>
    mutate((o) =>
      o.pricing.promotions.push({
        id: `promo_${Math.random().toString(36).slice(2, 8)}`,
        name: 'New promotion',
        type: 'percent',
        value: 10,
        appliesTo: [o.id],
        minQty: undefined,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        active: true,
      }),
    );
  return (
    <Section title="Promotions" hint="Only the single best promotion applies to a line, after the quantity discount." actions={<Button size="sm" onClick={add}><Plus className="h-4 w-4" /> Add promotion</Button>}>
      {!promos.length ? (
        <EmptyState kind="spark" body="No promotions yet. A small team discount is a great way to win bigger orders." className="border-0" action={<Button variant="secondary" onClick={add}>Create a promotion</Button>} />
      ) : (
        <div className="space-y-3">
          {promos.map((p, i) => {
            const live = p.active && now >= new Date(p.startsAt).getTime() && now <= new Date(p.endsAt).getTime();
            const upd = (fn: (x: typeof p) => void) => mutate((o) => fn(o.pricing.promotions[i]));
            return (
              <div key={p.id} className="rounded-card border border-border p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Input value={p.name} onChange={(e) => upd((x) => void (x.name = e.target.value))} className="min-w-0 flex-1 font-semibold" aria-label="Promotion name" />
                  <Badge tone={live ? 'success' : 'neutral'}>{live ? 'Running' : !p.active ? 'Off' : now < new Date(p.startsAt).getTime() ? 'Scheduled' : 'Ended'}</Badge>
                  <Switch checked={p.active} onCheckedChange={(v) => upd((x) => void (x.active = v))} aria-label="Promotion active" />
                  <Button variant="ghost" size="icon" aria-label="Remove promotion" onClick={() => mutate((o) => void o.pricing.promotions.splice(i, 1))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <Field label="Type">
                    <NativeSelect value={p.type} onChange={(e) => upd((x) => void (x.type = e.target.value as 'percent' | 'flat'))}>
                      <option value="percent">Percent off</option>
                      <option value="flat">Taka off per piece</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Value">
                    <NumInput value={p.value} min={0} prefix={p.type === 'flat' ? '৳' : undefined} suffix={p.type === 'percent' ? '%' : undefined} onChange={(v) => upd((x) => void (x.value = v ?? 0))} aria-label="Promotion value" />
                  </Field>
                  <Field label="Minimum pieces">
                    <NumInput value={p.minQty} allowEmpty min={0} placeholder="Any" onChange={(v) => upd((x) => void (x.minQty = v === undefined ? undefined : Math.round(v)))} aria-label="Minimum pieces" />
                  </Field>
                  <Field label="Starts">
                    <Input type="date" value={toDate(p.startsAt)} onChange={(e) => e.target.value && upd((x) => void (x.startsAt = fromDate(e.target.value)))} />
                  </Field>
                  <Field label="Ends">
                    <Input type="date" value={toDate(p.endsAt)} onChange={(e) => e.target.value && upd((x) => void (x.endsAt = fromDate(e.target.value, true)))} />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
