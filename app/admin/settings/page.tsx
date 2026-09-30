'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Info, RotateCcw, Save } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fromPrice } from '@/lib/selectors';
import { APPAREL_SIZES } from '@/lib/seed';
import { SIZE_TIERS, TIER_LABEL } from '@/lib/pricing';
import { VIEW_LABEL } from '@/lib/mockups';
import type { PlatformSettings, SizeTier, View } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/misc';
import { MoneyText } from '@/components/shared/MoneyText';
import { PageHeader, useFakeLoading } from '@/components/shared/bits';

interface Draft {
  commissionPct: string;
  requestFeePct: string;
  codFeePct: string;
  usdRate: string;
  colorGroup: string;
  size: string;
  tier: SizeTier;
  view: View;
}

const toDraft = (s: PlatformSettings): Draft => ({
  commissionPct: String(s.commissionPct),
  requestFeePct: String(s.requestFeePct),
  codFeePct: String(s.codFeePct),
  usdRate: String(s.usdRate),
  colorGroup: s.fromPrice.colorGroup,
  size: s.fromPrice.size,
  tier: s.fromPrice.tier,
  view: s.fromPrice.view,
});

const RANGES: Record<'commissionPct' | 'requestFeePct' | 'codFeePct' | 'usdRate', [number, number, string]> = {
  commissionPct: [0, 40, 'Commission'],
  requestFeePct: [0, 40, 'Request fee'],
  codFeePct: [0, 10, 'COD fee'],
  usdRate: [50, 300, 'USD rate'],
};

export default function AdminSettingsPage() {
  const loading = useFakeLoading();
  const state = useStore();
  const settings = state.settings;
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(settings));

  const errors: Partial<Record<keyof Draft, string>> = {};
  (Object.keys(RANGES) as (keyof typeof RANGES)[]).forEach((k) => {
    const [min, max, label] = RANGES[k];
    const n = Number(draft[k]);
    if (!draft[k].trim() || !Number.isFinite(n) || n < min || n > max) errors[k] = `${label} must be between ${min} and ${max}.`;
  });
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(settings));

  const teeFrom = React.useMemo(() => fromPrice(state, 'p_tee'), [state]);
  const hoodieFrom = React.useMemo(() => fromPrice(state, 'p_hoodie'), [state]);

  const save = () => {
    if (Object.keys(errors).length) {
      toast.error(Object.values(errors).join(' '));
      return;
    }
    state.updateSettings({
      commissionPct: Number(draft.commissionPct),
      requestFeePct: Number(draft.requestFeePct),
      codFeePct: Number(draft.codFeePct),
      usdRate: Number(draft.usdRate),
      fromPrice: { colorGroup: draft.colorGroup, size: draft.size, tier: draft.tier, view: draft.view },
    });
    toast.success('Settings saved. Prices across the app updated.');
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  if (loading) return <Skeleton className="h-[520px]" />;

  return (
    <div className="pb-24 md:pb-0">
      <PageHeader title="Platform settings" subtitle="Fees and the rule behind every “from” price." />
      <p className="mb-5 flex items-start gap-2 rounded-card bg-accent-soft p-3 text-sm text-accent-text">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> All prices update live. Carts, quotes, splits for new orders and the catalog use the new values as soon as you save. Placed orders keep their original split.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold">Fees</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Commission on orders (%)" htmlFor="st-comm" error={errors.commissionPct}>
              <Input id="st-comm" type="number" step={0.5} value={draft.commissionPct} onChange={(e) => set('commissionPct', e.target.value)} />
            </Field>
            <Field label="Request platform fee (%)" htmlFor="st-req" error={errors.requestFeePct}>
              <Input id="st-req" type="number" step={0.5} value={draft.requestFeePct} onChange={(e) => set('requestFeePct', e.target.value)} />
            </Field>
            <Field label="Cash on delivery fee (%)" htmlFor="st-cod" error={errors.codFeePct}>
              <Input id="st-cod" type="number" step={0.5} value={draft.codFeePct} onChange={(e) => set('codFeePct', e.target.value)} />
            </Field>
            <Field label="USD rate (৳ per $1)" htmlFor="st-usd" error={errors.usdRate}>
              <Input id="st-usd" type="number" step={1} value={draft.usdRate} onChange={(e) => set('usdRate', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold">“From” price rule</h2>
          <p className="-mt-2 text-sm text-muted">The lowest single-unit price across active shops for this configuration is shown on catalog cards.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color group" htmlFor="st-group">
              <NativeSelect id="st-group" value={draft.colorGroup} onChange={(e) => set('colorGroup', e.target.value)}>
                {['Light', 'Heather', 'Dark', 'Neon'].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Size" htmlFor="st-size">
              <NativeSelect id="st-size" value={draft.size} onChange={(e) => set('size', e.target.value)}>
                {APPAREL_SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Print size tier" htmlFor="st-tier">
              <NativeSelect id="st-tier" value={draft.tier} onChange={(e) => set('tier', e.target.value as SizeTier)}>
                {SIZE_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Print area" htmlFor="st-view">
              <NativeSelect id="st-view" value={draft.view} onChange={(e) => set('view', e.target.value as View)}>
                {(['front', 'back'] as View[]).map((v) => (
                  <option key={v} value={v}>
                    {VIEW_LABEL[v]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-input bg-surface-2 p-3">
              <p className="text-xs text-muted">Classic T-shirt, current</p>
              <p className="font-display text-lg font-bold">{teeFrom ? <>from <MoneyText value={teeFrom.price} /></> : 'No active shop'}</p>
            </div>
            <div className="rounded-input bg-surface-2 p-3">
              <p className="text-xs text-muted">Hoodie, current</p>
              <p className="font-display text-lg font-bold">{hoodieFrom ? <>from <MoneyText value={hoodieFrom.price} /></> : 'No active shop'}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-end gap-2 border-t border-border bg-surface/95 p-3 backdrop-blur md:static md:mt-5 md:border-0 md:bg-transparent md:p-0">
        <Button variant="secondary" disabled={!dirty} onClick={() => setDraft(toDraft(settings))}>
          <RotateCcw className="h-4 w-4" /> Discard
        </Button>
        <Button onClick={save} disabled={!dirty}>
          <Save className="h-4 w-4" /> Save settings
        </Button>
      </div>
    </div>
  );
}
