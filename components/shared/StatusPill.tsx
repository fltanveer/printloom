import * as React from 'react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { ORDER_STATUS_LABEL, REQUEST_STATUS_LABEL, DESIGN_STATUS_LABEL } from '@/lib/stateMachines';
import type { DesignStatus, OfferingStatus, OrderStatus, RequestStatus, VendorStatus } from '@/lib/types';

type AnyStatus = OrderStatus | RequestStatus | DesignStatus | OfferingStatus | VendorStatus | 'delayed' | 'open' | 'resolved' | 'rejected' | 'escalated' | 'closed' | 'pending' | 'accepted' | 'withdrawn' | 'paid' | 'processing' | 'onboarding';

// One color map for every status in the app
const TONE: Record<string, BadgeTone> = {
  placed: 'info',
  accepted: 'info',
  in_production: 'accent',
  quality_check: 'accent',
  shipped: 'info',
  delivered: 'success',
  completed: 'success',
  rejected_by_vendor: 'danger',
  reassigned: 'neutral',
  refunded: 'neutral',
  cancelled_by_customer: 'neutral',
  issue_reported: 'warning',
  reprint: 'accent',
  partial_refund: 'neutral',
  issue_rejected: 'danger',
  escalated: 'danger',
  delayed: 'danger',
  // requests
  draft: 'neutral',
  open: 'info',
  sent: 'info',
  proposals_received: 'accent',
  in_progress: 'accent',
  revision_requested: 'warning',
  approved: 'success',
  declined: 'danger',
  expired: 'neutral',
  // designs / offerings / vendors
  published: 'success',
  unpublished: 'neutral',
  flagged: 'warning',
  removed: 'danger',
  active: 'success',
  paused: 'warning',
  onboarding: 'info',
  // misc
  resolved: 'success',
  rejected: 'danger',
  closed: 'neutral',
  pending: 'warning',
  withdrawn: 'neutral',
  paid: 'success',
  processing: 'warning',
};

const LABEL: Record<string, string> = {
  ...ORDER_STATUS_LABEL,
  ...REQUEST_STATUS_LABEL,
  ...DESIGN_STATUS_LABEL,
  accepted: 'Accepted',
  active: 'Active',
  paused: 'Paused',
  onboarding: 'Setting up',
  delayed: 'Delayed',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
  pending: 'Pending',
  withdrawn: 'Withdrawn',
  paid: 'Paid',
  processing: 'Processing',
  open: 'Open',
  escalated: 'Escalated',
  draft: 'Draft',
};

export function StatusPill({ status, className, label }: { status: AnyStatus | string; className?: string; label?: string }) {
  const tone = TONE[status] ?? 'neutral';
  return (
    <Badge tone={tone} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {label ?? LABEL[status] ?? status.replace(/_/g, ' ')}
    </Badge>
  );
}
