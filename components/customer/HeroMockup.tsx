'use client';
import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { COLORS } from '@/lib/seed';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { cn } from '@/components/ui/cn';
import { fitDesignLayer } from './shopPricing';

const SLIDES: { productId: string; color: keyof typeof COLORS; designId: string }[] = [
  { productId: 'p_tee', color: 'Black', designId: 'ds_19' },
  { productId: 'p_hoodie', color: 'Cream', designId: 'ds_22' },
  { productId: 'p_mug', color: 'White', designId: 'ds_20' },
  { productId: 'p_tote', color: 'Natural', designId: 'ds_21' },
  { productId: 'p_jersey', color: 'White', designId: 'ds_25' },
  { productId: 'p_case', color: 'Navy', designId: 'ds_27' },
];

/** Hero: one design morphing across products, cycling every 2.5 s. Stops auto-cycling with reduced motion. */
export function HeroMockup({ className }: { className?: string }) {
  const products = useStore((s) => s.products);
  const designs = useStore((s) => s.designs);
  const reduce = useReducedMotion();
  const [i, setI] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const slides = React.useMemo(() => {
    const fallback = Object.values(designs)
      .filter((d) => d.status === 'published' && !d.isPrivate)
      .sort((a, b) => b.uses - a.uses);
    return SLIDES.filter((s) => products[s.productId]).map((s, k) => {
      const d = designs[s.designId]?.status === 'published' ? designs[s.designId] : fallback[k % Math.max(1, fallback.length)];
      return { ...s, product: products[s.productId], design: d };
    });
  }, [products, designs]);

  React.useEffect(() => {
    if (reduce || paused || slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 2500);
    return () => clearInterval(t);
  }, [reduce, paused, slides.length]);

  if (!slides.length) return null;
  const cur = slides[i % slides.length];
  const layer = cur.design ? fitDesignLayer(cur.product, cur.design, undefined, 1) : null;

  return (
    <div className={cn('relative', className)} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-customer/40 via-designer/30 to-vendor/30 blur-3xl" aria-hidden />
      <div className="relative aspect-[5/6] w-full">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={i}
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0, scale: 0.92, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.05, rotate: 4 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: 'easeOut' }}
          >
            <MockupRenderer product={cur.product} colorHex={COLORS[cur.color]} layers={layer ? [layer] : []} label={`${cur.design?.title ?? 'Design'} on a ${cur.color} ${cur.product.name}`} className="drop-shadow-2xl" />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="relative mt-2 flex flex-col items-center gap-2">
        <div className="rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold shadow-s2 backdrop-blur" aria-live="polite">
          {cur.design?.title ?? 'Your design'} on {cur.product.name}
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Choose a product preview">
          {slides.map((s, k) => (
            <button
              key={s.productId}
              type="button"
              role="tab"
              aria-selected={k === i}
              aria-label={`Show ${s.product.name}`}
              onClick={() => setI(k)}
              className="grid h-11 w-8 place-items-center"
            >
              <span className={cn('block h-2 rounded-full transition-all', k === i ? 'w-6 bg-accent' : 'w-2 bg-border')} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
