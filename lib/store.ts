'use client';

// One shared store for every role. Persisted to localStorage (versioned key) with immer.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { addDays } from './dates';
import { addTimeline, customersWithCartLines, designersOn, notify } from './events';
import { buildOrder, customerAddress, quoteCartLine, tl, uid } from './orders';
import { formatMoney } from './money';
import { createSeed, PERSONAS } from './seed';
import { canTransition, NEXT_ORDER_STATUS, ORDER_STATUS_LABEL, canCustomerCancel, canDesignTransition } from './stateMachines';
import { isLate } from './selectors';
import type {
  Address,
  AppData,
  CartLine,
  Currency,
  Design,
  DesignRequest,
  DesignStatus,
  Designer,
  Issue,
  IssueResolution,
  Offering,
  OrderLine,
  PaymentMethod,
  PlatformSettings,
  PrintMethod,
  Proposal,
  Role,
  SubOrder,
  Vendor,
} from './types';

export const STORE_KEY = 'printloom-demo-v1';
export const STORE_VERSION = 1;

export type Result<T = undefined> = { ok: true; value?: T; message?: string } | { ok: false; reasons: string[] };

interface UIState {
  role: Role;
  personas: Record<Role, string>;
  currency: Currency;
  theme: 'light' | 'dark';
  simulate: { paymentFail: boolean };
  lastPlacedOrderId: string | null;
}

export interface Actions {
  // demo
  setRole: (r: Role) => void;
  setPersona: (r: Role, id: string) => void;
  setCurrency: (c: Currency) => void;
  setTheme: (t: 'light' | 'dark') => void;
  resetDemo: () => void;
  markNotificationRead: (id: string) => void;
  markAllRead: (personaId: string) => void;

  // cart
  addToCart: (customerId: string, line: Omit<CartLine, 'id' | 'addedAt' | 'priceSnapshot'>) => string;
  updateCartLine: (customerId: string, lineId: string, patch: Partial<CartLine>) => void;
  removeCartLine: (customerId: string, lineId: string) => void;
  duplicateCartLine: (customerId: string, lineId: string) => void;
  acceptNewPrice: (customerId: string, lineId: string) => void;
  switchLineOffering: (customerId: string, lineId: string, offeringId: string) => void;
  splitLine: (customerId: string, lineId: string, assignments: { offeringId: string; sizes: Record<string, number> }[]) => void;
  removeDesignFromLine: (customerId: string, lineId: string, designId: string) => void;
  placeOrder: (customerId: string, lineIds: string[], address: Address, payment: PaymentMethod, modes: Record<string, 'delivery' | 'pickup'>) => Result<string>;

  // customer order actions
  cancelSubOrder: (subId: string) => Result;
  reportIssue: (subId: string, issue: Omit<Issue, 'status' | 'reportedAt'>) => Result;
  reportLate: (subId: string, note: string, desired: 'refund' | 'reprint') => Result;
  escalateIssue: (subId: string) => Result;
  reviewSubOrder: (subId: string, rating: number, text: string) => void;
  reassignSubOrder: (subId: string, offeringId: string) => Result<string>;
  refundRejected: (subId: string) => void;
  reorder: (orderId: string) => { added: number; oldTotal: number; newTotal: number };
  confirmDelivery: (subId: string) => void;

  // customer account
  toggleFavorite: (customerId: string, designId: string) => void;
  addAddress: (customerId: string, a: Omit<Address, 'id'>) => string;
  removeAddress: (customerId: string, addressId: string) => void;
  setDefaultAddress: (customerId: string, addressId: string) => void;
  addPaymentMethod: (customerId: string, method: PaymentMethod, label: string) => void;
  saveCustomerDesign: (customerId: string, d: Pick<Design, 'title' | 'files'>) => string;
  reportDesign: (designId: string, reporterId: string, reason: 'copyright' | 'offensive' | 'other', note: string) => void;

  // requests (customer side)
  createRequest: (r: Omit<DesignRequest, 'id' | 'proposals' | 'messages' | 'deliveries' | 'revisionsUsed' | 'escrowAmount' | 'timeline' | 'createdAt' | 'extraRevisionsPaid' | 'revisionLimit' | 'extraRevisionFee'>) => string;
  cancelRequest: (reqId: string) => Result;
  acceptProposal: (reqId: string, proposalId: string) => Result;
  requestRevision: (reqId: string, note: string, paidExtra?: boolean) => Result;
  approveDelivery: (reqId: string) => Result<string>;
  sendMessage: (reqId: string, from: 'customer' | 'designer', authorId: string, text: string) => void;
  extendRequest: (reqId: string, days: number) => void;
  repostPublic: (reqId: string) => void;

  // requests (designer side)
  sendProposal: (reqId: string, designerId: string, p: Pick<Proposal, 'price' | 'days' | 'note' | 'sampleDesignId'>) => Result;
  declineRequest: (reqId: string) => void;
  uploadDelivery: (reqId: string, src: string, note: string) => Result;

  // vendor
  updateOffering: (id: string, fn: (o: Offering) => void, opts?: { silent?: boolean }) => void;
  createOffering: (vendorId: string, productId: string) => string;
  duplicateOffering: (id: string) => string;
  setOfferingStatus: (id: string, status: Offering['status']) => Result;
  advanceSubOrder: (subId: string, actor?: 'vendor' | 'system') => Result;
  rejectSubOrder: (subId: string, reason: string) => Result;
  resolveIssue: (subId: string, resolution: IssueResolution, opts?: { amount?: number; reason?: string }) => Result;
  replyReview: (reviewId: string, text: string) => void;
  updateVendor: (vendorId: string, fn: (v: Vendor) => void) => void;
  setVendorPaused: (vendorId: string, paused: boolean, message?: string) => void;
  completeSetupStep: (vendorId: string, step: keyof Vendor['setup']) => void;
  setInternalNote: (subId: string, text: string) => void;
  requestPayout: (ownerId: string, amount: number, method: string) => void;

  // designer
  createDesign: (d: Omit<Design, 'id' | 'uses' | 'createdAt'>) => string;
  updateDesign: (id: string, fn: (d: Design) => void) => void;
  setDesignStatus: (id: string, status: DesignStatus, actor?: Role | 'system') => Result;
  deleteDesign: (id: string) => Result;
  updateDesigner: (id: string, fn: (d: Designer) => void) => void;

  // admin
  moderateDesign: (designId: string, action: 'restore' | 'remove') => void;
  decideDispute: (subId: string, decision: IssueResolution, amount?: number) => void;
  updateSettings: (patch: Partial<PlatformSettings>) => void;

  // simulate
  sim: {
    outOfStock: (offeringId?: string, color?: string, size?: string) => string;
    designerDeliver: () => string;
    advanceOrder: () => string;
    priceIncrease: (vendorId?: string, pct?: number) => string;
    flagDesign: (designId?: string) => string;
    pauseVendor: (vendorId?: string) => string;
    togglePaymentFail: () => string;
    expireRequest: () => string;
    escalateIssue: () => string;
    lateDelivery: () => string;
    expirePromotion: () => string;
    fillCapacity: (vendorId?: string) => string;
    autoComplete: () => string;
  };
}

export type StoreState = AppData & UIState & Actions;

const initialUI = (): UIState => ({
  role: 'customer',
  personas: { customer: 'c1', vendor: 'v1', designer: 'd1', admin: 'a1' },
  currency: 'BDT',
  theme: 'light',
  simulate: { paymentFail: false },
  lastPlacedOrderId: null,
});

