'use client';
import * as React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { Avatar, SafeImage } from '@/components/shared/bits';
import { DIVISIONS } from './helpers';
import type { Division, Vendor } from '@/lib/types';

export const COVERS = ['/stock/vendor-dhaka.jpg', '/stock/vendor-ctg.jpg', '/stock/vendor-sylhet.jpg', '/stock/vendor-bulk.jpg', '/stock/hero.jpg', '/stock/team.jpg'];
export const LOGO_COLORS = [
  { name: 'Tangerine', hex: '#FF7A1A' },
  { name: 'Violet', hex: '#6D4AFF' },
  { name: 'Pink', hex: '#FF3D8B' },
  { name: 'Teal', hex: '#0FB5A6' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Ink', hex: '#1B1340' },
];

export interface ProfileValues {
  shopName: string;
  logo: string;
  logoColor: string;
  cover: string;
  about: string;
}

export function profileOf(v: Vendor): ProfileValues {
  return { shopName: v.shopName, logo: v.logo, logoColor: v.logoColor, cover: v.cover, about: v.about };
}

export function ShopProfileForm({ initial, onSave, saveLabel = 'Save profile', onCancel }: { initial: ProfileValues; onSave: (v: ProfileValues) => void; saveLabel?: string; onCancel?: () => void }) {
  const [v, setV] = React.useState(initial);
  const set = (p: Partial<ProfileValues>) => setV((x) => ({ ...x, ...p }));
  const nameErr = v.shopName.trim().length < 3 ? 'At least 3 characters' : null;
  const logoErr = !v.logo.trim() ? 'Add 1 to 3 letters' : null;
  const aboutErr = v.about.trim().length < 20 ? 'Tell customers a little more (20+ characters)' : null;
  const ok = !nameErr && !logoErr && !aboutErr;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSave({ ...v, shopName: v.shopName.trim(), logo: v.logo.trim().toUpperCase(), about: v.about.trim() });
      }}
    >
      <div className="overflow-hidden rounded-card border border-border">
        <SafeImage src={v.cover} alt="Shop cover preview" className="h-28 w-full" />
        <div className="flex items-center gap-3 p-3">
          <Avatar name={v.shopName || 'Shop'} src={v.logo || undefined} color={v.logoColor} size={48} square />
          <div className="min-w-0">
            <div className="truncate font-display font-semibold">{v.shopName || 'Your shop name'}</div>
            <div className="line-clamp-1 text-xs text-muted">{v.about || 'A short line about your shop'}</div>
          </div>
        </div>
      </div>
      <Field label="Shop name" error={nameErr}>
        <Input value={v.shopName} onChange={(e) => set({ shopName: e.target.value })} maxLength={40} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Logo letters" error={logoErr}>
          <Input value={v.logo} onChange={(e) => set({ logo: e.target.value.slice(0, 3) })} maxLength={3} className="uppercase" />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-medium">Logo color</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Logo color">
            {LOGO_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={v.logoColor === c.hex}
                aria-label={c.name}
                title={c.name}
                onClick={() => set({ logoColor: c.hex })}
                className={cn('grid h-11 w-11 place-items-center rounded-full', v.logoColor === c.hex && 'ring-2 ring-accent ring-offset-2 ring-offset-surface')}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: c.hex }}>
                  {v.logoColor === c.hex ? <Check className="h-4 w-4 text-white" /> : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium">Cover photo</span>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Cover photo">
          {COVERS.map((c, i) => (
            <button key={c} type="button" role="radio" aria-checked={v.cover === c} aria-label={`Cover ${i + 1}`} onClick={() => set({ cover: c })} className={cn('overflow-hidden rounded-input border-2', v.cover === c ? 'border-accent' : 'border-transparent')}>
              <SafeImage src={c} alt="" className="h-16 w-full" />
            </button>
          ))}
        </div>
      </div>
      <Field label="About your shop" error={aboutErr} hint="What you print best, where you are, why people come back.">
        <Textarea value={v.about} onChange={(e) => set({ about: e.target.value })} maxLength={280} />
      </Field>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={!ok}>
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}

export function LocationForm({ initial, onSave }: { initial: { division: Division; city: string }; onSave: (v: { division: Division; city: string }) => void }) {
  const [division, setDivision] = React.useState<Division>(initial.division);
  const [city, setCity] = React.useState(initial.city);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (city.trim().length >= 2) onSave({ division, city: city.trim() });
      }}
    >
      <Field label="Division">
        <NativeSelect value={division} onChange={(e) => setDivision(e.target.value as Division)}>
          {DIVISIONS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="City" hint="Same city customers get your cheapest, fastest delivery." error={city.trim().length < 2 ? 'Enter your city' : null}>
        <Input value={city} onChange={(e) => setCity(e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={city.trim().length < 2}>
          Save location
        </Button>
      </div>
    </form>
  );
}

export function PayoutMethodForm({ initial, onSave }: { initial: string | null; onSave: (v: string) => void }) {
  const methods = ['bKash', 'Nagad', 'Bank'];
  const [method, setMethod] = React.useState(methods.find((m) => (initial ?? '').toLowerCase().startsWith(m.toLowerCase())) ?? 'bKash');
  const [account, setAccount] = React.useState((initial ?? '').replace(/^(bkash|nagad|bank:?)\s*/i, ''));
  const ok = account.trim().length >= 4;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSave(method === 'Bank' ? `Bank: ${account.trim()}` : `${method} ${account.trim()}`);
      }}
    >
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payout method">
        {methods.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={cn('h-11 rounded-input border text-sm font-semibold', method === m ? 'border-accent bg-accent-soft text-accent-text' : 'border-border')}>
            {m}
          </button>
        ))}
      </div>
      <Field label={method === 'Bank' ? 'Bank and account number' : `${method} number`} error={account && !ok ? 'Check the number' : null}>
        <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder={method === 'Bank' ? 'City Bank ****2231' : '01711-000111'} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={!ok}>
          Save payout method
        </Button>
      </div>
    </form>
  );
}
