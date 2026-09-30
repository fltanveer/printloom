'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { MessageSquareReply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Progress } from '@/components/ui/misc';
import { Ago, Avatar, EmptyState, ListSkeleton, PageHeader, Rating, useFakeLoading } from '@/components/shared/bits';
import { useVendor } from '@/components/vendor/useVendor';

export default function ReviewsPage() {
  const loading = useFakeLoading();
  const { data, vendorId, vendor } = useVendor();
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [open, setOpen] = React.useState<string | null>(null);
  const reviews = React.useMemo(() => data.reviews.filter((r) => r.target === 'vendor' && r.targetId === vendorId).sort((a, b) => b.at.localeCompare(a.at)), [data.reviews, vendorId]);

  if (loading || !vendor) return <ListSkeleton rows={4} />;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));

  const send = (id: string) => {
    const text = (drafts[id] ?? '').trim();
    if (text.length < 3) return toast.error('Write a short reply first');
    data.replyReview(id, text);
    setOpen(null);
    toast.success('Reply posted. The customer has been notified.');
  };

  return (
    <div>
      <PageHeader title="Reviews" subtitle="Replying to every review, good or bad, builds trust with new customers." />
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <div className="font-display text-4xl font-bold">{vendor.rating.toFixed(1)}</div>
          <Rating value={vendor.rating} count={vendor.reviewCount} />
          <p className="mt-1 text-xs text-muted">Overall rating across all orders</p>
          <div className="mt-4 space-y-1.5">
            {dist.map((d) => (
              <div key={d.n} className="flex items-center gap-2 text-xs">
                <span className="w-6 tabular-nums">{d.n}★</span>
                <Progress value={reviews.length ? (d.c / reviews.length) * 100 : 0} className="flex-1" tone="#F59E0B" />
                <span className="w-5 text-right tabular-nums text-muted">{d.c}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          {!reviews.length ? (
            <EmptyState kind="spark" body="No reviews yet. They show up here after customers get their orders." />
          ) : (
            reviews.map((r) => {
              const c = data.customers[r.customerId];
              return (
                <Card key={r.id} className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={c?.name ?? 'Customer'} src={c?.avatar} size={40} color="#6D4AFF" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold">{c?.name ?? 'Customer'}</span>
                        <Rating value={r.rating} />
                        <span className="text-xs text-muted">
                          <Ago at={r.at} />
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{r.text}</p>
                      {r.reply && open !== r.id ? (
                        <div className="mt-3 rounded-input border-l-4 border-accent bg-surface-2 p-3 text-sm">
                          <div className="text-xs font-semibold text-accent-text">Your reply</div>
                          {r.reply}
                          <div>
                            <Button
                              variant="link"
                              size="sm"
                              className="mt-1"
                              onClick={() => {
                                setDrafts((d) => ({ ...d, [r.id]: r.reply ?? '' }));
                                setOpen(r.id);
                              }}
                            >
                              Edit reply
                            </Button>
                          </div>
                        </div>
                      ) : open === r.id ? (
                        <div className="mt-3 space-y-2">
                          <Textarea value={drafts[r.id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))} placeholder="Thanks for ordering with us!" aria-label="Reply" autoFocus />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setOpen(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => send(r.id)}>
                              Post reply
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="secondary" size="sm" className="mt-3" onClick={() => setOpen(r.id)}>
                          <MessageSquareReply className="h-4 w-4" /> Reply
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
