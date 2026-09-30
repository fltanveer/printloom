'use client';
// Customizer model: draft state + everything derived from the pricing engine, shared through context.

import * as React from 'react';
import { toast } from 'sonner';
import { useStore, type StoreState } from '@/lib/store';
import { buildQuoteInput, estimateInkColors, METHOD_LABEL, areasFromCustomization } from '@/lib/pricing';
import { matchVendors, type MatchResult, type UnavailableOption, type VendorOption } from '@/lib/vendorMatch';
import { colorUnion, customerAddress, matchForCustomization, methodReason, methodUnion, offeringsForProduct, quoteFor, vendorCandidates, type ColorOption } from '@/lib/selectors';
import { layerDpi, DPI_COPY } from '@/lib/dpi';
import { COLORS } from '@/lib/seed';
import type { AreaSpec, AvailableQuote, BaseProduct, CartLine, Design, Layer, Offering, PrintArea, PrintMethod, QualityTier, View } from '@/lib/types';
import { useHistory, type UpdateOptions } from './useHistory';
import { centeredBox, cleanBreakdown, isNearWhite, isVectorLayer, layerName, newLayerId, normalizeLayers, totalQty, type Draft } from './draft';

export interface Warning {
  id: string;
  level: 'red' | 'amber' | 'info';
  title: string;
  body: string;
  layerId?: string;
  kind: 'dpi' | 'bounds' | 'background' | 'inks' | 'quote';
}

export interface SplitPlan {
  parts: { offeringId: string; vendorName: string; sizes: Record<string, number>; total: number }[];
  total: number;
}

export interface CoverageInfo {
  noSingleShop: boolean;
  missingEverywhere: string[];
  split: SplitPlan | null;
  bestPartial: { offering: Offering; missing: string[] } | null;
}

export type AppState = StoreState;

export function variantOk(o: Offering, color: string, size: string, q = 1): boolean {
  const v = o.variants.find((x) => x.color === color && x.size === size);
  return !!v && v.enabled && (v.stock === 'unlimited' || v.stock >= q);
}

export function designUsable(d: Design | undefined, customerId: string): boolean {
  if (!d) return false;
  if (d.isPrivate) return d.ownerCustomerId === customerId && d.status !== 'removed';
  return d.status === 'published';
}

export function designLayerFor(d: Design, area: PrintArea): Layer {
  const aspect = d.files.widthPx / d.files.heightPx || 1;
  const box = centeredBox(area, aspect, 0.72);
  return {
    id: newLayerId(),
    kind: 'design',
    designId: d.id,
    src: d.files.src,
    printAreaId: area.id,
    ...box,
    rotation: 0,
    pxWidth: d.files.widthPx,
    pxHeight: d.files.heightPx,
    transparent: d.files.transparent,
    outOfBounds: false,
  };
}

function firstMethod(state: AppState, productId: string, color: string, lock: string | null, prefer?: PrintMethod): PrintMethod {
  const methods = methodUnion(state, productId, lock);
  if (prefer && methods.includes(prefer) && !methodReason(state, productId, color, prefer, lock)) return prefer;
  return methods.find((m) => !methodReason(state, productId, color, m, lock)) ?? methods[0] ?? state.products[productId].allowedMethods[0];
}

