'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink, PauseCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, NativeSelect, Textarea } from '@/components/ui/input';
import { Switch, Checkbox } from '@/components/ui/switch';
import { ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { StatusPill } from '@/components/shared/StatusPill';
import { useVendor } from '@/components/vendor/useVendor';
import { LocationForm, PayoutMethodForm, ShopProfileForm, profileOf } from '@/components/vendor/ShopForms';
import { WEEKDAYS } from '@/lib/dates';

export default function SettingsPage() {
  const loading = useFakeLoading();
  const { data, vendorId, vendor } = useVendor();
  const [msg, setMsg] = React.useState('');
  const [offDay, setOffDay] = React.useState(5);
  const [applyAll, setApplyAll] = React.useState(true);

  React.useEffect(() => {
    if (!vendor) return;
    setMsg(vendor.pausedMessage || 'Back soon. We are taking a short break.');
    setOffDay(vendor.weeklyOffDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  if (loading || !vendor) return <ListSkeleton rows={4} />;
  const paused = vendor.status === 'paused';
  const offerings = Object.values(data.offerings).filter((o) => o.vendorId === vendorId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle={<span className="inline-flex items-center gap-2">Shop status <StatusPill status={vendor.status} /></span>}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/shop/${vendorId}`}>
              View my storefront <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shop profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ShopProfileForm
              key={`${vendorId}-${vendor.shopName}-${vendor.logo}-${vendor.cover}`}
              initial={profileOf(vendor)}
              onSave={(v) => {
                data.updateVendor(vendorId, (x) => Object.assign(x, v));
                toast.success('Profile saved. Customers see it on your storefront now.');
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className={paused ? 'border-warning/60' : undefined}>
            <CardHeader>
              <div>
                <CardTitle>{paused ? 'Your shop is paused' : 'Pause shop'}</CardTitle>
                <p className="text-sm text-muted">
                  {paused ? 'Customers see "Temporarily closed" and you are left out of recommendations.' : 'Going on holiday or too busy? Pause new orders. Current orders are not affected.'}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Auto-reply message" hint="Shown on your storefront and to customers with your products in their cart.">
                <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={160} />
              </Field>
              {paused ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      data.setVendorPaused(vendorId, false);
                      toast.success('Welcome back. Your shop is open for orders.');
                    }}
                  >
                    <PlayCircle className="h-4 w-4" /> Reopen shop
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      data.setVendorPaused(vendorId, true, msg.trim());
                      toast.success('Message updated');
                    }}
                  >
                    Update message
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  disabled={vendor.status === 'onboarding'}
                  onClick={() => {
                    data.setVendorPaused(vendorId, true, msg.trim());
                    toast.success('Shop paused. Customers with your items in their cart were told.');
                  }}
                >
                  <PauseCircle className="h-4 w-4" /> Pause shop
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly off day</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Closed on" hint="Delivery dates skip this day.">
                <NativeSelect value={offDay} onChange={(e) => setOffDay(Number(e.target.value))}>
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox checked={applyAll} onCheckedChange={(v) => setApplyAll(!!v)} aria-label="Apply to all products" /> Also use it for all {offerings.length} products
              </label>
              <Button
                variant="secondary"
                onClick={() => {
                  data.updateVendor(vendorId, (x) => void (x.weeklyOffDay = offDay));
                  if (applyAll) offerings.forEach((o) => o.production.weeklyOffDay !== offDay && data.updateOffering(o.id, (x) => void (x.production.weeklyOffDay = offDay), { silent: true }));
                  toast.success(`Closed on ${WEEKDAYS[offDay]}s from now on`);
                }}
              >
                Save off day
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {(
                [
                  ['email', 'Email', 'Daily summary and payouts'],
                  ['sms', 'SMS', 'New orders and issues, right away'],
                  ['push', 'Push', 'Everything, on your phone'],
                ] as const
              ).map(([k, label, hint]) => (
                <label key={k} className="flex min-h-[56px] items-center justify-between gap-3 py-2">
                  <span>
                    <span className="block font-medium">{label}</span>
                    <span className="block text-xs text-muted">{hint}</span>
                  </span>
                  <Switch
                    checked={vendor.notificationPrefs[k]}
                    onCheckedChange={(v) => {
                      data.updateVendor(vendorId, (x) => void (x.notificationPrefs[k] = v));
                      toast.success(`${label} notifications ${v ? 'on' : 'off'}`);
                    }}
                    aria-label={`${label} notifications`}
                  />
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationForm
                key={`${vendorId}-loc`}
                initial={vendor.location}
                onSave={(loc) => {
                  data.updateVendor(vendorId, (x) => void (x.location = loc));
                  toast.success('Location saved. Delivery zones now use it.');
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout method</CardTitle>
            </CardHeader>
            <CardContent>
              <PayoutMethodForm
                key={`${vendorId}-po`}
                initial={vendor.payoutMethod}
                onSave={(m) => {
                  data.updateVendor(vendorId, (x) => void (x.payoutMethod = m));
                  toast.success('Payout method saved');
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
