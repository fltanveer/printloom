'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Check, Eye, EyeOff, MapPin, Package, PartyPopper, Rocket, Store, Truck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/components/ui/cn';
import { ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { useVendor } from '@/components/vendor/useVendor';
import { LocationForm, PayoutMethodForm, ShopProfileForm, profileOf } from '@/components/vendor/ShopForms';
import { ZoneTable } from '@/components/vendor/ZoneTable';
import { NumInput } from '@/components/vendor/fields';
import { clone } from '@/components/vendor/helpers';
import type { DeliveryRules, Vendor } from '@/lib/types';

type Step = keyof Vendor['setup'];
const STEPS: { key: Step; title: string; body: string; icon: React.ElementType }[] = [
  { key: 'profile', title: 'Shop profile', body: 'Name, logo, cover photo and a line about you.', icon: Store },
  { key: 'location', title: 'Location', body: 'Where you print from. It sets your delivery zones.', icon: MapPin },
  { key: 'payout', title: 'Payout method', body: 'bKash, Nagad or bank. Where your earnings go.', icon: Wallet },
  { key: 'firstOffering', title: 'First product', body: 'Pick a blank, set colors, sizes and prices.', icon: Package },
  { key: 'deliveryZones', title: 'Delivery zones', body: 'Fees and days for your city, division and the rest of the country.', icon: Truck },
  { key: 'live', title: 'Go live', body: 'Open your shop to customers.', icon: Rocket },
];
const REQUIRED: Step[] = ['profile', 'location', 'payout', 'firstOffering', 'deliveryZones'];
const EMPTY: Vendor['setup'] = { profile: false, location: false, payout: false, firstOffering: false, deliveryZones: false, live: false };

const DEFAULT_DELIVERY: Pick<DeliveryRules, 'zones' | 'perExtraItemFee'> = {
  zones: [
    { zone: 'same_city', label: 'Same city', fee: 70, days: 1, served: true },
    { zone: 'same_division', label: 'Same division', fee: 100, days: 2, served: true },
    { zone: 'other', label: 'Other divisions', fee: 130, days: 3, served: true },
  ],
  perExtraItemFee: 10,
};

export default function OnboardingPage() {
  const loading = useFakeLoading();
  const { data, vendorId, vendor } = useVendor();
  const [preview, setPreview] = React.useState(false);
  const [previewDone, setPreviewDone] = React.useState<Vendor['setup']>(EMPTY);
  const [open, setOpen] = React.useState<Step | null>(null);

  const offerings = React.useMemo(() => Object.values(data.offerings).filter((o) => o.vendorId === vendorId), [data.offerings, vendorId]);
  const [zones, setZones] = React.useState(DEFAULT_DELIVERY);
  React.useEffect(() => {
    const first = offerings[0];
    setZones(first ? { zones: clone(first.delivery.zones), perExtraItemFee: first.delivery.perExtraItemFee } : clone(DEFAULT_DELIVERY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, open]);

  if (loading || !vendor) return <ListSkeleton rows={6} />;

  const setup = preview ? previewDone : vendor.setup;
  const doneCount = Object.values(setup).filter(Boolean).length;
  const pct = Math.round((doneCount / 6) * 100);
  const canGoLive = REQUIRED.every((k) => setup[k]);
  const allDone = !preview && vendor.setup.live;

  const finish = (step: Step, msg: string, apply: () => void) => {
    if (preview) {
      setPreviewDone((d) => ({ ...d, [step]: true }));
      toast.success(`${msg} (Preview only, your live shop was not changed.)`);
    } else {
      apply();
      data.completeSetupStep(vendorId, step);
      toast.success(msg);
    }
    setOpen(null);
  };

  const goLive = () => {
    if (!canGoLive) return;
    if (preview) {
      toast.success("That's the whole setup. A new shop would be live now.");
      setPreview(false);
      setPreviewDone(EMPTY);
      return;
    }
    data.completeSetupStep(vendorId, 'live');
    toast.success(`${vendor.shopName} is live. Customers can find you now.`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Setup checklist"
        subtitle={preview ? 'Preview mode: walk through the steps a brand new shop sees. Nothing is saved.' : 'Everything a new shop needs before its first order.'}
        actions={
          <Button
            variant={preview ? 'primary' : 'secondary'}
            onClick={() => {
              setPreview((p) => !p);
              setPreviewDone(EMPTY);
            }}
          >
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {preview ? 'Exit preview' : 'Preview as new shop'}
          </Button>
        }
      />

      {allDone ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-center gap-4 rounded-card border border-success/30 bg-success/10 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success text-white">
            <PartyPopper className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-semibold">You're all set up</div>
            <p className="text-sm text-muted">Your shop is live. You can still change anything below whenever you like.</p>
          </div>
          <Button variant="secondary" asChild className="hidden sm:inline-flex">
            <Link href="/vendor">Dashboard</Link>
          </Button>
        </motion.div>
      ) : null}

      <Card className="mb-5 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">{doneCount} of 6 done</span>
          <span className="tabular-nums text-muted">{pct}%</span>
        </div>
        <Progress value={pct} className="h-3" />
      </Card>

      <ol className="space-y-3">
        {STEPS.map((s, i) => {
          const done = setup[s.key];
          const Icon = s.icon;
          const isLive = s.key === 'live';
          return (
            <li key={s.key}>
              <Card className={cn('flex flex-wrap items-center gap-4 p-4', done && 'bg-surface-2/40')}>
                <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', done ? 'bg-success text-white' : 'bg-accent-soft text-accent-text')}>
                  {done ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted">Step {i + 1}</span>
                    {done ? <Badge tone="success">Done</Badge> : isLive ? null : <Badge tone="neutral">Required</Badge>}
                  </div>
                  <div className="font-semibold">{s.title}</div>
                  <p className="text-sm text-muted">{s.body}</p>
                </div>
                {isLive ? (
                  done ? (
                    <Badge tone="success" className="h-9 px-3 text-sm">
                      Live
                    </Badge>
                  ) : (
                    <Button onClick={goLive} disabled={!canGoLive} title={canGoLive ? undefined : 'Finish the steps above first'}>
                      <Rocket className="h-4 w-4" /> Go live
                    </Button>
                  )
                ) : s.key === 'firstOffering' ? (
                  <div className="flex gap-2">
                    {preview && !done ? (
                      <Button variant="ghost" onClick={() => finish('firstOffering', 'First product step done', () => undefined)}>
                        Skip in preview
                      </Button>
                    ) : null}
                    <Button variant={done ? 'secondary' : 'primary'} asChild>
                      <Link href={done && offerings.length ? '/vendor/offerings' : '/vendor/offerings?add=1'}>{done ? 'View products' : 'Add product'}</Link>
                    </Button>
                  </div>
                ) : (
                  <Button variant={done ? 'secondary' : 'primary'} onClick={() => setOpen(s.key)}>
                    {done ? 'Edit' : 'Start'}
                  </Button>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
      {!canGoLive ? <p className="mt-3 text-center text-sm text-muted">Go live unlocks when the five required steps are done.</p> : null}

      <Dialog open={open === 'profile'} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent title="Shop profile" description="This is what customers see first.">
          <ShopProfileForm
            initial={preview ? { shopName: '', logo: '', logoColor: '#FF7A1A', cover: '/stock/vendor-dhaka.jpg', about: '' } : profileOf(vendor)}
            onCancel={() => setOpen(null)}
            onSave={(v) => finish('profile', 'Profile saved', () => data.updateVendor(vendorId, (x) => Object.assign(x, v)))}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={open === 'location'} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent title="Location" description="Customers in your city get the lowest delivery fee.">
          <LocationForm initial={vendor.location} onSave={(loc) => finish('location', 'Location saved', () => data.updateVendor(vendorId, (x) => void (x.location = loc)))} />
        </DialogContent>
      </Dialog>
      <Dialog open={open === 'payout'} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent title="Payout method" description="We send completed order earnings here.">
          <PayoutMethodForm initial={preview ? null : vendor.payoutMethod} onSave={(m) => finish('payout', 'Payout method saved', () => data.updateVendor(vendorId, (x) => void (x.payoutMethod = m)))} />
        </DialogContent>
      </Dialog>
      <Dialog open={open === 'deliveryZones'} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent title="Delivery zones" description="Applied to all your products. You can fine tune each product later.">
          {!preview && !offerings.length ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">Add your first product, then set delivery zones for it.</p>
              <Button asChild>
                <Link href="/vendor/offerings?add=1">Add product</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <ZoneTable zones={zones.zones} onChange={(i, patch) => setZones((z) => ({ ...z, zones: z.zones.map((x, j) => (j === i ? { ...x, ...patch } : x)) }))} />
              <div className="max-w-[200px]">
                <span className="mb-1.5 block text-sm font-medium">Per extra item</span>
                <NumInput value={zones.perExtraItemFee} min={0} prefix="৳" onChange={(v) => setZones((z) => ({ ...z, perExtraItemFee: v ?? 0 }))} aria-label="Per extra item fee" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpen(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={!zones.zones.some((z) => z.served) || zones.zones.some((z) => z.fee < 0 || z.days < 0) || zones.perExtraItemFee < 0}
                  onClick={() =>
                    finish('deliveryZones', 'Delivery zones saved', () =>
                      offerings.forEach((o) =>
                        data.updateOffering(o.id, (x) => {
                          x.delivery.zones = clone(zones.zones);
                          x.delivery.perExtraItemFee = zones.perExtraItemFee;
                        }),
                      ),
                    )
                  }
                >
                  Save zones
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
