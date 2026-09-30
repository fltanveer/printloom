'use client';
import * as React from 'react';
import { Field } from '@/components/ui/input';
import { NumInput, Section, type Mutate } from './fields';
import { PrintPricingTable } from './PrintPricingTable';
import { QtyTierEditor } from './QtyTierEditor';
import type { BaseProduct, Offering } from '@/lib/types';

/** Pricing tab: every layer of section 7.2 to 7.5 for one offering draft. */
export function PriceRuleEditor({ draft, product, mutate }: { draft: Offering; product: BaseProduct; mutate: Mutate }) {
  const p = draft.pricing;
  const groups = draft.colorGroups.map((g) => g.name);
  const hasScreen = draft.methods.includes('screen');
  const hasEmb = draft.methods.includes('embroidery');
  const hasDark = draft.methods.some((m) => m === 'DTG' || m === 'DTF');
  return (
    <div className="space-y-4">
      <Section title="Garment price" hint="Base price for the blank, before print. Size and color upcharges add on top.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Base price" error={p.basePrice > 0 ? null : 'Must be above 0'}>
            <NumInput value={p.basePrice} min={1} prefix="৳" onChange={(v) => mutate((o) => void (o.pricing.basePrice = v ?? 0))} aria-label="Base price" />
          </Field>
          <Field label="Minimum order (pieces)" hint="Below this, customers see your shop as unavailable with the reason.">
            <NumInput value={p.moq} min={1} onChange={(v) => mutate((o) => void (o.pricing.moq = Math.max(0, Math.round(v ?? 0))))} aria-label="Minimum order" />
          </Field>
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Size upcharges" hint="Added to the base price for bigger sizes.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {product.sizes.map((s) => (
              <Field key={s} label={s} error={(p.sizeUpcharge[s] ?? 0) < 0 ? 'No negatives' : null}>
                <NumInput
                  value={p.sizeUpcharge[s] ?? 0}
                  prefix="+৳"
                  className="pl-9"
                  onChange={(v) =>
                    mutate((o) => {
                      if (!v) delete o.pricing.sizeUpcharge[s];
                      else o.pricing.sizeUpcharge[s] = v;
                    })
                  }
                  aria-label={`${s} upcharge`}
                />
              </Field>
            ))}
          </div>
        </Section>
        <Section title="Color group upcharges" hint="Dark colors usually cost more to print on.">
          <div className="grid grid-cols-2 gap-2">
            {groups.map((g) => (
              <Field key={g} label={g} error={(p.colorGroupUpcharge[g] ?? 0) < 0 ? 'No negatives' : null}>
                <NumInput value={p.colorGroupUpcharge[g] ?? 0} prefix="+৳" className="pl-9" onChange={(v) => mutate((o) => void (o.pricing.colorGroupUpcharge[g] = v ?? 0))} aria-label={`${g} upcharge`} />
              </Field>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Print prices" hint="Per piece, per decorated area. The size is picked automatically from the customer's artwork.">
        <PrintPricingTable draft={draft} product={product} mutate={mutate} />
      </Section>

      <Section title="Print extras">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Dark garment upcharge (DTG, DTF)" hint={hasDark ? 'Per area, covers the white underbase.' : 'Only used with DTG or DTF.'}>
            <NumInput value={p.darkGarmentPrintUpcharge} min={0} prefix="৳" onChange={(v) => mutate((o) => void (o.pricing.darkGarmentPrintUpcharge = v ?? 0))} aria-label="Dark garment upcharge" />
          </Field>
          <Field label="Extra area fee" hint="Added for every print area after the first.">
            <NumInput value={p.extraAreaFee} min={0} prefix="৳" onChange={(v) => mutate((o) => void (o.pricing.extraAreaFee = v ?? 0))} aria-label="Extra area fee" />
          </Field>
          <Field label="Screen: per ink color" hint={hasScreen ? 'Per area, per piece.' : 'Add screen print in Basics to use this.'}>
            <NumInput value={p.screen.perInkColor} min={0} prefix="৳" onChange={(v) => mutate((o) => void (o.pricing.screen.perInkColor = v ?? 0))} aria-label="Per ink color" />
          </Field>
          <Field label="Screen: setup per screen" hint="One time per order line, not per piece.">
            <NumInput value={p.screen.setupFeePerScreen} min={0} prefix="৳" onChange={(v) => mutate((o) => void (o.pricing.screen.setupFeePerScreen = v ?? 0))} aria-label="Setup per screen" />
          </Field>
        </div>
      </Section>

      <Section title="Embroidery" hint={hasEmb ? 'Priced by stitch count, estimated from the artwork size.' : 'Add embroidery in Basics to use these prices.'}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              ['upTo5k', 'Up to 5k stitches'],
              ['upTo10k', 'Up to 10k stitches'],
              ['upTo15k', 'Up to 15k stitches'],
              ['digitizingFee', 'Digitizing (one time)'],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label}>
              <NumInput value={p.embroidery[k]} min={0} prefix="৳" onChange={(v) => mutate((o) => void (o.pricing.embroidery[k] = v ?? 0))} aria-label={label} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Quantity discounts" hint="Counts every size of the same design in one order.">
        <QtyTierEditor tiers={p.qtyTiers} mutate={mutate} />
      </Section>
    </div>
  );
}