export function initialDraft(state: AppState, product: BaseProduct, params: URLSearchParams, customerId: string): { draft: Draft; notices: string[]; editLine: CartLine | null } {
  const notices: string[] = [];
  const editId = params.get('edit');
  if (editId) {
    const line = (state.carts[customerId] ?? []).find((l) => l.id === editId);
    if (line && line.customization.productId === product.id) {
      const c = JSON.parse(JSON.stringify(line.customization)) as Draft['customization'];
      return {
        draft: {
          customization: { ...c, layers: normalizeLayers(c.layers, product, state.designs) },
          method: line.method,
          sizeBreakdown: { ...line.sizeBreakdown },
          qtyMode: Object.keys(cleanBreakdown(line.sizeBreakdown)).length > 1 || params.get('mode') === 'bulk' ? 'bulk' : 'single',
          rush: line.rush,
          pinnedOfferingId: line.offeringId,
          lockVendorId: null,
          quality: null,
        },
        notices,
        editLine: line,
      };
    }
    notices.push('That cart line is gone, so you are starting a new design.');
  }
  const vendorParam = params.get('vendor');
  const lock = vendorParam && state.vendors[vendorParam] ? vendorParam : null;
  if (vendorParam && !lock) notices.push('That shop was not found, showing every shop.');
  const colors = colorUnion(state, product.id, lock);
  const colorParam = params.get('color');
  const color = colorParam && colors.some((c) => c.name === colorParam) ? colorParam : colors[0]?.name ?? 'White';
  if (colorParam && color !== colorParam) notices.push(`${colorParam} is not available here, showing ${color}.`);
  const method = firstMethod(state, product.id, color, lock);
  const size = product.sizes.includes('M') ? 'M' : product.sizes[0];
  const layers: Layer[] = [];
  const designParam = params.get('design');
  if (designParam) {
    const d = state.designs[designParam];
    if (designUsable(d, customerId) && d && (d.compatibleCategories.includes(product.category) || d.isPrivate)) {
      layers.push(designLayerFor(d, product.printAreas[0]));
    } else if (d && designUsable(d, customerId)) {
      layers.push(designLayerFor(d, product.printAreas[0]));
      notices.push(`${d.title} is not made for this product. Check the preview before ordering.`);
    } else notices.push('That design is no longer available.');
  }
  return {
    draft: {
      customization: { productId: product.id, color, layers: normalizeLayers(layers, product, state.designs) },
      method,
      sizeBreakdown: { [size]: 1 },
      qtyMode: params.get('mode') === 'bulk' ? 'bulk' : 'single',
      rush: false,
      pinnedOfferingId: null,
      lockVendorId: lock,
      quality: null,
    },
    notices,
    editLine: null,
  };
}

export interface Model {
  state: AppState;
  product: BaseProduct;
  customerId: string;
  draft: Draft;
  update: (fn: (d: Draft) => Draft, opts?: UpdateOptions) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  patchLayer: (id: string, patch: Partial<Layer>, opts?: UpdateOptions) => void;
  setLayers: (fn: (layers: Layer[]) => Layer[], opts?: UpdateOptions) => void;
  addLayer: (l: Layer) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  view: View;
  setView: (v: View) => void;
  activeArea: PrintArea;
  editLine: CartLine | null;
  match: MatchResult;
  effective: VendorOption | null;
  pinnedUnavailable: UnavailableOption | null;
  selectedOffering: Offering | null;
  quote: AvailableQuote | null;
  blockReasons: string[];
  areas: AreaSpec[];
  colorHex: string;
  colors: ColorOption[];
  shopCount: number;
  methods: PrintMethod[];
  qualities: QualityTier[];
  warnings: Warning[];
  visibleLayers: Layer[];
  hasContent: boolean;
  qty: number;
  inkEstimate: number;
  coverage: CoverageInfo;
  selectVendor: (offeringId: string | null) => void;
  setColor: (name: string) => void;
  setMethod: (m: PrintMethod) => void;
  unlock: () => void;
  chooserOpen: boolean;
  setChooserOpen: (o: boolean) => void;
}

const Ctx = React.createContext<Model | null>(null);
export const CustomizerProvider = Ctx.Provider;
export function useCustomizer(): Model {
  const m = React.useContext(Ctx);
  if (!m) throw new Error('useCustomizer must be used inside the customizer');
  return m;
}

