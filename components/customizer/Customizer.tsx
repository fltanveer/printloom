'use client';
// Product page and customizer (hero screen, spec C6). Desktop: tools | canvas | config.
// Mobile: canvas on top, tools as a bottom tab strip, config in a sheet with a sticky price bar.

import * as React from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronLeft, Eye, ImageUp, Layers, Palette, Pencil, Redo2, SlidersHorizontal, Store, Type, Undo2, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { MOCKUP_H, MOCKUP_W } from '@/lib/mockups';
import type { BaseProduct } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton, Kbd } from '@/components/ui/misc';
import { Tip } from '@/components/ui/tooltip';
import { Dialog, SheetContent } from '@/components/ui/dialog';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { EmptyState, useFakeLoading } from '@/components/shared/bits';
import { CustomizerProvider, initialDraft, useCustomizer, useCustomizerModel, type SplitPlan } from './model';
import { cleanBreakdown, layerName, round3 } from './draft';
import { PrintAreaTabs } from './PrintAreaTabs';
import { UploadTool, useUpload, type UploadState } from './UploadTool';
import { TextTool } from './TextTool';
import { LibraryTool } from './LibraryTool';
import { LayersPanel } from './LayersPanel';
import { ConfigPanel, type Gates } from './ConfigPanel';
import { VendorChooserSheet } from './VendorChooserSheet';
import { PreviewModal } from './PreviewModal';

const CanvasStage = dynamic(() => import('./CanvasStage'), {
  ssr: false,
  loading: () => <Skeleton className="mx-auto aspect-[5/6] w-full max-w-[420px]" />,
});

type Tool = 'upload' | 'text' | 'designs' | 'layers';
const TOOLS: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upload', label: 'Upload', icon: ImageUp },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'designs', label: 'Designs', icon: Palette },
  { id: 'layers', label: 'Layers', icon: Layers },
];

function useIsDesktop() {
  const [d, setD] = React.useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setD(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return d;
}

function useViewportHeight() {
  const [h, setH] = React.useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800));
  React.useEffect(() => {
    const on = () => setH(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
}

export function Customizer({ productId }: { productId: string }) {
  const product = useStore((s) => s.products[productId]);
  const loading = useFakeLoading(400);
  if (!product)
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          kind="search"
          title="Product not found"
          body="This product is not in the catalog anymore. Pick another one to start designing."
          action={
            <Button asChild>
              <Link href="/catalog">Browse products</Link>
            </Button>
          }
        />
      </div>
    );
  if (loading) return <CustomizerSkeleton />;
  return <Loaded product={product} />;
}

function CustomizerSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1600px] gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)_380px]" aria-busy="true" aria-label="Loading the customizer">
      <Skeleton className="hidden h-[70vh] lg:block" />
      <Skeleton className="aspect-[5/6] w-full lg:aspect-auto lg:h-[70vh]" />
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

function Loaded({ product }: { product: BaseProduct }) {
  const params = useSearchParams();
  const [init] = React.useState(() => {
    const st = useStore.getState();
    return initialDraft(st, product, new URLSearchParams(params?.toString() ?? ''), st.personas.customer);
  });
  React.useEffect(() => {
    init.notices.forEach((n) => toast(n));
  }, [init]);
  const model = useCustomizerModel(product, init);
  return (
    <CustomizerProvider value={model}>
      <Shell initialTool={init.draft.customization.layers.length ? 'layers' : 'designs'} />
    </CustomizerProvider>
  );
}

