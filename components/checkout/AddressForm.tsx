'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, NativeSelect } from '@/components/ui/input';
import type { Address, Division } from '@/lib/types';
import { DIVISION_CITIES, DIVISIONS } from './helpers';

type Draft = Omit<Address, 'id'>;

/** Add a new address with division, city and area selectors. */
export function AddressForm({ defaults, onSave, onCancel }: { defaults: { name: string; phone: string }; onSave: (a: Draft) => void; onCancel: () => void }) {
  const [d, setD] = React.useState<Draft>({ label: 'Home', name: defaults.name, phone: defaults.phone, division: 'Dhaka', city: 'Dhaka', area: '', line: '' });
  const [tried, setTried] = React.useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const errors = {
    name: d.name.trim() ? null : 'Add a name for the courier',
    phone: /^01\d{3}-?\d{6}$/.test(d.phone.trim()) ? null : 'Use a Bangladeshi mobile number, like 01712-345678',
    area: d.area.trim() ? null : 'Add your area, like Dhanmondi',
    line: d.line.trim() ? null : 'Add house and road',
  };
  const valid = Object.values(errors).every((e) => !e);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (valid) onSave({ ...d, name: d.name.trim(), phone: d.phone.trim(), area: d.area.trim(), line: d.line.trim() });
      }}
    >
      <Field label="Label" htmlFor="addr-label">
        <NativeSelect id="addr-label" value={d.label} onChange={(e) => set('label', e.target.value)}>
          {['Home', 'Office', 'Other'].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Full name" htmlFor="addr-name" error={tried ? errors.name : null}>
        <Input id="addr-name" value={d.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
      </Field>
      <Field label="Phone" htmlFor="addr-phone" error={tried ? errors.phone : null}>
        <Input id="addr-phone" value={d.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" autoComplete="tel" />
      </Field>
      <Field label="Division" htmlFor="addr-division">
        <NativeSelect
          id="addr-division"
          value={d.division}
          onChange={(e) => {
            const div = e.target.value as Division;
            setD((x) => ({ ...x, division: div, city: DIVISION_CITIES[div][0] }));
          }}
        >
          {DIVISIONS.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="City" htmlFor="addr-city">
        <NativeSelect id="addr-city" value={d.city} onChange={(e) => set('city', e.target.value)}>
          {DIVISION_CITIES[d.division].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Area" htmlFor="addr-area" error={tried ? errors.area : null}>
        <Input id="addr-area" value={d.area} onChange={(e) => set('area', e.target.value)} placeholder="Dhanmondi" />
      </Field>
      <Field label="House, road, flat" htmlFor="addr-line" error={tried ? errors.line : null} className="sm:col-span-2">
        <Input id="addr-line" value={d.line} onChange={(e) => set('line', e.target.value)} placeholder="House 12, Road 7A" autoComplete="street-address" />
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save address</Button>
      </div>
    </form>
  );
}