const personaName = (id: string) => PERSONAS.find((p) => p.id === id)?.name ?? id;

function snapshot(data: AppData, customerId: string, line: CartLine): CartLine['priceSnapshot'] {
  const q = quoteCartLine(data, line, customerAddress(data, customerId), new Date());
  const offering = data.offerings[line.offeringId];
  if (!q.available) return { unitAvg: line.priceSnapshot?.unitAvg ?? 0, lineTotal: line.priceSnapshot?.lineTotal ?? 0, offeringVersion: offering?.version ?? 0, quotedAt: new Date().toISOString() };
  return { unitAvg: q.unitAvg, lineTotal: q.lineTotal, offeringVersion: q.offeringVersion, quotedAt: new Date().toISOString() };
}

function nextSeq(s: AppData): number {
  s.seq += 1;
  return s.seq;
}

function transitionSub(s: StoreState, sub: SubOrder, to: SubOrder['status'], actor: 'vendor' | 'system' | 'customer' | 'admin', actorName: string, note?: string) {
  sub.status = to;
  addTimeline(sub, actor, actorName, ORDER_STATUS_LABEL[to], to, note);
  const order = s.orders[sub.orderId];
  const vendor = s.vendors[sub.vendorId];
  const link = `/orders/${sub.orderId}`;
  switch (to) {
    case 'accepted':
    case 'in_production':
    case 'quality_check':
    case 'shipped':
      notify(s, sub.customerId, 'order_status', `${ORDER_STATUS_LABEL[to]}`, `${vendor.shopName}: order ${order.number} is now ${ORDER_STATUS_LABEL[to].toLowerCase()}.`, link);
      break;
    case 'delivered':
      sub.deliveredAt = new Date().toISOString();
      notify(s, sub.customerId, 'delivered', 'Delivered. How was it?', `Order ${order.number} arrived. Leave a review for ${vendor.shopName}.`, link);
      designersOn(sub).forEach((d) => notify(s, d, 'royalty', 'Royalties now available', `Order ${order.number} was delivered. Your royalties moved to available.`, '/designer/earnings'));
      break;
    case 'completed':
      notify(s, sub.vendorId, 'payout', 'Payout available', `Order ${order.number} completed. ${formatMoney(sub.split.vendor)} added to your balance.`, '/vendor/payouts');
      break;
  }
}

