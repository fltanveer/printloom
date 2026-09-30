'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Clock, MapPin, RefreshCw, Sparkles, Users, Megaphone } from 'lucide-react';
import { useStore } from '@/lib/store';
import { publicDesigns } from '@/lib/selectors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/misc';
import { MoneyText } from '@/components/shared/MoneyText';
import { Ago, Avatar, EmptyState, Rating, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { DesignCard } from '@/components/customer/cards';

export default function DesignerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const data = useStore();
  const loading = useFakeLoading();
  const designer = data.designers[id];

  if (loading)
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="mt-4 h-24 w-2/3" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );

  if (!designer)
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState kind="search" title="Designer not found" body="This profile does not exist anymore." action={<Button asChild><Link href="/designers">See all designers</Link></Button>} />
      </div>
    );

  const portfolio = publicDesigns(data)
    .filter((d) => d.designerId === designer.id)
    .sort((a, b) => b.uses - a.uses);
  const reviews = data.reviews.filter((r) => r.target === 'designer' && r.targetId === designer.id).sort((a, b) => b.at.localeCompare(a.at));
  const first = designer.name.split(' ')[0];

  return (
    <div className="pb-12">
      <div className="relative h-44 overflow-hidden sm:h-60">
        <SafeImage src={designer.cover} alt="" className="h-full w-full scale-105 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
      </div>
      <div className="mx-auto max-w-7xl px-4">
        <div className="relative -mt-16 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Avatar src={designer.avatar} name={designer.name} size={112} className="border-4 border-bg shadow-s3" />
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold sm:text-4xl">{designer.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <Rating value={designer.rating} count={designer.reviewCount} size="md" />
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {designer.location.city}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" /> {designer.followers.toLocaleString()} followers
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
            {designer.acceptsRequests ? (
              <Button asChild size="lg">
                <Link href={`/requests/new?designer=${designer.id}`}>
                  <Sparkles className="h-5 w-5" /> Request a design from {first}
                </Link>
              </Button>
            ) : (
              <>
                <span className="inline-block" title={`${first} is not taking requests right now`}>
                  <Button size="lg" disabled>
                    <Sparkles className="h-5 w-5" /> Request a design from {first}
                  </Button>
                </span>
                <p className="text-sm text-muted">{first} is not taking new requests right now.</p>
                <Button asChild variant="secondary">
                  <Link href="/requests/new">
                    <Megaphone className="h-4 w-4" /> Post publicly instead
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-card border border-border bg-surface p-5 shadow-s1">
              <h2 className="font-display text-lg font-semibold">About</h2>
              <p className="mt-2 text-sm text-muted">{designer.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {designer.tags.map((t) => (
                  <Link key={t} href={`/designs?tag=${encodeURIComponent(t)}`}>
                    <Badge tone="accent" className="min-h-[28px]">
                      {t}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <Stat icon={<Sparkles className="h-4 w-4 text-designer" />} label="Starting at" value={<MoneyText value={designer.startingPrice} />} />
              <Stat icon={<Clock className="h-4 w-4 text-info" />} label="Turnaround" value={`${designer.turnaroundDays} days`} />
              <Stat icon={<RefreshCw className="h-4 w-4 text-success" />} label="Revisions" value={`${designer.revisionLimit} included`} />
            </div>
          </aside>

          <div className="space-y-10">
            <section>
              <h2 className="mb-4 font-display text-xl font-bold">Portfolio ({portfolio.length})</h2>
              {portfolio.length ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                  {portfolio.map((d) => (
                    <DesignCard key={d.id} design={d} designer={designer} />
                  ))}
                </div>
              ) : (
                <EmptyState kind="spark" body={`${first} has no public designs yet. Ask for a custom one instead.`} />
              )}
            </section>
            <section>
              <h2 className="mb-4 font-display text-xl font-bold">Reviews ({reviews.length})</h2>
              {reviews.length ? (
                <ul className="space-y-3">
                  {reviews.map((r) => {
                    const c = data.customers[r.customerId];
                    return (
                      <li key={r.id} className="rounded-card border border-border bg-surface p-4 shadow-s1">
                        <div className="flex items-center gap-3">
                          <Avatar name={c?.name ?? 'Customer'} src={c?.avatar} size={36} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">{c?.name ?? 'Customer'}</div>
                            <div className="text-xs text-muted">
                              <Ago at={r.at} />
                            </div>
                          </div>
                          <Rating value={r.rating} />
                        </div>
                        <p className="mt-2 text-sm">{r.text}</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState kind="inbox" body="No reviews yet. Be the first to work with them." />
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-3 shadow-s1 lg:flex lg:items-center lg:justify-between lg:p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted lg:text-sm">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-base font-bold lg:mt-0 lg:text-lg">{value}</div>
    </div>
  );
}