export function useCustomizerModel(product: BaseProduct, init: { draft: Draft; editLine: CartLine | null }): Model {
  const state = useStore((s) => s);
  const customerId = state.personas.customer;
  const hist = useHistory<Draft>(() => init.draft);
  const draft = hist.state;
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<View>(() => {
    const first = init.draft.customization.layers[0];
    const area = first ? product.printAreas.find((a) => a.id === first.printAreaId) : null;
    return area?.view ?? product.views[0];
  });
  const [chooserOpen, setChooserOpen] = React.useState(false);
  const designs = state.designs;

  const update = hist.update;
  const setLayers = React.useCallback(
    (fn: (layers: Layer[]) => Layer[], opts?: UpdateOptions) =>
      update((d) => ({ ...d, customization: { ...d.customization, layers: normalizeLayers(fn(d.customization.layers), product, useStore.getState().designs) } }), opts),
    [update, product],
  );
  const patchLayer = React.useCallback((id: string, patch: Partial<Layer>, opts?: UpdateOptions) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)), opts), [setLayers]);
  const addLayer = React.useCallback(
    (l: Layer) => {
      setLayers((ls) => [...ls, l]);
      setSelectedId(l.id);
      const area = product.printAreas.find((a) => a.id === l.printAreaId);
      if (area) setView(area.view);
    },
    [setLayers, product],
  );

  const activeArea = product.printAreas.find((a) => a.view === view) ?? product.printAreas[0];
  const lock = draft.lockVendorId;
  const c = draft.customization;

  // ---------- vendors and quote ----------
  const derived = React.useMemo(() => {
    const addr = customerAddress(state, customerId);
    const scope = offeringsForProduct(state, product.id, { activeOnly: true }).filter((o) => !lock || o.vendorId === lock);
    const qualities = [...new Set(scope.map((o) => o.blank.qualityTier))].sort((a, b) => ['basic', 'standard', 'premium'].indexOf(a) - ['basic', 'standard', 'premium'].indexOf(b));
    const quality = draft.quality && qualities.includes(draft.quality) ? draft.quality : null;
    let match: MatchResult;
    if (!quality) match = matchForCustomization(state, customerId, c, draft.method, draft.sizeBreakdown, draft.rush, lock);
    else {
      const cands = vendorCandidates(state, product.id, lock).filter((x) => !x.offering || x.offering.blank.qualityTier === quality);
      match = matchVendors(buildQuoteInput(c, product, '', draft.method, draft.sizeBreakdown, draft.rush, state.designs), cands, product, addr, new Date());
    }
    const pinned = draft.pinnedOfferingId;
    const pinnedOpt = pinned ? match.options.find((o) => o.offering.id === pinned) ?? null : null;
    const pinnedUnavailable = pinned && !pinnedOpt ? match.unavailable.find((u) => u.offering?.id === pinned) ?? null : null;
    const effective = pinned ? pinnedOpt : match.recommended;
    const selectedOffering = (pinned ? state.offerings[pinned] : null) ?? effective?.offering ?? (lock ? scope[0] ?? null : null);
    let blockReasons: string[] = [];
    if (!effective) {
      if (pinnedUnavailable) blockReasons = pinnedUnavailable.reasons;
      else if (pinned && !state.offerings[pinned]) blockReasons = ['This shop no longer offers this product'];
      else {
        blockReasons = match.unavailable.map((u) => `${u.vendor.shopName}: ${u.reasons.slice(0, 2).join(', ')}`);
        if (!blockReasons.length) blockReasons = ['No shop can make this right now'];
      }
    }
    const colorsAll = colorUnion(state, product.id, lock);
    const qualityVendors = quality ? new Set(scope.filter((o) => o.blank.qualityTier === quality).map((o) => o.vendorId)) : null;
    const colors = qualityVendors ? colorsAll.map((x) => ({ ...x, vendorIds: x.vendorIds.filter((v) => qualityVendors.has(v)) })).filter((x) => x.vendorIds.length) : colorsAll;
    const shopCount = qualityVendors ? qualityVendors.size : new Set(scope.map((o) => o.vendorId)).size;
    return { match, pinnedUnavailable, effective, selectedOffering, blockReasons, colors, shopCount, qualities, scope, quality };
  }, [state, customerId, product, c, draft.method, draft.sizeBreakdown, draft.rush, draft.pinnedOfferingId, draft.quality, lock]);

  const methods = React.useMemo(() => methodUnion(state, product.id, lock), [state, product.id, lock]);
  const areas = React.useMemo(() => areasFromCustomization(c, product), [c, product]);
  const colorHex = derived.colors.find((x) => x.name === c.color)?.hex ?? colorUnion(state, product.id, null).find((x) => x.name === c.color)?.hex ?? (COLORS as Record<string, string>)[c.color] ?? '#FFFFFF';
  const visibleLayers = c.layers.filter((l) => !l.hidden);
  const qty = totalQty(draft.sizeBreakdown);
  const inkEstimate = React.useMemo(() => estimateInkColors({ ...c, inkColors: undefined }, designs), [c, designs]);

  // ---------- warnings (section 14.2) ----------
  const warnings = React.useMemo(() => {
    const out: Warning[] = [];
    for (const l of visibleLayers) {
      const name = layerName(l, designs);
      const { dpi, level } = layerDpi(l, isVectorLayer(l, designs));
      if (dpi !== null && level !== 'good') out.push({ id: `dpi-${l.id}-${level}`, kind: 'dpi', level: level === 'blurry' ? 'red' : 'amber', layerId: l.id, title: `${name}: ${dpi} DPI`, body: DPI_COPY[level] });
      if (l.outOfBounds) out.push({ id: `oob-${l.id}`, kind: 'bounds', level: 'amber', layerId: l.id, title: `${name} goes outside the print area`, body: 'Only the part inside the dashed box will print.' });
      if ((l.kind === 'image' || l.kind === 'design') && l.transparent === false && !isNearWhite(colorHex)) {
        out.push({ id: `bg-${l.id}`, kind: 'background', level: 'info', layerId: l.id, title: 'Your image has a background', body: 'It will print as a rectangle on this color.' });
      }
    }
    if (draft.method === 'screen' && (c.inkColors ?? inkEstimate) > 6) out.push({ id: 'inks', kind: 'inks', level: 'info', title: 'Lots of ink colors', body: 'Screen print charges per color. DTF is likely cheaper for this design.' });
    const q = derived.effective?.quote;
    q?.warnings.forEach((w, i) => out.push({ id: `q-${i}`, kind: 'quote', level: 'info', title: 'Heads up', body: w }));
    return out;
  }, [visibleLayers, designs, colorHex, draft.method, c.inkColors, inkEstimate, derived.effective]);

  // ---------- size coverage (14.1) ----------
  const coverage = React.useMemo<CoverageInfo>(() => {
    const entries = Object.entries(cleanBreakdown(draft.sizeBreakdown));
    const offs = derived.scope.filter((o) => (!derived.quality || o.blank.qualityTier === derived.quality) && o.methods.includes(draft.method) && o.colorGroups.some((g) => g.colors.some((x) => x.name === c.color)));
    const empty: CoverageInfo = { noSingleShop: false, missingEverywhere: [], split: null, bestPartial: null };
    if (!entries.length || !offs.length) return empty;
    const missing = (o: Offering) => entries.filter(([s, q]) => !variantOk(o, c.color, s, q)).map(([s]) => s);
    const missingEverywhere = entries.filter(([s, q]) => !offs.some((o) => variantOk(o, c.color, s, q))).map(([s]) => s);
    const noSingleShop = entries.length > 1 && offs.every((o) => missing(o).length > 0);
    let bestPartial: CoverageInfo['bestPartial'] = null;
    let bestCovered = -1;
    for (const o of offs) {
      const m = missing(o);
      const covered = entries.filter(([s]) => !m.includes(s)).reduce((s, [, q]) => s + q, 0);
      if (covered > bestCovered) {
        bestCovered = covered;
        bestPartial = { offering: o, missing: m };
      }
    }
    let split: SplitPlan | null = null;
    if (noSingleShop && !missingEverywhere.length) {
      for (const a of offs) {
        const sizesA = Object.fromEntries(entries.filter(([s, q]) => variantOk(a, c.color, s, q)));
        const rest = Object.fromEntries(entries.filter(([s]) => !(s in sizesA)));
        if (!Object.keys(sizesA).length || !Object.keys(rest).length) continue;
        for (const b of offs) {
          if (b.id === a.id || missing(b).some((s) => s in rest) || Object.entries(rest).some(([s, q]) => !variantOk(b, c.color, s, q))) continue;
          const qa = quoteForOffering(state, customerId, c, a, draft.method, sizesA, draft.rush);
          const qb = quoteForOffering(state, customerId, c, b, draft.method, rest, draft.rush);
          if (!qa || !qb) continue;
          const total = qa.lineTotal + qb.lineTotal;
          if (!split || total < split.total)
            split = {
              total,
              parts: [
                { offeringId: a.id, vendorName: state.vendors[a.vendorId].shopName, sizes: sizesA, total: qa.lineTotal },
                { offeringId: b.id, vendorName: state.vendors[b.vendorId].shopName, sizes: rest, total: qb.lineTotal },
              ],
            };
        }
      }
    }
    return { noSingleShop, missingEverywhere, split, bestPartial };
  }, [state, customerId, product, c, draft.method, draft.sizeBreakdown, draft.rush, derived.scope, derived.quality]);

  // ---------- actions ----------
  const selectVendor = React.useCallback(
    (offeringId: string | null) => {
      const st = useStore.getState();
      if (!offeringId) {
        update((d) => ({ ...d, pinnedOfferingId: null }));
        toast.success('Using the recommended shop', { description: 'We will keep picking the best shop as you change things.' });
        return;
      }
      const o = st.offerings[offeringId];
      if (!o) return;
      const vendor = st.vendors[o.vendorId];
      const changes: string[] = [];
      update((d) => {
        let color = d.customization.color;
        if (!o.variants.some((v) => v.color === color && v.enabled)) {
          const next = o.colorGroups.flatMap((g) => g.colors).find((x) => o.variants.some((v) => v.color === x.name && v.enabled));
          if (next) {
            changes.push(`Color changed to ${next.name}, they don't have ${color}`);
            color = next.name;
          }
        }
        let method = d.method;
        if (!o.methods.includes(method)) {
          const next = o.methods.find((m) => product.allowedMethods.includes(m) && !methodReason(st, product.id, color, m, o.vendorId)) ?? o.methods[0];
          if (next) {
            changes.push(`Print method changed to ${METHOD_LABEL[next]}, they don't offer ${METHOD_LABEL[method]}`);
            method = next;
          }
        }
        let sizeBreakdown = d.sizeBreakdown;
        const clean = cleanBreakdown(d.sizeBreakdown);
        if (d.qtyMode === 'single') {
          const [size, q] = Object.entries(clean)[0] ?? [product.sizes[0], 1];
          if (!variantOk(o, color, size, 1)) {
            const alt = ['M', ...product.sizes].find((s) => product.sizes.includes(s) && variantOk(o, color, s, 1));
            if (alt) {
              changes.push(`Size changed to ${alt}, no ${size} in ${color} there`);
              sizeBreakdown = { [alt]: q };
            }
          }
        } else {
          const lacking = Object.keys(clean).filter((s) => !variantOk(o, color, s, clean[s]));
          if (lacking.length) changes.push(`No ${lacking.join(', ')} in ${color} there, those sizes are marked`);
        }
        let rush = d.rush;
        if (rush && !o.production.rush.available) {
          rush = false;
          changes.push('Rush turned off, they only do standard speed');
        }
        let quality = d.quality;
        if (quality && o.blank.qualityTier !== quality) quality = null;
        return { ...d, pinnedOfferingId: offeringId, method, rush, sizeBreakdown, quality, customization: { ...d.customization, color } };
      });
      toast.success(`Switched to ${vendor.shopName}`, { description: changes.length ? changes.join('. ') + '.' : 'Your design and options stay the same.' });
    },
    [update, product],
  );

  const setColor = React.useCallback(
    (name: string) => {
      const st = useStore.getState();
      const pinned = draft.pinnedOfferingId ? st.offerings[draft.pinnedOfferingId] : null;
      const unpin = pinned && !pinned.variants.some((v) => v.color === name && v.enabled) && !draft.lockVendorId;
      const nextMethod = methodReason(st, product.id, name, draft.method, draft.lockVendorId) ? firstMethod(st, product.id, name, draft.lockVendorId) : draft.method;
      update((d) => ({ ...d, pinnedOfferingId: unpin ? null : d.pinnedOfferingId, method: nextMethod, customization: { ...d.customization, color: name } }));
      if (unpin && pinned) toast(`${st.vendors[pinned.vendorId].shopName} has no ${name}`, { description: 'Showing the best shop that does.' });
      if (nextMethod !== draft.method) toast(`Switched to ${METHOD_LABEL[nextMethod]}`, { description: `${METHOD_LABEL[draft.method]} is not available on ${name}.` });
    },
    [draft.pinnedOfferingId, draft.lockVendorId, draft.method, product.id, update],
  );

  const setMethod = React.useCallback(
    (m: PrintMethod) => {
      const st = useStore.getState();
      const pinned = draft.pinnedOfferingId ? st.offerings[draft.pinnedOfferingId] : null;
      const unpin = pinned && !pinned.methods.includes(m);
      update((d) => ({ ...d, method: m, pinnedOfferingId: unpin ? null : d.pinnedOfferingId }));
      if (unpin && pinned) toast(`${st.vendors[pinned.vendorId].shopName} doesn't offer ${METHOD_LABEL[m]}`, { description: 'Showing the best shop that does.' });
    },
    [draft.pinnedOfferingId, update],
  );

  const unlock = React.useCallback(() => {
    update((d) => ({ ...d, lockVendorId: null, pinnedOfferingId: null }));
    toast.success('Comparing every shop', { description: 'We picked the best match for your design. You can still choose any shop.' });
  }, [update]);

  return {
    state,
    product,
    customerId,
    draft,
    update,
    undo: hist.undo,
    redo: hist.redo,
    canUndo: hist.canUndo,
    canRedo: hist.canRedo,
    patchLayer,
    setLayers,
    addLayer,
    selectedId,
    setSelectedId,
    view,
    setView,
    activeArea,
    editLine: init.editLine,
    match: derived.match,
    effective: derived.effective,
    pinnedUnavailable: derived.pinnedUnavailable,
    selectedOffering: derived.selectedOffering,
    quote: derived.effective?.quote ?? null,
    blockReasons: derived.blockReasons,
    areas,
    colorHex,
    colors: derived.colors,
    shopCount: derived.shopCount,
    methods,
    qualities: derived.qualities,
    warnings,
    visibleLayers,
    hasContent: visibleLayers.length > 0,
    qty,
    inkEstimate,
    coverage,
    selectVendor,
    setColor,
    setMethod,
    unlock,
    chooserOpen,
    setChooserOpen,
  };
}

/** Engine quote for a specific offering (used for split plans). */
function quoteForOffering(state: AppState, customerId: string, c: Draft['customization'], o: Offering, method: PrintMethod, sizes: Record<string, number>, rush: boolean): AvailableQuote | null {
  const q = quoteFor(state, customerId, c, o.id, method, sizes, rush);
  return q.available ? q : null;
}
