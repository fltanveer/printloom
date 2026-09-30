'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, Eye, EyeOff, Flag, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { designerEarnings } from '@/lib/selectors';
import { canDesignTransition } from '@/lib/stateMachines';
import type { Design, DesignStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { Ago, EmptyState, GridSkeleton, PageHeader, SafeImage, Truncate, useFakeLoading } from '@/components/shared/bits';
import { STATUS_EXPLAIN, useActiveDesigner } from '@/components/designer/bits';

type Filter = 'all' | DesignStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'unpublished', label: 'Unpublished' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'removed', label: 'Removed' },
];


export default function MyDesignsPage() {
  const loading = useFakeLoading();
  const state = useStore();
  const { id } = useActiveDesigner();
  const [filter, setFilter] = React.useState<Filter>('all');
  const [reportsFor, setReportsFor] = React.useState<Design | null>(null);
  const [deleting, setDeleting] = React.useState<Design | null>(null);
  const [blocked, setBlocked] = React.useState<{ title: string; reason: string } | null>(null);

  const e = React.useMemo(() => designerEarnings(state, id), [state, id]);
  const mine = React.useMemo(() => Object.values(state.designs).filter((d) => d.designerId === id && !d.isPrivate).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [state.designs, id]);
  const list = filter === 'all' ? mine : mine.filter((d) => d.status === filter);
  const count = (f: Filter) => (f === 'all' ? mine.length : mine.filter((d) => d.status === f).length);

  const toggle = (d: Design) => {
    const to: DesignStatus = d.status === 'published' ? 'unpublished' : 'published';
    if (!canDesignTransition(d.status, to, 'designer')) {
      toast.error(`A ${d.status} design can't be ${to === 'published' ? 'published' : 'unpublished'} by you.`);
      return;
    }
    const r = state.setDesignStatus(d.id, to);
    if (!r.ok) toast.error(r.reasons.join(' '));
    else toast.success(to === 'published' ? `${d.title} is live in the library.` : `${d.title} is hidden from the library. Existing orders are not affected.`);
  };

  const doDelete = (d: Design) => {
    const r = state.deleteDesign(d.id);
    if (!r.ok) {
      setBlocked({ title: d.title, reason: r.reasons.join(' ') });
      toast.error(r.reasons.join(' '));
    } else toast.success(`${d.title} deleted.`);
  };

  const reports = reportsFor ? state.reports.filter((r) => r.designId === reportsFor.id) : [];

  return (
    <div>
      <PageHeader
        title="My designs"
        subtitle="Every published design earns a royalty each time it is printed."
        actions={
          <Button asChild>
            <Link href="/designer/designs/new">
              <Plus className="h-4 w-4" /> Upload design
            </Link>
          </Button>
        }
      />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="mb-4 w-full sm:w-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.id} value={f.id}>
              {f.label} <span className="text-xs text-muted">{count(f.id)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {blocked ? (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="flex-1">
            <p className="font-semibold">Can&apos;t delete {blocked.title}</p>
            <p className="text-muted">{blocked.reason}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setBlocked(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {loading ? (
        <GridSkeleton />
      ) : !mine.length ? (
        <EmptyState kind="shirt" title="No designs yet" body="Upload your first design and start earning on every print." action={<Button asChild><Link href="/designer/designs/new">Upload design</Link></Button>} />
      ) : !list.length ? (
        <EmptyState kind="search" body={`No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} designs.`} action={<Button variant="secondary" onClick={() => setFilter('all')}>Show all designs</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((d) => {
            const openReports = state.reports.filter((r) => r.designId === d.id).length;
            return (
              <Card key={d.id} className="flex flex-col overflow-hidden">
                <Link href={`/designer/designs/${d.id}`} className="relative block aspect-square bg-surface-2">
                  <SafeImage src={d.files.src} alt={d.title} className="h-full w-full" contain={d.files.transparent} />
                  <StatusPill status={d.status} className="absolute left-2 top-2 shadow-s1" />
                </Link>
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Truncate text={d.title} className="font-semibold" />
                      <p className="text-xs text-muted">
                        Added <Ago at={d.createdAt} />
                      </p>
                    </div>
                    <Dropdown>
                      <DropdownTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${d.title}`}>
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownContent align="end">
                        <DropdownItem asChild>
                          <Link href={`/designer/designs/${d.id}`}>
                            <Pencil className="h-4 w-4" /> Edit
                          </Link>
                        </DropdownItem>
                        {d.status === 'published' || canDesignTransition(d.status, 'published', 'designer') ? (
                          <DropdownItem onSelect={() => toggle(d)}>
                            {d.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {d.status === 'published' ? 'Unpublish' : 'Publish'}
                          </DropdownItem>
                        ) : null}
                        <DropdownItem onSelect={() => setReportsFor(d)}>
                          <Flag className="h-4 w-4" /> View reports ({openReports})
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem onSelect={() => setDeleting(d)} className="text-red-600 dark:text-red-400">
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownItem>
                      </DropdownContent>
                    </Dropdown>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Uses</dt>
                      <dd className="font-semibold tabular-nums">{d.uses}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Earned</dt>
                      <dd className="font-semibold">
                        <MoneyText value={e.byDesign[d.id] ?? 0} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Royalty</dt>
                      <dd className="font-semibold">
                        <MoneyText value={d.royalty.amount} />
                      </dd>
                    </div>
                  </dl>
                  {d.status === 'flagged' || d.status === 'removed' ? (
                    <p className="mt-2 rounded-input bg-warning/10 p-2 text-xs text-amber-800 dark:text-amber-200">{STATUS_EXPLAIN[d.status]}</p>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!reportsFor} onOpenChange={(o) => !o && setReportsFor(null)}>
        {reportsFor ? (
          <DialogContent title={`Reports for ${reportsFor.title}`} description={STATUS_EXPLAIN[reportsFor.status] ?? 'Reports from customers about this design.'}>
            {reports.length ? (
              <ul className="space-y-3">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-input border border-border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold capitalize">{r.reason}</span>
                      <StatusPill status={r.status === 'open' ? 'pending' : r.status === 'restored' ? 'resolved' : 'removed'} label={r.status === 'open' ? 'Under review' : r.status === 'restored' ? 'Restored' : 'Removed'} />
                    </div>
                    <p className="mt-1 text-muted">{r.note}</p>
                    <p className="mt-1 text-xs text-muted">
                      <Ago at={r.at} />
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState kind="spark" body="No reports. Nice and clean." />
            )}
          </DialogContent>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.title ?? 'design'}?`}
        description="This can't be undone. If the design is in open orders or carts, you will be asked to unpublish it instead."
        confirmLabel="Delete"
        danger
        onConfirm={() => deleting && doDelete(deleting)}
      />
    </div>
  );
}