function Shell({ initialTool }: { initialTool: Tool }) {
  const m = useCustomizer();
  const { product, draft, undo, redo, canUndo, canRedo, selectedId, setSelectedId, patchLayer, setLayers, quote, effective, warnings, hasContent, blockReasons, editLine, customerId, colorHex, state } = m;
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const vh = useViewportHeight();
  const reduce = useReducedMotion();
  const upload = useUpload();
  const addToCart = useStore((s) => s.addToCart);
  const updateCartLine = useStore((s) => s.updateCartLine);

  const [tool, setTool] = React.useState<Tool>(initialTool);
  const [mobileTool, setMobileTool] = React.useState<Tool | null>(null);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [acceptedLowQuality, setAcceptedLowQuality] = React.useState(!!editLine?.acceptedLowQuality);
  const [oobConfirmed, setOobConfirmed] = React.useState(false);
  const [ackKey, setAckKey] = React.useState<string | null>(null);
  const [fly, setFly] = React.useState<{ from: DOMRect; to: DOMRect; key: number } | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const gates: Gates = { acceptedLowQuality, setAcceptedLowQuality, oobConfirmed, setOobConfirmed };
  const serious = warnings.filter((w) => w.level !== 'info');
  const warnKey = serious.map((w) => w.id).join('|');
  const hasRed = warnings.some((w) => w.kind === 'dpi' && w.level === 'red');
  const hasOob = warnings.some((w) => w.kind === 'bounds');
  const hardBlock = !hasContent ? 'Add a design, image or text first' : !quote ? (m.coverage.noSingleShop ? 'No single shop has all these sizes' : draft.pinnedOfferingId || draft.lockVendorId ? blockReasons[0] ?? 'This shop cannot make this yet' : 'No shop can make this yet, check the shop section') : null;
  const gateBlock = hasRed && !acceptedLowQuality ? 'Tick "I accept lower print quality" first' : hasOob && !oobConfirmed ? 'Fix or confirm the parts outside the print area' : null;
  const disabledReason = hardBlock ?? gateBlock;
  const needsReview = serious.length > 0 && ackKey !== warnKey;
  const ctaLabel = editLine ? 'Update cart line' : 'Add to cart';
  const shopName = effective?.vendor.shopName;

  // switch the tools pane to Text when a text layer gets selected
  React.useEffect(() => {
    const l = draft.customization.layers.find((x) => x.id === selectedId);
    if (l?.kind === 'text') {
      setTool((t) => (t === 'layers' ? t : 'text'));
      setMobileTool((t) => (t && t !== 'layers' ? 'text' : t));
    }
  }, [selectedId, draft.customization.layers]);

  // tier crossing toast (14.1)
  const tierPct = quote?.tier?.discountPct ?? 0;
  const prevTier = React.useRef<{ pct: number; off: string | undefined } | null>(null);
  React.useEffect(() => {
    const p = prevTier.current;
    if (p && p.off === quote?.offeringId && tierPct > p.pct) toast.success(`${tierPct}% bulk discount applied`, { description: 'The price per piece just dropped.' });
    prevTier.current = { pct: tierPct, off: quote?.offeringId };
  }, [tierPct, quote?.offeringId]);

  // keyboard: undo / redo, nudge, delete, escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (document.querySelector('[role="dialog"]')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !typing && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && !typing && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (typing || !selectedId) return;
      const l = draft.customization.layers.find((x) => x.id === selectedId);
      if (!l) return;
      const step = e.shiftKey ? 1 : 0.1;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        if (l.locked) {
          toast('This layer is locked', { description: 'Unlock it in Layers to move it.' });
          return;
        }
        const [dx, dy] = moves[e.key];
        patchLayer(l.id, { x: round3(l.x + dx), y: round3(l.y + dy) }, { coalesce: `nudge-${l.id}` });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setLayers((ls) => ls.filter((x) => x.id !== l.id));
        setSelectedId(null);
        toast(`${layerName(l, state.designs)} removed`, { description: 'Press Ctrl+Z to bring it back.' });
      } else if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedId, draft.customization.layers, patchLayer, setLayers, setSelectedId, state.designs]);

  const flyToCart = () => {
    if (reduce) return;
    const from = canvasRef.current?.getBoundingClientRect();
    const to = document.getElementById('cart-icon')?.getBoundingClientRect();
    if (!from || !to || !to.width) return;
    setFly({ from, to, key: Date.now() });
  };

  const lineBase = () => ({
    customization: JSON.parse(JSON.stringify(draft.customization)) as typeof draft.customization,
    method: draft.method,
    rush: draft.rush,
    acceptedLowQuality: warnings.some((w) => w.kind === 'dpi'),
  });

  const commit = () => {
    if (!effective || hardBlock) {
      toast.error(hardBlock ?? 'No shop can make this yet');
      return;
    }
    const line = { ...lineBase(), offeringId: effective.offering.id, sizeBreakdown: cleanBreakdown(draft.sizeBreakdown) };
    setPreviewOpen(false);
    setConfigOpen(false);
    if (editLine) {
      updateCartLine(customerId, editLine.id, line);
      toast.success('Cart line updated', { description: `${effective.quote.qty} x ${product.name} from ${effective.vendor.shopName}` });
      router.push('/cart');
      return;
    }
    addToCart(customerId, line);
    flyToCart();
    toast.success('Added to cart', {
      description: `${effective.quote.qty} x ${product.name} from ${effective.vendor.shopName}`,
      action: { label: 'View cart', onClick: () => router.push('/cart') },
    });
  };

  const onPrimary = () => {
    if (disabledReason) {
      toast(disabledReason);
      return;
    }
    if (needsReview) {
      setPreviewOpen(true);
      return;
    }
    commit();
  };

  const onSplit = (plan: SplitPlan) => {
    if (!hasContent) return toast('Add a design, image or text first');
    if (gateBlock) return toast.error(gateBlock);
    for (const p of plan.parts) addToCart(customerId, { ...lineBase(), rush: false, offeringId: p.offeringId, sizeBreakdown: p.sizes });
    flyToCart();
    toast.success('Added as two cart lines', { description: `${plan.parts.map((p) => p.vendorName).join(' and ')}, two deliveries.`, action: { label: 'View cart', onClick: () => router.push('/cart') } });
  };

  const onAck = (v: boolean) => {
    setAckKey(v ? warnKey : null);
    if (v) {
      if (hasRed) setAcceptedLowQuality(true);
      if (hasOob) setOobConfirmed(true);
    }
  };

  const canvasMax = isDesktop ? Math.max(340, vh - 113 - 250) : mobileTool ? Math.max(180, vh * 0.58 - 300) : Math.max(300, vh * 0.52);
  const canvas = (
    <div ref={canvasRef} className="relative">
      <CanvasStage
        product={product}
        colorHex={colorHex}
        view={m.view}
        layers={draft.customization.layers}
        designs={state.designs}
        areas={m.areas}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onPatch={patchLayer}
        onDropFiles={(files) => void upload.handleFiles(files)}
        maxHeight={canvasMax}
      />
      {!hasContent ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-muted shadow-s1 backdrop-blur">Drop an image here, or pick a tool to start</span>
        </div>
      ) : null}
    </div>
  );

  const toolContent = (t: Tool) => (t === 'upload' ? <UploadTool upload={upload} /> : t === 'text' ? <TextTool /> : t === 'designs' ? <LibraryTool /> : <LayersPanel compact={!isDesktop} />);

  const ctaButton = (full?: boolean) => (
    <Tip content={disabledReason}>
      <span className={cn(full && 'flex-1')}>
        <Button size="lg" className={cn(full && 'w-full')} disabled={!!hardBlock} aria-disabled={!!disabledReason} onClick={onPrimary}>
          {ctaLabel}
        </Button>
      </span>
    </Tip>
  );

  const topBar = (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="icon" aria-label="Back to catalog">
        <Link href={`/catalog?category=${product.category}`}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-bold sm:text-xl">{product.name}</h1>
        <p className="hidden truncate text-xs text-muted sm:block">{product.description}</p>
      </div>
      <Tip content="Undo (Ctrl+Z)">
        <span>
          <Button variant="ghost" size="icon" aria-label="Undo" disabled={!canUndo} onClick={undo}>
            <Undo2 className="h-5 w-5" />
          </Button>
        </span>
      </Tip>
      <Tip content="Redo (Ctrl+Shift+Z)">
        <span>
          <Button variant="ghost" size="icon" aria-label="Redo" disabled={!canRedo} onClick={redo}>
            <Redo2 className="h-5 w-5" />
          </Button>
        </span>
      </Tip>
      <Button variant="secondary" size={isDesktop ? 'md' : 'icon'} onClick={() => setPreviewOpen(true)} aria-label="Preview">
        <Eye className="h-4 w-4" />
        {isDesktop ? 'Preview' : null}
      </Button>
    </div>
  );

  const banners = (
    <div className="space-y-2">
      {draft.lockVendorId ? <LockBanner /> : null}
      {editLine ? (
        <div className="flex flex-wrap items-center gap-2 rounded-input border border-info/30 bg-info/10 px-3 py-2 text-sm">
          <Pencil className="h-4 w-4 text-info" />
          <span className="flex-1">You are editing a cart line. Saving replaces it in your cart.</span>
          <Button asChild variant="link" size="sm">
            <Link href="/cart">Back to cart</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );

  const modals = (
    <>
      <VendorChooserSheet />
      <PreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        product={product}
        colorHex={colorHex}
        colorName={draft.customization.color}
        layers={draft.customization.layers}
        warnings={warnings}
        acked={ackKey === warnKey}
        onAck={onAck}
        onConfirm={commit}
        ctaLabel={ctaLabel}
        ctaDisabledReason={hardBlock}
      />
      {fly && typeof document !== 'undefined'
        ? createPortal(
            <motion.div
              key={fly.key}
              className="pointer-events-none fixed z-[200] w-32 rounded-card bg-surface p-1 shadow-s3"
              style={{ left: fly.from.left + fly.from.width / 2 - 64, top: fly.from.top + fly.from.height / 2 - 77 }}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ x: fly.to.left + fly.to.width / 2 - (fly.from.left + fly.from.width / 2), y: fly.to.top + fly.to.height / 2 - (fly.from.top + fly.from.height / 2), scale: 0.12, opacity: 0.5 }}
              transition={{ duration: 0.7, ease: [0.5, 0, 0.2, 1] }}
              onAnimationComplete={() => setFly(null)}
            >
              <MockupRenderer product={product} colorHex={colorHex} view={m.view} layers={draft.customization.layers} />
            </motion.div>,
            document.body,
          )
        : null}
    </>
  );

  if (isDesktop) {
    return (
      <div className="grid h-[calc(100vh-113px)] grid-cols-[320px_minmax(0,1fr)_400px] xl:grid-cols-[340px_minmax(0,1fr)_420px]">
        <aside className="flex min-h-0 flex-col border-r border-border bg-surface" aria-label="Design tools">
          <div className="grid grid-cols-4 gap-1 border-b border-border p-2" role="tablist" aria-label="Tools">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tool === t.id}
                onClick={() => setTool(t.id)}
                className={cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-input text-xs font-medium transition-colors', tool === t.id ? 'bg-accent-soft text-accent-text' : 'text-muted hover:bg-surface-2 hover:text-text')}
              >
                <t.icon className="h-5 w-5" />
                {t.label}
                {t.id === 'layers' && draft.customization.layers.length ? <span className="sr-only">, {draft.customization.layers.length} layers</span> : null}
              </button>
            ))}
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">{toolContent(tool)}</div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto p-4 xl:p-5">
          {topBar}
          {banners}
          <div className="flex justify-center">
            <PrintAreaTabs />
          </div>
          <div className="flex flex-1 items-start justify-center">
            <div className="w-full">{canvas}</div>
          </div>
          <p className="text-center text-xs text-muted">
            Drag to move, corners to resize and rotate. <Kbd>Arrows</Kbd> nudge, <Kbd>Shift</Kbd> for bigger steps, <Kbd>Del</Kbd> removes, <Kbd>Ctrl Z</Kbd> undoes.
          </p>
        </main>

        <aside className="flex min-h-0 flex-col border-l border-border bg-surface" aria-label="Options and price">
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 xl:p-5">
            <ConfigPanel gates={gates} onSplit={onSplit} />
          </div>
          <div className="border-t border-border bg-surface p-4">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-xs text-muted">{quote ? `${quote.qty} ${quote.qty === 1 ? 'piece' : 'pieces'}${shopName ? ` from ${shopName}` : ''}` : 'Total'}</div>
                {quote ? <MoneyText value={quote.lineTotal} animated className="font-display text-2xl font-bold" /> : <span className="font-display text-2xl font-bold text-muted">...</span>}
              </div>
              {quote ? (
                <div className="text-right text-xs text-muted">
                  <MoneyText value={quote.unitAvg} animated className="font-semibold text-text" /> each
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="lg" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4" /> Preview
              </Button>
              {ctaButton(true)}
            </div>
            {disabledReason ? <p className="mt-2 text-center text-xs text-muted">{disabledReason}</p> : null}
          </div>
        </aside>
        {modals}
      </div>
    );
  }

  // ---------- mobile ----------
  return (
    <div className="pb-[148px]">
      <div className="space-y-3 px-3 pt-3">
        {topBar}
        {banners}
        <div className="flex justify-center">
          <PrintAreaTabs />
        </div>
        {canvas}
        <button type="button" onClick={() => setConfigOpen(true)} className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-3 text-left shadow-s1">
          <SlidersHorizontal className="h-5 w-5 text-accent-text" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              {draft.customization.color}, {m.qty} {m.qty === 1 ? 'piece' : 'pieces'}
            </span>
            <span className="block truncate text-xs text-muted">{shopName ? `${shopName}, tap to change color, size, method and shop` : blockReasons[0] ?? 'Tap to pick options'}</span>
          </span>
          <span className="text-sm font-semibold text-accent-text">Options</span>
        </button>
      </div>

      <AnimatePresence>
        {mobileTool ? (
          <motion.div
            key="drawer"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-[124px] z-40 max-h-[34vh] overflow-y-auto rounded-t-sheet border-t border-border bg-surface p-4 pt-3 shadow-s3"
            role="region"
            aria-label={`${TOOLS.find((t) => t.id === mobileTool)?.label} tool`}
          >
            <div className="mb-2 flex justify-end">
              <Button variant="ghost" size="icon-sm" aria-label="Close tool" onClick={() => setMobileTool(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {toolContent(mobileTool)}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface backdrop-blur-md">
        <div className="grid grid-cols-5 border-b border-border" role="tablist" aria-label="Tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mobileTool === t.id}
              onClick={() => {
                setMobileTool((cur) => (cur === t.id ? null : t.id));
                window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
              }}
              className={cn('flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium', mobileTool === t.id ? 'text-accent-text' : 'text-muted')}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </button>
          ))}
          <button type="button" onClick={() => setConfigOpen(true)} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted">
            <SlidersHorizontal className="h-5 w-5" />
            Options
          </button>
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setConfigOpen(true)} aria-label="Open options and price">
            <span className="block text-[11px] text-muted">{quote ? `${quote.qty} pcs, ` : ''}total</span>
            {quote ? <MoneyText value={quote.lineTotal} animated className="font-display text-xl font-bold" /> : <span className="font-display text-xl font-bold text-muted">...</span>}
          </button>
          {ctaButton()}
        </div>
      </div>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <SheetContent
          title="Options and price"
          description="Color, size, method, speed and shop"
          footer={
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted">Total</div>
                {quote ? <MoneyText value={quote.lineTotal} animated className="font-display text-xl font-bold" /> : <span className="text-sm text-muted">{blockReasons[0]}</span>}
              </div>
              {ctaButton()}
            </div>
          }
        >
          <ConfigPanel gates={gates} onSplit={onSplit} />
        </SheetContent>
      </Dialog>
      {modals}
    </div>
  );
}

function LockBanner() {
  const { draft, state, unlock, product } = useCustomizer();
  const v = draft.lockVendorId ? state.vendors[draft.lockVendorId] : null;
  if (!v) return null;
  const hasOffering = Object.values(state.offerings).some((o) => o.vendorId === v.id && o.productId === product.id && o.status === 'active');
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-input border border-customer/30 bg-accent-soft px-3 py-2 text-sm">
      <Store className="h-4 w-4 text-accent-text" />
      <span className="min-w-0 flex-1">
        {hasOffering ? (
          <>
            Designing with <Link href={`/shop/${v.id}`} className="font-semibold underline-offset-2 hover:underline">{v.shopName}</Link>. Only their colors, sizes and methods are shown.
          </>
        ) : (
          <>
            <strong>{v.shopName}</strong> doesn&apos;t make {product.name.toLowerCase()}s right now.
          </>
        )}
      </span>
      <Button variant="link" size="sm" onClick={unlock}>
        Compare other shops
      </Button>
    </div>
  );
}

export type { UploadState };
export const MOCKUP_RATIO = MOCKUP_W / MOCKUP_H;
