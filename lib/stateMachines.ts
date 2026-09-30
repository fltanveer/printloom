// Order, request and design state machines (section 8).

import type { DesignStatus, OrderStatus, RequestStatus, Role } from './types';

type Actor = Role | 'system';

interface Transition<S> {
  from: S[];
  to: S;
  actors: Actor[];
}

export const ORDER_TRANSITIONS: Transition<OrderStatus>[] = [
  { from: ['placed'], to: 'accepted', actors: ['vendor'] },
  { from: ['placed'], to: 'rejected_by_vendor', actors: ['vendor'] },
  { from: ['accepted', 'reprint'], to: 'in_production', actors: ['vendor'] },
  { from: ['in_production'], to: 'quality_check', actors: ['vendor'] },
  { from: ['quality_check'], to: 'shipped', actors: ['vendor'] },
  { from: ['shipped'], to: 'delivered', actors: ['vendor', 'system'] },
  { from: ['delivered', 'issue_rejected'], to: 'completed', actors: ['system', 'customer', 'admin'] },
  { from: ['rejected_by_vendor'], to: 'reassigned', actors: ['customer'] },
  { from: ['rejected_by_vendor'], to: 'refunded', actors: ['customer', 'system', 'admin'] },
  { from: ['placed', 'accepted'], to: 'cancelled_by_customer', actors: ['customer'] },
  { from: ['delivered'], to: 'issue_reported', actors: ['customer'] },
  { from: ['issue_reported', 'escalated'], to: 'reprint', actors: ['vendor', 'admin'] },
  { from: ['issue_reported', 'escalated'], to: 'refunded', actors: ['vendor', 'admin'] },
  { from: ['issue_reported', 'escalated'], to: 'partial_refund', actors: ['vendor', 'admin'] },
  { from: ['issue_reported'], to: 'issue_rejected', actors: ['vendor'] },
  { from: ['issue_rejected'], to: 'escalated', actors: ['customer'] },
  { from: ['escalated'], to: 'issue_rejected', actors: ['admin'] },
];

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): boolean {
  return ORDER_TRANSITIONS.some((t) => t.to === to && t.from.includes(from) && t.actors.includes(actor));
}

/** The happy-path next status a vendor would move to. */
export const NEXT_ORDER_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: 'accepted',
  accepted: 'in_production',
  reprint: 'in_production',
  in_production: 'quality_check',
  quality_check: 'shipped',
  shipped: 'delivered',
  delivered: 'completed',
};

export const ORDER_FLOW: OrderStatus[] = ['placed', 'accepted', 'in_production', 'quality_check', 'shipped', 'delivered', 'completed'];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  accepted: 'Accepted',
  in_production: 'In production',
  quality_check: 'Quality check',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  rejected_by_vendor: 'Rejected by shop',
  reassigned: 'Reassigned',
  refunded: 'Refunded',
  cancelled_by_customer: 'Cancelled',
  issue_reported: 'Issue reported',
  reprint: 'Reprint',
  partial_refund: 'Partly refunded',
  issue_rejected: 'Issue rejected',
  escalated: 'Escalated',
};

export function canCustomerCancel(s: OrderStatus): boolean {
  return s === 'placed' || s === 'accepted';
}

export const ISSUE_WINDOW_DAYS = 7;
export const AUTO_COMPLETE_DAYS = 3;

export function canReportIssue(s: OrderStatus, deliveredAt: string | undefined, now: Date): boolean {
  if (s !== 'delivered' && s !== 'completed') return false;
  if (!deliveredAt) return false;
  return now.getTime() - new Date(deliveredAt).getTime() <= ISSUE_WINDOW_DAYS * 86400000;
}

export function canReview(s: OrderStatus): boolean {
  return ['delivered', 'completed', 'issue_reported', 'reprint', 'partial_refund', 'issue_rejected', 'escalated'].includes(s);
}

/** Step index for the horizontal mini stepper. */
export function orderStepIndex(s: OrderStatus): number {
  const i = ORDER_FLOW.indexOf(s);
  if (i >= 0) return i;
  if (s === 'reprint') return 2;
  if (['issue_reported', 'partial_refund', 'issue_rejected', 'escalated'].includes(s)) return 5;
  return 0;
}

export function isOrderOpen(s: OrderStatus): boolean {
  return !['completed', 'refunded', 'cancelled_by_customer', 'reassigned', 'partial_refund'].includes(s);
}

export function isOrderTerminalNegative(s: OrderStatus): boolean {
  return ['refunded', 'cancelled_by_customer', 'reassigned', 'rejected_by_vendor'].includes(s);
}

// ---------- requests ----------

export const REQUEST_TRANSITIONS: Transition<RequestStatus>[] = [
  { from: ['draft'], to: 'open', actors: ['customer'] },
  { from: ['draft'], to: 'sent', actors: ['customer'] },
  { from: ['open'], to: 'proposals_received', actors: ['designer'] },
  { from: ['proposals_received', 'sent'], to: 'accepted', actors: ['customer', 'designer'] },
  { from: ['accepted'], to: 'in_progress', actors: ['designer', 'system'] },
  { from: ['in_progress', 'revision_requested'], to: 'delivered', actors: ['designer'] },
  { from: ['delivered'], to: 'revision_requested', actors: ['customer'] },
  { from: ['delivered'], to: 'approved', actors: ['customer'] },
  { from: ['approved'], to: 'completed', actors: ['system'] },
  { from: ['sent'], to: 'declined', actors: ['designer'] },
  { from: ['open', 'sent', 'proposals_received'], to: 'expired', actors: ['system'] },
  { from: ['draft', 'open', 'sent', 'proposals_received'], to: 'cancelled_by_customer', actors: ['customer'] },
  { from: ['expired', 'declined'], to: 'open', actors: ['customer'] },
];

export function canRequestTransition(from: RequestStatus, to: RequestStatus, actor: Actor): boolean {
  return REQUEST_TRANSITIONS.some((t) => t.to === to && t.from.includes(from) && t.actors.includes(actor));
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  sent: 'Sent',
  proposals_received: 'Proposals received',
  accepted: 'Accepted',
  in_progress: 'In progress',
  delivered: 'Delivered',
  revision_requested: 'Revision requested',
  approved: 'Approved',
  completed: 'Completed',
  declined: 'Declined',
  expired: 'Expired',
  cancelled_by_customer: 'Cancelled',
};

export function isRequestPreAccept(s: RequestStatus): boolean {
  return ['draft', 'open', 'sent', 'proposals_received'].includes(s);
}

export function isRequestActive(s: RequestStatus): boolean {
  return ['accepted', 'in_progress', 'delivered', 'revision_requested'].includes(s);
}

// ---------- designs ----------

export const DESIGN_TRANSITIONS: Transition<DesignStatus>[] = [
  { from: ['draft', 'unpublished'], to: 'published', actors: ['designer'] },
  { from: ['published'], to: 'unpublished', actors: ['designer'] },
  { from: ['published'], to: 'flagged', actors: ['customer', 'admin', 'system'] },
  { from: ['flagged'], to: 'published', actors: ['admin'] },
  { from: ['flagged', 'published', 'unpublished'], to: 'removed', actors: ['admin'] },
];

export function canDesignTransition(from: DesignStatus, to: DesignStatus, actor: Actor): boolean {
  return DESIGN_TRANSITIONS.some((t) => t.to === to && t.from.includes(from) && t.actors.includes(actor));
}

export const DESIGN_STATUS_LABEL: Record<DesignStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  unpublished: 'Unpublished',
  flagged: 'Flagged',
  removed: 'Removed',
};