export const useStore = create<StoreState>()(
  persist(
    immer((set, get) => ({
      ...createSeed(),
      ...initialUI(),

      // ---------- demo ----------
      setRole: (r) => set((s) => void (s.role = r)),
      setPersona: (r, id) =>
        set((s) => {
          s.personas[r] = id;
          s.role = r;
        }),
      setCurrency: (c) => set((s) => void (s.currency = c)),
      setTheme: (t) => set((s) => void (s.theme = t)),
      resetDemo: () => set(() => ({ ...createSeed(), ...initialUI() })),
      markNotificationRead: (id) =>
        set((s) => {
          const n = s.notifications.find((x) => x.id === id);
          if (n) n.read = true;
        }),
      markAllRead: (personaId) =>
        set((s) => {
          s.notifications.forEach((n) => {
            if (n.personaId === personaId) n.read = true;
          });
        }),

      // ---------- cart ----------
      addToCart: (customerId, line) => {
        const id = uid('cl');
        set((s) => {
          const full: CartLine = { ...line, id, addedAt: new Date().toISOString(), priceSnapshot: { unitAvg: 0, lineTotal: 0, offeringVersion: 0, quotedAt: '' } };
          full.priceSnapshot = snapshot(s, customerId, full);
          (s.carts[customerId] ??= []).push(full);
        });
        return id;
      },
      updateCartLine: (customerId, lineId, patch) =>
        set((s) => {
          const l = s.carts[customerId]?.find((x) => x.id === lineId);
          if (!l) return;
          Object.assign(l, patch);
          l.priceSnapshot = snapshot(s, customerId, l);
        }),
      removeCartLine: (customerId, lineId) =>
        set((s) => {
          s.carts[customerId] = (s.carts[customerId] ?? []).filter((l) => l.id !== lineId);
        }),
      duplicateCartLine: (customerId, lineId) =>
        set((s) => {
          const lines = s.carts[customerId] ?? [];
          const i = lines.findIndex((l) => l.id === lineId);
          if (i < 0) return;
          const copy: CartLine = JSON.parse(JSON.stringify(lines[i]));
          copy.id = uid('cl');
          copy.addedAt = new Date().toISOString();
          lines.splice(i + 1, 0, copy);
        }),
      acceptNewPrice: (customerId, lineId) =>
        set((s) => {
          const l = s.carts[customerId]?.find((x) => x.id === lineId);
          if (l) l.priceSnapshot = snapshot(s, customerId, l);
        }),
      switchLineOffering: (customerId, lineId, offeringId) =>
        set((s) => {
          const l = s.carts[customerId]?.find((x) => x.id === lineId);
          const o = s.offerings[offeringId];
          if (!l || !o) return;
          l.offeringId = offeringId;
          if (!o.methods.includes(l.method)) l.method = o.methods[0];
          l.priceSnapshot = snapshot(s, customerId, l);
        }),
      splitLine: (customerId, lineId, assignments) =>
        set((s) => {
          const lines = s.carts[customerId] ?? [];
          const i = lines.findIndex((l) => l.id === lineId);
          if (i < 0) return;
          const src = lines[i];
          const parts: CartLine[] = assignments.map((a) => {
            const copy: CartLine = JSON.parse(JSON.stringify(src));
            copy.id = uid('cl');
            copy.offeringId = a.offeringId;
            const o = s.offerings[a.offeringId];
            if (o && !o.methods.includes(copy.method)) copy.method = o.methods[0];
            copy.sizeBreakdown = a.sizes;
            copy.priceSnapshot = snapshot(s, customerId, copy);
            return copy;
          });
          lines.splice(i, 1, ...parts);
        }),
      removeDesignFromLine: (customerId, lineId, designId) =>
        set((s) => {
          const l = s.carts[customerId]?.find((x) => x.id === lineId);
          if (!l) return;
          l.customization.layers = l.customization.layers.filter((x) => x.designId !== designId);
          l.priceSnapshot = snapshot(s, customerId, l);
        }),

      placeOrder: (customerId, lineIds, address, payment, modes) => {
        const s = get();
        if (s.simulate.paymentFail) return { ok: false, reasons: ['Payment failed. Your bank declined the transaction. Nothing was charged and your cart is safe.'] };
        const lines = (s.carts[customerId] ?? []).filter((l) => lineIds.includes(l.id));
        if (!lines.length) return { ok: false, reasons: ['Your cart is empty'] };
        const number = `PL-${s.seq + 1}`;
        const res = buildOrder(s, customerId, lines, address, payment, modes, new Date(), number);
        if (!res.ok) return res;
        const { order, subOrders } = res.built;
        set((d) => {
          nextSeq(d);
          d.orders[order.id] = order;
          for (const sub of subOrders) {
            d.subOrders[sub.id] = sub;
            const vendor = d.vendors[sub.vendorId];
            // stock, capacity and design uses
            for (const line of sub.lines) {
              const off = d.offerings[line.offeringId];
              for (const [size, qty] of Object.entries(line.sizeBreakdown)) {
                const v = off.variants.find((x) => x.color === line.customization.color && x.size === size);
                if (v && v.stock !== 'unlimited') v.stock = Math.max(0, v.stock - qty);
              }
              off.production.bookedToday += line.quote.qty;
              for (const r of line.quote.royalties) {
                const des = d.designs[r.designId];
                if (des) des.uses += line.quote.qty;
              }
            }
            notify(d, sub.vendorId, 'order_placed', 'New order', `Order ${order.number} from ${address.city}: ${sub.lines.reduce((x, l) => x + l.quote.qty, 0)} items, ${formatMoney(sub.total)}.`, `/vendor/orders/${sub.id}`);
            for (const ds of sub.split.designers) notify(d, ds.designerId, 'royalty_pending', 'Your design was ordered', `${formatMoney(ds.amount)} in royalties pending from order ${order.number}.`, '/designer/earnings');
            void vendor;
          }
          notify(d, 'a1', 'gmv', 'New order', `${order.number}: ${formatMoney(order.total)} across ${subOrders.length} shop${subOrders.length > 1 ? 's' : ''}.`, '/admin/orders');
          notify(d, customerId, 'order_placed', 'Order placed', `Order ${order.number} is confirmed. We will keep you posted.`, `/orders/${order.id}`);
          d.carts[customerId] = (d.carts[customerId] ?? []).filter((l) => !lineIds.includes(l.id));
          d.lastPlacedOrderId = order.id;
        });
        return { ok: true, value: order.id };
      },

      // ---------- customer order actions ----------
      cancelSubOrder: (subId) => {
        const sub = get().subOrders[subId];
        if (!sub) return { ok: false, reasons: ['Order not found'] };
        if (!canCustomerCancel(sub.status)) return { ok: false, reasons: ['Printing has already started, so this order can no longer be cancelled.'] };
        set((s) => {
          const x = s.subOrders[subId];
          x.status = 'cancelled_by_customer';
          x.refundAmount = x.total;
          addTimeline(x, 'customer', personaName(x.customerId), 'Cancelled by customer, full refund issued', 'cancelled_by_customer');
          const o = s.orders[x.orderId];
          const allCancelled = o.subOrderIds.every((id) => ['cancelled_by_customer', 'refunded'].includes(s.subOrders[id].status));
          o.payment.status = allCancelled ? 'refunded' : 'partially_refunded';
          notify(s, x.vendorId, 'cancelled', 'Order cancelled', `Order ${o.number} was cancelled by the customer.`, `/vendor/orders/${x.id}`);
          designersOn(x).forEach((d) => notify(s, d, 'royalty_void', 'Royalties voided', `Order ${o.number} was cancelled. Pending royalties were voided.`, '/designer/earnings'));
          for (const line of x.lines) {
            const off = s.offerings[line.offeringId];
            off.production.bookedToday = Math.max(0, off.production.bookedToday - line.quote.qty);
          }
        });
        return { ok: true };
      },
      reportIssue: (subId, issue) => {
        const sub = get().subOrders[subId];
        if (!sub || !canTransition(sub.status, 'issue_reported', 'customer')) return { ok: false, reasons: ['Problems can be reported within 7 days of delivery'] };
        set((s) => {
          const x = s.subOrders[subId];
          x.issue = { ...issue, status: 'open', reportedAt: new Date().toISOString() };
          x.status = 'issue_reported';
          addTimeline(x, 'customer', personaName(x.customerId), `Issue reported: ${issue.type.replace('_', ' ')}`, 'issue_reported', issue.note);
          notify(s, x.vendorId, 'issue', 'Issue reported', `Order ${s.orders[x.orderId].number}: ${issue.type.replace('_', ' ')}. Customer wants a ${issue.desired}.`, '/vendor/issues');
        });
        return { ok: true };
      },
      reportLate: (subId, note, desired) => {
        const sub = get().subOrders[subId];
        if (!sub || !isLate(sub)) return { ok: false, reasons: ['This order is not late yet'] };
        if (sub.issue && sub.issue.status === 'open') return { ok: false, reasons: ['You already reported a problem on this order'] };
        set((s) => {
          const x = s.subOrders[subId];
          const o = s.orders[x.orderId];
          // Late reports keep the delivery status; the issue shows up in the vendor's Issues list.
          x.issue = { type: 'late', photos: [], note, desired, status: 'open', reportedAt: new Date().toISOString() };
          addTimeline(x, 'customer', personaName(x.customerId), 'Reported late delivery', undefined, note);
          notify(s, x.vendorId, 'issue', 'Late delivery reported', `Order ${o.number} is past its estimated date. Customer wants a ${desired}.`, '/vendor/issues');
          notify(s, 'a1', 'late', 'Late delivery reported', `${o.number} is past its estimated date.`, '/admin/orders');
        });
        return { ok: true };
      },
      escalateIssue: (subId) => {
        const sub = get().subOrders[subId];
        if (!sub || sub.status !== 'issue_rejected') return { ok: false, reasons: ['Only rejected issues can be escalated'] };
        set((s) => {
          const x = s.subOrders[subId];
          x.status = 'escalated';
          if (x.issue) x.issue.status = 'escalated';
          addTimeline(x, 'customer', personaName(x.customerId), 'Escalated to Printloom support', 'escalated');
          notify(s, 'a1', 'dispute', 'New dispute', `Order ${s.orders[x.orderId].number} was escalated by the customer.`, '/admin/disputes');
          notify(s, x.vendorId, 'dispute', 'Issue escalated', `The customer escalated order ${s.orders[x.orderId].number}. Printloom will decide.`, `/vendor/orders/${x.id}`);
        });
        return { ok: true };
      },
      reviewSubOrder: (subId, rating, text) =>
        set((s) => {
          const x = s.subOrders[subId];
          if (!x) return;
          x.reviewed = true;
          s.reviews.unshift({ id: uid('r'), target: 'vendor', targetId: x.vendorId, customerId: x.customerId, subOrderId: x.id, rating, text, at: new Date().toISOString() });
          const v = s.vendors[x.vendorId];
          v.rating = Math.round(((v.rating * v.reviewCount + rating) / (v.reviewCount + 1)) * 10) / 10;
          v.reviewCount += 1;
          if (x.status === 'delivered') {
            x.status = 'completed';
            addTimeline(x, 'customer', personaName(x.customerId), 'Reviewed and completed', 'completed');
            notify(s, x.vendorId, 'payout', 'Payout available', `Order ${s.orders[x.orderId].number} completed. ${formatMoney(x.split.vendor)} added to your balance.`, '/vendor/payouts');
          }
          notify(s, x.vendorId, 'review', `New ${rating} star review`, text.slice(0, 80), '/vendor/reviews');
        }),
      reassignSubOrder: (subId, offeringId) => {
        const s = get();
        const sub = s.subOrders[subId];
        if (!sub) return { ok: false, reasons: ['Order not found'] };
        const order = s.orders[sub.orderId];
        const lines: CartLine[] = sub.lines.map((l) => {
          const off = s.offerings[offeringId];
          const { quote: _q, ...rest } = l;
          void _q;
          return { ...rest, offeringId, method: off.methods.includes(l.method) ? l.method : off.methods[0] };
        });
        const res = buildOrder(s, sub.customerId, lines, order.address, order.payment.method, {}, new Date(), order.number);
        if (!res.ok) return res;
        const newSub = res.built.subOrders[0];
        newSub.id = `${order.id}-${order.subOrderIds.length + 1}`;
        newSub.orderId = order.id;
        set((d) => {
          const old = d.subOrders[subId];
          old.status = 'reassigned';
          old.reassignedTo = newSub.id;
          addTimeline(old, 'customer', personaName(old.customerId), `Reassigned to ${d.vendors[newSub.vendorId].shopName}`, 'reassigned');
          newSub.timeline = [tl('customer', personaName(old.customerId), `Reassigned from ${d.vendors[old.vendorId].shopName}`, new Date().toISOString(), 'placed')];
          d.subOrders[newSub.id] = newSub;
          const o = d.orders[order.id];
          o.subOrderIds.push(newSub.id);
          const diff = newSub.total - old.total;
          o.itemsTotal += newSub.itemsTotal - old.itemsTotal;
          o.shippingTotal += newSub.shipping.fee - old.shipping.fee;
          o.total += diff;
          notify(d, newSub.vendorId, 'order_placed', 'New order (reassigned)', `Order ${o.number} was reassigned to you.`, `/vendor/orders/${newSub.id}`);
          notify(d, 'a1', 'reassigned', 'Order reassigned', `${o.number} moved from ${d.vendors[old.vendorId].shopName} to ${d.vendors[newSub.vendorId].shopName}.`, '/admin/orders');
        });
        return { ok: true, value: newSub.id };
      },
      refundRejected: (subId) =>
        set((s) => {
          const x = s.subOrders[subId];
          if (!x) return;
          x.status = 'refunded';
          x.refundAmount = x.total;
          addTimeline(x, 'customer', personaName(x.customerId), 'Refund issued', 'refunded');
          s.orders[x.orderId].payment.status = 'partially_refunded';
          designersOn(x).forEach((d) => notify(s, d, 'royalty_void', 'Royalties voided', `Order ${s.orders[x.orderId].number} was refunded.`, '/designer/earnings'));
        }),
      reorder: (orderId) => {
        const s = get();
        const order = s.orders[orderId];
        let oldTotal = 0;
        let newTotal = 0;
        let added = 0;
        const newLines: CartLine[] = [];
        for (const sid of order.subOrderIds) {
          const sub = s.subOrders[sid];
          if (sub.status === 'reassigned') continue;
          for (const l of sub.lines) {
            const { quote: q, ...rest } = l;
            oldTotal += q.lineTotal;
            const line: CartLine = { ...JSON.parse(JSON.stringify(rest)), id: uid('cl'), addedAt: new Date().toISOString() };
            line.priceSnapshot = snapshot(s, order.customerId, line);
            newTotal += line.priceSnapshot.lineTotal;
            newLines.push(line);
            added++;
          }
        }
        set((d) => {
          (d.carts[order.customerId] ??= []).push(...newLines);
        });
        return { added, oldTotal, newTotal };
      },
      confirmDelivery: (subId) =>
        set((s) => {
          const x = s.subOrders[subId];
          if (x && x.status === 'shipped') transitionSub(s, x, 'delivered', 'system', 'Courier');
        }),

      // ---------- customer account ----------
      toggleFavorite: (customerId, designId) =>
        set((s) => {
          const c = s.customers[customerId];
          c.favorites = c.favorites.includes(designId) ? c.favorites.filter((x) => x !== designId) : [...c.favorites, designId];
        }),
      addAddress: (customerId, a) => {
        const id = uid('addr');
        set((s) => {
          s.customers[customerId].addresses.push({ ...a, id });
        });
        return id;
      },
      removeAddress: (customerId, addressId) =>
        set((s) => {
          const c = s.customers[customerId];
          if (c.addresses.length <= 1) return;
          c.addresses = c.addresses.filter((a) => a.id !== addressId);
          if (c.defaultAddressId === addressId) c.defaultAddressId = c.addresses[0].id;
        }),
      setDefaultAddress: (customerId, addressId) => set((s) => void (s.customers[customerId].defaultAddressId = addressId)),
      addPaymentMethod: (customerId, method, label) =>
        set((s) => {
          s.customers[customerId].savedPayments.push({ id: uid('pm'), method, label });
        }),
      saveCustomerDesign: (customerId, d) => {
        const id = uid('ds');
        set((s) => {
          s.designs[id] = { id, designerId: null, title: d.title, description: 'Your upload', files: d.files, tags: [], compatibleCategories: ['tshirt', 'polo', 'hoodie', 'jersey', 'mug', 'tote', 'poster', 'phonecase', 'cap'], royalty: { type: 'fixed', amount: 0 }, status: 'published', uses: 0, createdAt: new Date().toISOString(), isPrivate: true, ownerCustomerId: customerId, palette: ['#000'] };
        });
        return id;
      },
      reportDesign: (designId, reporterId, reason, note) =>
        set((s) => {
          s.reports.unshift({ id: uid('rp'), designId, reporterId, reason, note, status: 'open', at: new Date().toISOString() });
          const d = s.designs[designId];
          if (d && d.status === 'published') {
            d.status = 'flagged';
            if (d.designerId) notify(s, d.designerId, 'flagged', 'Your design was flagged', `${d.title} is hidden while we review a report.`, '/designer/designs');
            customersWithCartLines(s, (_o, ids) => ids.includes(designId)).forEach((cid) => notify(s, cid, 'cart_flag', 'A design in your cart is unavailable', `${d.title} is no longer available. Replace or remove it.`, '/cart'));
          }
          notify(s, 'a1', 'report', 'Design reported', `${d?.title ?? 'A design'} was reported (${reason}).`, '/admin/moderation');
        }),

      // ---------- requests (customer) ----------
      createRequest: (r) => {
        const id = uid('rq');
        set((s) => {
          const designer = r.designerId ? s.designers[r.designerId] : null;
          const req: DesignRequest = {
            ...r,
            id,
            proposals: [],
            messages: [],
            deliveries: [],
            revisionsUsed: 0,
            revisionLimit: designer?.revisionLimit ?? 2,
            extraRevisionFee: designer?.extraRevisionFee ?? 400,
            extraRevisionsPaid: 0,
            escrowAmount: 0,
            timeline: [tl('customer', personaName(r.customerId), designer ? `Sent to ${designer.name}` : 'Posted publicly', new Date().toISOString(), r.status)],
            createdAt: new Date().toISOString(),
          };
          s.requests[id] = req;
          if (designer) notify(s, designer.id, 'request', 'New direct request', `${personaName(r.customerId)} sent you: ${r.title}.`, `/designer/requests/${id}`);
          else
            Object.values(s.designers)
              .filter((d) => d.acceptsRequests && d.tags.some((t) => r.styleTags.includes(t)))
              .forEach((d) => notify(s, d.id, 'request', 'New open request matches your tags', `${r.title} (${r.styleTags.join(', ')}).`, `/designer/requests/${id}`));
        });
        return id;
      },
      cancelRequest: (reqId) => {
        const r = get().requests[reqId];
        if (!r) return { ok: false, reasons: ['Request not found'] };
        if (!['draft', 'open', 'sent', 'proposals_received', 'expired', 'declined'].includes(r.status)) return { ok: false, reasons: ['A designer is already working on this. Open a dispute with Printloom support to cancel.'] };
        set((s) => {
          const x = s.requests[reqId];
          x.status = 'cancelled_by_customer';
          x.timeline.push(tl('customer', personaName(x.customerId), 'Cancelled by customer', new Date().toISOString(), 'cancelled_by_customer'));
          x.proposals.forEach((p) => notify(s, p.designerId, 'request_cancelled', 'Request cancelled', `${x.title} was cancelled by the customer.`, '/designer/requests'));
        });
        return { ok: true };
      },
      acceptProposal: (reqId, proposalId) => {
        const r = get().requests[reqId];
        const p = r?.proposals.find((x) => x.id === proposalId);
        if (!r || !p) return { ok: false, reasons: ['Proposal not found'] };
        set((s) => {
          const x = s.requests[reqId];
          const now = new Date().toISOString();
          x.proposals.forEach((pp) => (pp.status = pp.id === proposalId ? 'accepted' : pp.status === 'pending' ? 'rejected' : pp.status));
          x.acceptedProposalId = proposalId;
          x.designerId = p.designerId;
          x.escrowAmount = p.price;
          const des = s.designers[p.designerId];
          x.revisionLimit = des.revisionLimit;
          x.extraRevisionFee = des.extraRevisionFee;
          x.status = 'in_progress';
          x.timeline.push(tl('customer', personaName(x.customerId), `Proposal accepted, ${formatMoney(p.price)} held in escrow`, now, 'accepted'));
          x.timeline.push(tl('system', 'Printloom', `${des.name} started work`, now, 'in_progress'));
          notify(s, p.designerId, 'proposal_accepted', 'Proposal accepted', `${personaName(x.customerId)} accepted your proposal for ${x.title}. ${formatMoney(p.price)} is in escrow.`, `/designer/requests/${reqId}`);
          x.proposals.filter((pp) => pp.status === 'rejected').forEach((pp) => notify(s, pp.designerId, 'proposal_rejected', 'Proposal not selected', `${x.title} went with another designer.`, '/designer/requests'));
        });
        return { ok: true };
      },
      requestRevision: (reqId, note, paidExtra) => {
        const r = get().requests[reqId];
        if (!r || r.status !== 'delivered') return { ok: false, reasons: ['Nothing to revise yet'] };
        const allowed = r.revisionLimit + r.extraRevisionsPaid;
        if (r.revisionsUsed >= allowed && !paidExtra) return { ok: false, reasons: [`Revision limit reached. Request an extra revision for ${formatMoney(r.extraRevisionFee)}.`] };
        set((s) => {
          const x = s.requests[reqId];
          if (paidExtra && x.revisionsUsed >= allowed) {
            x.extraRevisionsPaid += 1;
            x.escrowAmount += x.extraRevisionFee;
          }
          x.revisionsUsed += 1;
          x.status = 'revision_requested';
          x.timeline.push(tl('customer', personaName(x.customerId), `Revision ${x.revisionsUsed} requested${paidExtra ? ' (paid extra)' : ''}`, new Date().toISOString(), 'revision_requested', note));
          if (note) x.messages.push({ id: uid('m'), from: 'customer', authorId: x.customerId, text: note, at: new Date().toISOString() });
          if (x.designerId) notify(s, x.designerId, 'revision', 'Revision requested', `${x.title}: ${note || 'see the brief'}`, `/designer/requests/${reqId}`);
        });
        return { ok: true };
      },
      approveDelivery: (reqId) => {
        const r = get().requests[reqId];
        if (!r || r.status !== 'delivered' || !r.designerId) return { ok: false, reasons: ['Nothing to approve yet'] };
        const designId = uid('ds');
        set((s) => {
          const x = s.requests[reqId];
          const last = x.deliveries[x.deliveries.length - 1];
          const now = new Date().toISOString();
          s.designs[designId] = {
            id: designId,
            designerId: x.designerId,
            title: x.title,
            description: `Commissioned by ${personaName(x.customerId)}`,
            files: { src: last.src, widthPx: 3600, heightPx: 3600, transparent: last.src.endsWith('.svg') || last.src.startsWith('data:image/png'), kind: last.src.endsWith('.svg') ? 'svg' : 'png' },
            tags: x.styleTags,
            compatibleCategories: ['tshirt', 'polo', 'hoodie', 'jersey', 'mug', 'tote', 'poster', 'phonecase', 'cap'],
            royalty: { type: 'fixed', amount: 0 },
            status: 'published',
            uses: 0,
            createdAt: now,
            isPrivate: true,
            ownerCustomerId: x.customerId,
            palette: ['#000', '#fff'],
          };
          x.resultDesignId = designId;
          x.status = 'completed';
          x.timeline.push(tl('customer', personaName(x.customerId), 'Approved', now, 'approved'));
          x.timeline.push(tl('system', 'Printloom', 'Escrow released, design added to My designs', now, 'completed'));
          const payout = Math.round(x.escrowAmount * (1 - s.settings.requestFeePct / 100));
          notify(s, x.designerId as string, 'approved', 'Delivery approved', `${x.title} approved. ${formatMoney(payout)} released to your earnings.`, '/designer/earnings');
        });
        return { ok: true, value: designId };
      },
      sendMessage: (reqId, from, authorId, text) =>
        set((s) => {
          const x = s.requests[reqId];
          if (!x || !text.trim()) return;
          x.messages.push({ id: uid('m'), from, authorId, text, at: new Date().toISOString() });
          const to = from === 'customer' ? x.designerId : x.customerId;
          if (to) notify(s, to, 'message', 'New message', `${personaName(authorId)}: ${text.slice(0, 80)}`, from === 'customer' ? `/designer/requests/${reqId}` : `/requests/${reqId}`);
        }),
      extendRequest: (reqId, days) =>
        set((s) => {
          const x = s.requests[reqId];
          x.deadline = addDays(new Date(Math.max(Date.now(), new Date(x.deadline).getTime())), days).toISOString();
          if (x.status === 'expired') x.status = x.designerId && !x.acceptedProposalId ? 'sent' : x.proposals.some((p) => p.status === 'pending') ? 'proposals_received' : 'open';
          x.timeline.push(tl('customer', personaName(x.customerId), `Deadline extended by ${days} days`, new Date().toISOString(), x.status));
        }),
      repostPublic: (reqId) =>
        set((s) => {
          const x = s.requests[reqId];
          x.designerId = null;
          x.status = 'open';
          x.deadline = addDays(new Date(), 7).toISOString();
          x.timeline.push(tl('customer', personaName(x.customerId), 'Posted publicly', new Date().toISOString(), 'open'));
          Object.values(s.designers)
            .filter((d) => d.acceptsRequests && d.tags.some((t) => x.styleTags.includes(t)))
            .forEach((d) => notify(s, d.id, 'request', 'New open request matches your tags', x.title, `/designer/requests/${reqId}`));
        }),

      // ---------- requests (designer) ----------
      sendProposal: (reqId, designerId, p) => {
        const r = get().requests[reqId];
        if (!r || !['open', 'proposals_received', 'sent'].includes(r.status)) return { ok: false, reasons: ['This request is no longer taking proposals'] };
        if (r.proposals.some((x) => x.designerId === designerId && x.status === 'pending')) return { ok: false, reasons: ['You already sent a proposal'] };
        set((s) => {
          const x = s.requests[reqId];
          x.proposals.push({ ...p, id: uid('pp'), designerId, status: 'pending', at: new Date().toISOString() });
          if (x.status === 'open') x.status = 'proposals_received';
          x.timeline.push(tl('designer', personaName(designerId), `Proposal: ${formatMoney(p.price)}, ${p.days} days`, new Date().toISOString(), x.status));
          notify(s, x.customerId, 'proposal', 'New proposal', `${personaName(designerId)} offered ${formatMoney(p.price)} in ${p.days} days for ${x.title}.`, `/requests/${reqId}`);
        });
        return { ok: true };
      },
      declineRequest: (reqId) =>
        set((s) => {
          const x = s.requests[reqId];
          if (!x) return;
          const who = x.designerId;
          x.status = 'declined';
          x.timeline.push(tl('designer', personaName(who ?? ''), 'Declined', new Date().toISOString(), 'declined'));
          notify(s, x.customerId, 'declined', 'Request declined', `${personaName(who ?? '')} can't take ${x.title}. You can post it publicly.`, `/requests/${reqId}`);
        }),
      uploadDelivery: (reqId, src, note) => {
        const r = get().requests[reqId];
        if (!r || !['in_progress', 'revision_requested', 'accepted'].includes(r.status)) return { ok: false, reasons: ['Nothing to deliver right now'] };
        set((s) => {
          const x = s.requests[reqId];
          const version = x.deliveries.length + 1;
          x.deliveries.push({ id: uid('dv'), version, src, note, at: new Date().toISOString() });
          x.status = 'delivered';
          x.timeline.push(tl('designer', personaName(x.designerId ?? ''), `Delivered v${version}`, new Date().toISOString(), 'delivered', note));
          notify(s, x.customerId, 'delivery', 'New delivery', `${personaName(x.designerId ?? '')} delivered v${version} of ${x.title}.`, `/requests/${reqId}`);
        });
        return { ok: true };
      },

      // ---------- vendor ----------
      updateOffering: (id, fn, opts) =>
        set((s) => {
          const o = s.offerings[id];
          if (!o) return;
          fn(o);
          o.version += 1;
          o.updatedAt = new Date().toISOString();
          if (opts?.silent) return;
          const affected = customersWithCartLines(s, (oid) => oid === id);
          const vendor = s.vendors[o.vendorId];
          for (const cid of affected) {
            for (const line of s.carts[cid].filter((l) => l.offeringId === id)) {
              const q = quoteCartLine(s, line, customerAddress(s, cid), new Date());
              if (q.available && q.lineTotal !== line.priceSnapshot.lineTotal) {
                notify(s, cid, 'price_change', `${vendor.shopName} updated their price`, `New total: ${formatMoney(q.lineTotal)} (was ${formatMoney(line.priceSnapshot.lineTotal)})`, '/cart');
              } else if (!q.available) {
                notify(s, cid, 'cart_flag', 'An item in your cart changed', `${vendor.shopName}: ${q.reasons[0]}`, '/cart');
              }
            }
          }
        }),
      createOffering: (vendorId, productId) => {
        const id = uid('of');
        set((s) => {
          const product = s.products[productId];
          const template = Object.values(s.offerings).find((o) => o.vendorId === vendorId) ?? Object.values(s.offerings)[0];
          const methods = product.allowedMethods.filter((m) => template.methods.includes(m));
          const m: PrintMethod[] = methods.length ? methods : [product.allowedMethods[0]];
          const face = { small: 70, medium: 120, large: 180, full: 250 };
          const printTable: Offering['pricing']['printTable'] = {};
          for (const meth of m) printTable[meth] = Object.fromEntries(product.printAreas.map((a) => [a.view, Object.fromEntries(a.sizeTiers.map((t) => [t, face[t]]))]));
          const colorGroups = [
            { id: 'light', name: 'Light', colors: [{ name: 'White', hex: '#FFFFFF' }] },
            { id: 'dark', name: 'Dark', colors: [{ name: 'Black', hex: '#141414' }] },
          ];
          s.offerings[id] = {
            id,
            vendorId,
            productId,
            status: 'draft',
            blank: { brand: 'House blank', fabric: product.category === 'jersey' ? '100% polyester' : '100% cotton', gsm: 160, fit: 'Regular', qualityTier: 'standard' },
            methods: m,
            colorGroups,
            variants: colorGroups.flatMap((g) => g.colors.flatMap((c) => product.sizes.map((size) => ({ id: uid('var'), color: c.name, size, enabled: true, stock: 'unlimited' as const, sku: `${vendorId.toUpperCase()}-${product.category.slice(0, 3).toUpperCase()}-${c.name.slice(0, 3).toUpperCase()}-${size.replace(/\s+/g, '')}` })))),
            pricing: { ...JSON.parse(JSON.stringify(template.pricing)), basePrice: 300, printTable, promotions: [], sizeUpcharge: {}, colorGroupUpcharge: { Light: 0, Dark: 30 }, moq: 1 },
            production: JSON.parse(JSON.stringify(template.production)),
            delivery: JSON.parse(JSON.stringify(template.delivery)),
            version: 1,
            updatedAt: new Date().toISOString(),
          };
          const v = s.vendors[vendorId];
          if (!v.setup.firstOffering) {
            v.setup.firstOffering = true;
            v.setupProgress = Math.round((Object.values(v.setup).filter(Boolean).length / 6) * 100);
          }
        });
        return id;
      },
      duplicateOffering: (id) => {
        const nid = uid('of');
        set((s) => {
          const copy: Offering = JSON.parse(JSON.stringify(s.offerings[id]));
          copy.id = nid;
          copy.status = 'draft';
          copy.version = 1;
          copy.updatedAt = new Date().toISOString();
          copy.variants.forEach((v) => (v.id = uid('var')));
          s.offerings[nid] = copy;
        });
        return nid;
      },
      setOfferingStatus: (id, status) => {
        const o = get().offerings[id];
        if (!o) return { ok: false, reasons: ['Offering not found'] };
        if (status === 'active') {
          const reasons: string[] = [];
          if (!o.variants.some((v) => v.enabled)) reasons.push('Enable at least one color and size');
          if (!o.methods.length) reasons.push('Pick at least one print method');
          if (o.pricing.basePrice <= 0) reasons.push('Base price must be above 0');
          if (reasons.length) return { ok: false, reasons };
        }
        get().updateOffering(id, (x) => void (x.status = status));
        return { ok: true };
      },
      advanceSubOrder: (subId, actor = 'vendor') => {
        const sub = get().subOrders[subId];
        if (!sub) return { ok: false, reasons: ['Order not found'] };
        const next = NEXT_ORDER_STATUS[sub.status];
        if (!next || !canTransition(sub.status, next, actor === 'vendor' && next === 'completed' ? 'system' : actor)) return { ok: false, reasons: [`Can't move from ${ORDER_STATUS_LABEL[sub.status].toLowerCase()}`] };
        set((s) => {
          const x = s.subOrders[subId];
          transitionSub(s, x, next, next === 'completed' ? 'system' : actor, next === 'completed' ? 'Printloom' : s.vendors[x.vendorId].shopName);
        });
        return { ok: true, message: ORDER_STATUS_LABEL[next] };
      },
      rejectSubOrder: (subId, reason) => {
        const sub = get().subOrders[subId];
        if (!sub || sub.status !== 'placed') return { ok: false, reasons: ['Only new orders can be rejected'] };
        set((s) => {
          const x = s.subOrders[subId];
          x.status = 'rejected_by_vendor';
          x.rejectReason = reason;
          addTimeline(x, 'vendor', s.vendors[x.vendorId].shopName, 'Rejected by shop', 'rejected_by_vendor', reason);
          const o = s.orders[x.orderId];
          notify(s, x.customerId, 'order_rejected', `${s.vendors[x.vendorId].shopName} could not take your order`, 'Choose another shop in one click, or get a refund.', `/orders/${o.id}`);
          notify(s, 'a1', 'rejected', 'Order rejected by shop', `${o.number}: ${reason}`, '/admin/orders');
          for (const line of x.lines) {
            const off = s.offerings[line.offeringId];
            off.production.bookedToday = Math.max(0, off.production.bookedToday - line.quote.qty);
          }
        });
        return { ok: true };
      },
      resolveIssue: (subId, resolution, opts) => {
        const sub = get().subOrders[subId];
        if (!sub || !sub.issue) return { ok: false, reasons: ['No issue on this order'] };
        set((s) => {
          const x = s.subOrders[subId];
          const issue = x.issue as Issue;
          const vname = s.vendors[x.vendorId].shopName;
          const o = s.orders[x.orderId];
          issue.resolution = resolution;
          if (resolution === 'reprint') {
            issue.status = 'resolved';
            x.status = 'reprint';
            addTimeline(x, 'vendor', vname, 'Reprint approved', 'reprint');
            notify(s, x.customerId, 'issue_resolved', 'Reprint on the way', `${vname} will reprint order ${o.number}.`, `/orders/${o.id}`);
          } else if (resolution === 'refund' || resolution === 'partial_refund') {
            issue.status = 'resolved';
            const amt = resolution === 'refund' ? x.total : Math.min(x.total, opts?.amount ?? 0);
            issue.refundAmount = amt;
            x.refundAmount = amt;
            x.status = resolution === 'refund' ? 'refunded' : 'partial_refund';
            addTimeline(x, 'vendor', vname, `${resolution === 'refund' ? 'Full refund' : 'Partial refund'}: ${formatMoney(amt)}`, x.status);
            o.payment.status = 'partially_refunded';
            notify(s, x.customerId, 'issue_resolved', 'Refund issued', `${vname} refunded ${formatMoney(amt)} for order ${o.number}.`, `/orders/${o.id}`);
          } else {
            issue.status = 'rejected';
            issue.rejectReason = opts?.reason ?? '';
            x.status = 'issue_rejected';
            addTimeline(x, 'vendor', vname, 'Issue rejected', 'issue_rejected', opts?.reason);
            notify(s, x.customerId, 'issue_rejected', 'Your issue was rejected', `${vname}: ${opts?.reason ?? ''} You can escalate to Printloom.`, `/orders/${o.id}`);
          }
        });
        return { ok: true };
      },
      replyReview: (reviewId, text) =>
        set((s) => {
          const r = s.reviews.find((x) => x.id === reviewId);
          if (r) {
            r.reply = text;
            notify(s, r.customerId, 'review_reply', 'The shop replied to your review', text.slice(0, 80), `/shop/${r.targetId}`);
          }
        }),
      updateVendor: (vendorId, fn) =>
        set((s) => {
          fn(s.vendors[vendorId]);
        }),
      setVendorPaused: (vendorId, paused, message) =>
        set((s) => {
          const v = s.vendors[vendorId];
          v.status = paused ? 'paused' : 'active';
          if (message !== undefined) v.pausedMessage = message;
          if (paused) {
            const ids = Object.values(s.offerings).filter((o) => o.vendorId === vendorId).map((o) => o.id);
            customersWithCartLines(s, (oid) => ids.includes(oid)).forEach((cid) => notify(s, cid, 'vendor_paused', `${v.shopName} is temporarily closed`, 'Switch the items in your cart to another shop.', '/cart'));
          }
        }),
      completeSetupStep: (vendorId, step) =>
        set((s) => {
          const v = s.vendors[vendorId];
          v.setup[step] = true;
          v.setupProgress = Math.round((Object.values(v.setup).filter(Boolean).length / 6) * 100);
          if (step === 'live') v.status = 'active';
        }),
      setInternalNote: (subId, text) =>
        set((s) => {
          const x = s.subOrders[subId];
          const v = s.vendors[x.vendorId];
          v.internalNotes = { ...(v.internalNotes ?? {}), [subId]: text };
        }),
      requestPayout: (ownerId, amount, method) =>
        set((s) => {
          // Balances are derived: vendorFinance and designerEarnings subtract processing payouts.
          s.payouts.unshift({ id: uid('po'), ownerId, amount, method, status: 'processing', at: new Date().toISOString() });
        }),

      // ---------- designer ----------
      createDesign: (d) => {
        const id = uid('ds');
        set((s) => {
          s.designs[id] = { ...d, id, uses: 0, createdAt: new Date().toISOString() };
          if (d.status === 'published' && d.designerId) {
            const des = s.designers[d.designerId];
            notify(s, 'c1', 'new_design', `New from ${des.name}`, `${d.title} is now in the library.`, `/designs/${id}`);
          }
        });
        return id;
      },
      updateDesign: (id, fn) =>
        set((s) => {
          fn(s.designs[id]);
        }),
      setDesignStatus: (id, status, actor = 'designer') => {
        const d = get().designs[id];
        if (!d) return { ok: false, reasons: ['Design not found'] };
        if (d.status === status) return { ok: true };
        const as = actor === 'system' ? 'system' : actor;
        if (!canDesignTransition(d.status, status, as)) return { ok: false, reasons: [`A ${d.status} design can't be moved to ${status}`] };
        set((s) => {
          const x = s.designs[id];
          x.status = status;
          if (status !== 'published') {
            customersWithCartLines(s, (_o, ids) => ids.includes(id)).forEach((cid) => notify(s, cid, 'cart_flag', 'A design in your cart is unavailable', `${x.title} is no longer available. Replace or remove it.`, '/cart'));
            if (actor !== 'designer' && x.designerId) notify(s, x.designerId, 'design_status', `Design ${status}`, `${x.title} is now ${status}.`, '/designer/designs');
          }
        });
        return { ok: true };
      },
      deleteDesign: (id) => {
        const s = get();
        const inCarts = Object.values(s.carts).flat().filter((l) => l.customization.layers.some((x) => x.designId === id)).length;
        const inOrders = Object.values(s.subOrders).filter((so) => !['completed', 'refunded', 'cancelled_by_customer', 'reassigned'].includes(so.status) && so.lines.some((l) => l.customization.layers.some((x) => x.designId === id))).length;
        if (inCarts + inOrders > 0) {
          const parts = [];
          if (inOrders) parts.push(`${inOrders} open order${inOrders > 1 ? 's' : ''}`);
          if (inCarts) parts.push(`${inCarts} cart${inCarts > 1 ? 's' : ''}`);
          return { ok: false, reasons: [`Used in ${parts.join(' and ')}. Unpublish instead.`] };
        }
        set((d) => {
          delete d.designs[id];
        });
        return { ok: true };
      },
      updateDesigner: (id, fn) =>
        set((s) => {
          fn(s.designers[id]);
        }),

      // ---------- admin ----------
      moderateDesign: (designId, action) => {
        get().setDesignStatus(designId, action === 'restore' ? 'published' : 'removed', 'admin');
        set((s) => {
          s.reports.filter((r) => r.designId === designId && r.status === 'open').forEach((r) => (r.status = action === 'restore' ? 'restored' : 'removed'));
          const d = s.designs[designId];
          if (d?.designerId) notify(s, d.designerId, 'moderation', action === 'restore' ? 'Design restored' : 'Design removed', `${d.title} was ${action === 'restore' ? 'restored to the library' : 'removed after review'}.`, '/designer/designs');
        });
      },
      decideDispute: (subId, decision, amount) =>
        set((s) => {
          const x = s.subOrders[subId];
          if (!x || !x.issue) return;
          const o = s.orders[x.orderId];
          x.issue.adminDecision = decision;
          x.issue.status = 'closed';
          if (decision === 'reprint') x.status = 'reprint';
          else if (decision === 'refund') {
            x.status = 'refunded';
            x.refundAmount = x.total;
          } else if (decision === 'partial_refund') {
            x.status = 'partial_refund';
            x.refundAmount = Math.min(amount ?? 0, x.total);
          } else x.status = 'completed';
          const label = decision === 'rejected' ? 'Printloom upheld the shop decision' : `Printloom decided: ${decision.replace('_', ' ')}`;
          addTimeline(x, 'admin', 'Printloom support', label, x.status);
          notify(s, x.customerId, 'dispute', 'Dispute decided', `${label} for order ${o.number}.`, `/orders/${o.id}`);
          notify(s, x.vendorId, 'dispute', 'Dispute decided', `${label} for order ${o.number}.`, `/vendor/orders/${x.id}`);
        }),
      updateSettings: (patch) => set((s) => void Object.assign(s.settings, patch)),

      // ---------- simulate ----------
      sim: {
        outOfStock: (offeringId = 'of_v1_tee', color = 'Black', size = 'XL') => {
          get().updateOffering(offeringId, (o) => {
            const v = o.variants.find((x) => x.color === color && x.size === size);
            if (v) v.stock = 0;
          });
          const o = get().offerings[offeringId];
          return `${get().vendors[o.vendorId].shopName} ran out of ${color} / ${size}`;
        },
        designerDeliver: () => {
          const r = Object.values(get().requests).find((x) => ['in_progress', 'revision_requested'].includes(x.status));
          if (!r) return 'No request is waiting for a delivery';
          const pool = ['/designs/stay-wild.svg', '/designs/smile-club.svg', '/designs/monsoon-mood.svg'];
          get().uploadDelivery(r.id, pool[r.deliveries.length % pool.length], 'Here is the next version, let me know what you think.');
          return `${personaName(r.designerId ?? '')} delivered ${r.title}`;
        },
        advanceOrder: () => {
          const sub = Object.values(get().subOrders)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .find((x) => NEXT_ORDER_STATUS[x.status]);
          if (!sub) return 'No order can move forward';
          const next = NEXT_ORDER_STATUS[sub.status];
          get().advanceSubOrder(sub.id, next === 'delivered' || next === 'completed' ? 'system' : 'vendor');
          return `Order ${get().orders[sub.orderId].number} moved to ${ORDER_STATUS_LABEL[next!].toLowerCase()}`;
        },
        priceIncrease: (vendorId = 'v1', pct = 10) => {
          Object.values(get().offerings)
            .filter((o) => o.vendorId === vendorId)
            .forEach((o) => get().updateOffering(o.id, (x) => void (x.pricing.basePrice = Math.round((x.pricing.basePrice * (1 + pct / 100)) / 5) * 5)));
          return `${get().vendors[vendorId].shopName} raised prices by ${pct}%`;
        },
        flagDesign: (designId) => {
          const s = get();
          const inCart = Object.values(s.carts).flat().flatMap((l) => l.customization.layers.map((x) => x.designId)).find((id) => id && s.designs[id]?.status === 'published' && !s.designs[id].isPrivate);
          const id = designId ?? inCart ?? Object.values(s.designs).find((d) => d.status === 'published' && !d.isPrivate)?.id;
          if (!id) return 'No published design to flag';
          get().reportDesign(id, 'c3', 'copyright', 'Flagged from the Simulate menu');
          return `${get().designs[id].title} was flagged`;
        },
        pauseVendor: (vendorId = 'v1') => {
          const v = get().vendors[vendorId];
          get().setVendorPaused(vendorId, v.status !== 'paused', 'Back soon, we are restocking blanks.');
          return `${v.shopName} is now ${get().vendors[vendorId].status}`;
        },
        togglePaymentFail: () => {
          set((s) => void (s.simulate.paymentFail = !s.simulate.paymentFail));
          return get().simulate.paymentFail ? 'Next payment will fail' : 'Payments work normally again';
        },
        expireRequest: () => {
          const r = Object.values(get().requests).find((x) => ['open', 'sent', 'proposals_received'].includes(x.status));
          if (!r) return 'No open request to expire';
          set((s) => {
            const x = s.requests[r.id];
            x.status = 'expired';
            x.deadline = addDays(new Date(), -1).toISOString();
            x.timeline.push(tl('system', 'Printloom', 'Expired, no proposal accepted before the deadline', new Date().toISOString(), 'expired'));
            notify(s, x.customerId, 'expired', 'Request expired', `${x.title} passed its deadline. Extend it or repost.`, `/requests/${x.id}`);
          });
          return `${r.title} expired`;
        },
        escalateIssue: () => {
          const s = get();
          const sub =
            Object.values(s.subOrders).find((x) => x.status === 'issue_rejected') ?? Object.values(s.subOrders).find((x) => x.status === 'issue_reported' && x.issue?.status === 'open');
          if (!sub) return 'No open issue to escalate';
          if (sub.status === 'issue_reported') get().resolveIssue(sub.id, 'rejected', { reason: 'The print matches the proof you approved.' });
          get().escalateIssue(sub.id);
          return `Order ${get().orders[sub.orderId].number} was escalated to Printloom`;
        },
        lateDelivery: () => {
          const sub = Object.values(get().subOrders).find((x) => ['shipped', 'in_production', 'quality_check', 'accepted'].includes(x.status));
          if (!sub) return 'No order in transit';
          set((s) => void (s.subOrders[sub.id].estDelivery = addDays(new Date(), -1).toISOString()));
          return `Order ${get().orders[sub.orderId].number} is now late`;
        },
        expirePromotion: () => {
          let name = '';
          Object.values(get().offerings).forEach((o) => {
            if (o.pricing.promotions.some((p) => p.active)) {
              get().updateOffering(o.id, (x) =>
                x.pricing.promotions.forEach((p) => {
                  if (p.active) {
                    name = p.name;
                    p.endsAt = addDays(new Date(), -1).toISOString();
                    p.active = false;
                  }
                }),
              );
            }
          });
          return name ? `Promotion "${name}" expired` : 'No active promotion to expire';
        },
        fillCapacity: (vendorId = 'v1') => {
          Object.values(get().offerings)
            .filter((o) => o.vendorId === vendorId)
            .forEach((o) => get().updateOffering(o.id, (x) => void (x.production.bookedToday = x.production.dailyCapacity - 2), { silent: true }));
          return `${get().vendors[vendorId].shopName} is almost at capacity today`;
        },
        autoComplete: () => {
          const subs = Object.values(get().subOrders).filter((x) => x.status === 'delivered');
          subs.forEach((x) => get().advanceSubOrder(x.id, 'system'));
          return subs.length ? `${subs.length} delivered order${subs.length > 1 ? 's' : ''} auto-completed` : 'No delivered orders to complete';
        },
      },
    })),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // functions are not persisted
        const { sim: _sim, ...rest } = s;
        void _sim;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as Partial<StoreState>;
      },
      migrate: () => ({ ...createSeed(), ...initialUI() }) as unknown as StoreState,
    },
  ),
);

// ---------- persona helpers ----------

export const useRole = () => useStore((s) => s.role);
export const usePersonaId = (role: Role) => useStore((s) => s.personas[role]);
export const useCustomerId = () => useStore((s) => s.personas.customer);
export const useVendorId = () => useStore((s) => s.personas.vendor);
export const useDesignerId = () => useStore((s) => s.personas.designer);
export const useCurrency = () => useStore((s) => s.currency);

export type { OrderLine };
