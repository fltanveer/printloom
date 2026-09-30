'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExternalLink, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { designerEarnings } from '@/lib/selectors';
import { canDesignTransition } from '@/lib/stateMachines';
import { maxPrintSize } from '@/lib/dpi';
import type { DesignStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/misc';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState, ErrorState, PageHeader, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { STATUS_EXPLAIN, useActiveDesigner } from '@/components/designer/bits';
import { MockupPreviewStrip } from '@/components/designer/MockupPreviewStrip';
import { DetailsFields, RoyaltyField, detailsErrors, royaltyError, type DetailsDraft } from '@/components/designer/DesignFields';

export default function EditDesignPage() {
  const params = useParams<{ id: string }>();
  const designId = params?.id ?? '';
  const loading = useFakeLoading();
  const router = useRouter();
  const state = useStore();
  const { id } = useActiveDesigner();
  const design = state.designs[designId];

  const [details, setDetails] = React.useState<DetailsDraft | null>(null);
  const [royalty, setRoyalty] = React.useState('');
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const [showErrors, setShowErrors] = React.useState(false);

  React.useEffect(() => {
    if (!design) return;
    setDetails({ title: design.title, description: design.description, tags: design.tags, categories: design.compatibleCategories });
    setRoyalty(String(design.royalty.amount));
    // load the draft once per design
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designId, !!design]);

  const e = React.useMemo(() => designerEarnings(state, id), [state, id]);

  if (loading) return <Skeleton className="h-[560px]" />;
  if (!design) return <EmptyState kind="search" title="Design not found" body="It may have been deleted." action={<Button asChild><Link href="/designer/designs">Back to My designs</Link></Button>} />;
  if (design.designerId !== id)
    return <EmptyState kind="search" title="Not your design" body="This design belongs to another designer. Switch persona in the Demo Bar to edit it." action={<Button asChild><Link href="/designer/designs">Back to My designs</Link></Button>} />;
  if (!details) return <Skeleton className="h-[560px]" />;

  const locked = design.status === 'flagged' || design.status === 'removed';
  const dirty =
    details.title !== design.title ||
    details.description !== design.description ||
    details.tags.join() !== design.tags.join() ||
    details.categories.join() !== design.compatibleCategories.join() ||
    royalty !== String(design.royalty.amount);

  const save = () => {
    const dErr = Object.values(detailsErrors(details));
    const rErr = royaltyError(royalty);
    if (dErr.length || rErr) {
      setShowErrors(true);
      toast.error([...dErr, rErr].filter(Boolean).join(' '));
      return;
    }
    state.updateDesign(design.id, (d) => {
      d.title = details.title.trim();
      d.description = details.description.trim();
      d.tags = details.tags;
      d.compatibleCategories = details.categories;
      d.royalty = { type: 'fixed', amount: Number(royalty) };
    });
    toast.success('Changes saved. New orders use the updated royalty.');
  };

  const setStatus = (to: DesignStatus) => {
    if (!canDesignTransition(design.status, to, 'designer')) {
      toast.error(`You can't move a ${design.status} design to ${to}.`);
      return;
    }
    const r = state.setDesignStatus(design.id, to);
    if (!r.ok) toast.error(r.reasons.join(' '));
    else toast.success(to === 'published' ? 'Published. It is live in the library.' : 'Unpublished. Existing orders are not affected.');
  };

  const del = () => {
    const r = state.deleteDesign(design.id);
    if (!r.ok) {
      setBlocked(r.reasons.join(' '));
      toast.error(r.reasons.join(' '));
      return;
    }
    toast.success(`${design.title} deleted.`);
    router.push('/designer/designs');
  };

  const f = design.files;
  return (
    <div className="pb-24 md:pb-0">
      <PageHeader
        title={design.title}
        back={{ href: '/designer/designs', label: 'My designs' }}
        subtitle={<StatusPill status={design.status} />}
        actions={
          <>
            {design.status === 'published' ? (
              <>
                <Button variant="secondary" asChild>
                  <Link href={`/designs/${design.id}`}>
                    <ExternalLink className="h-4 w-4" /> View in library
                  </Link>
                </Button>
                <Button variant="secondary" onClick={() => setStatus('unpublished')}>
                  <EyeOff className="h-4 w-4" /> Unpublish
                </Button>
              </>
            ) : canDesignTransition(design.status, 'published', 'designer') ? (
              <Button variant="secondary" onClick={() => setStatus('published')}>
                <Eye className="h-4 w-4" /> Publish
              </Button>
            ) : null}
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-red-600 dark:text-red-400">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              }
              title={`Delete ${design.title}?`}
              description="This can't be undone. Designs in open orders or carts can't be deleted, unpublish them instead."
              confirmLabel="Delete"
              danger
              onConfirm={del}
            />
          </>
        }
      />

      {STATUS_EXPLAIN[design.status] ? <p className="mb-4 rounded-card bg-surface-2 p-3 text-sm text-muted">{STATUS_EXPLAIN[design.status]}</p> : null}
      {blocked ? (
        <div className="mb-4">
          <ErrorState body={`Can't delete: ${blocked}`} />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit space-y-3 p-4">
          <div className="aspect-square overflow-hidden rounded-input bg-surface-2">
            <SafeImage src={f.src} alt={design.title} className="h-full w-full" contain />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted">File</dt>
              <dd className="font-semibold">{f.kind.toUpperCase()}{f.kind === 'svg' ? ', vector' : `, ${f.widthPx} x ${f.heightPx}`}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Prints sharp up to</dt>
              <dd className="font-semibold">{f.kind === 'svg' ? 'Any size' : maxPrintSize(f.widthPx, f.heightPx).label}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Uses</dt>
              <dd className="font-semibold tabular-nums">{design.uses}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Earned</dt>
              <dd className="font-semibold">
                <MoneyText value={e.byDesign[design.id] ?? 0} />
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted">{f.transparent ? 'Transparent background.' : 'Has a background, prints as a rectangle.'}</p>
        </Card>

        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">Details</h2>
            <fieldset disabled={locked} className="disabled:opacity-60">
              <DetailsFields value={details} onChange={setDetails} showErrors={showErrors} />
            </fieldset>
          </Card>
          <Card className="p-4 sm:p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">Royalty</h2>
            <fieldset disabled={locked} className="disabled:opacity-60">
              <RoyaltyField value={royalty} onChange={setRoyalty} />
            </fieldset>
          </Card>
          <Card className="p-4 sm:p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">Preview on products</h2>
            <MockupPreviewStrip src={f.src} widthPx={f.widthPx} heightPx={f.heightPx} categories={details.categories} />
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-end gap-2 border-t border-border bg-surface/95 p-3 backdrop-blur md:static md:mt-5 md:border-0 md:bg-transparent md:p-0">
        <Button
          variant="secondary"
          disabled={!dirty}
          onClick={() => {
            setDetails({ title: design.title, description: design.description, tags: design.tags, categories: design.compatibleCategories });
            setRoyalty(String(design.royalty.amount));
            setShowErrors(false);
          }}
        >
          Discard
        </Button>
        <Button onClick={save} disabled={!dirty || locked}>
          <Save className="h-4 w-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}
