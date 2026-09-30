'use client';
import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Images, Rocket, Star, Trophy, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@/lib/store';
import { designerEarnings } from '@/lib/selectors';
import { formatDate, relativeDay } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState, KpiCard, ListSkeleton, PageHeader, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { Skeleton } from '@/components/ui/misc';
import { useActiveDesigner } from '@/components/designer/bits';

const ROYALTY_COLOR = '#FF3D8B';
const COMMISSION_COLOR = '#6D4AFF';

export default function DesignerDashboard() {
  const loading = useFakeLoading();
  const state = useStore();
  const { id, designer } = useActiveDesigner();
  const money = useMoney();

  const e = React.useMemo(() => designerEarnings(state, id), [state, id]);
  const myDesigns = React.useMemo(() => Object.values(state.designs).filter((d) => d.designerId === id && !d.isPrivate), [state.designs, id]);
  const requests = React.useMemo(() => Object.values(state.requests), [state.requests]);

  if (!designer) return <EmptyState body="Pick a designer persona in the Demo Bar to see this dashboard." />;

  const monthKey = new Date().toISOString().slice(0, 7);
  const thisMonth = e.byMonth.find((m) => m.month === monthKey);
  const monthTotal = (thisMonth?.royalties ?? 0) + (thisMonth?.commissions ?? 0);
  const last6 = e.byMonth.slice(-6);
  const totalUses = myDesigns.reduce((s, d) => s + d.uses, 0);
  const sent = requests.flatMap((r) => r.proposals.filter((p) => p.designerId === id));
  const won = sent.filter((p) => p.status === 'accepted').length;
  const winRate = sent.length ? Math.round((won / sent.length) * 100) : 0;

  const chartData = e.byMonth.slice(-8).map((m) => ({ month: formatDate(`${m.month}-15T00:00:00Z`, { month: 'short', year: '2-digit' }), Royalties: m.royalties, Commissions: m.commissions }));
  const top = [...myDesigns].sort((a, b) => (e.byDesign[b.id] ?? 0) - (e.byDesign[a.id] ?? 0) || b.uses - a.uses).slice(0, 5);
  const matching = requests
    .filter((r) => (r.status === 'open' || r.status === 'proposals_received') && !r.designerId && r.styleTags.some((t) => designer.tags.includes(t)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <PageHeader
        title={`Hi ${designer.name.split(' ')[0]}`}
        subtitle="Your designs, requests and earnings at a glance."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/designer/requests?tab=open">Browse requests</Link>
            </Button>
            <Button asChild>
              <Link href="/designer/designs/new">Upload design</Link>
            </Button>
          </>
        }
      />

      {!designer.onboarded ? (
        <Card className="mb-5 flex flex-col gap-3 border-accent/30 bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Rocket className="h-6 w-6 text-accent" />
            <div>
              <p className="font-semibold">Finish your profile to start taking requests</p>
              <p className="text-sm text-muted">Add a bio, specialties and your request settings.</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/designer/onboarding">Finish setup</Link>
          </Button>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Earnings this month" value={<MoneyText value={monthTotal} />} icon={<Wallet className="h-4 w-4" />} spark={last6.map((m) => m.royalties + m.commissions)} delta={e.royaltiesPending ? { text: `${money(e.royaltiesPending)} pending`, good: true } : null} />
          <KpiCard label="Design uses" value={totalUses.toLocaleString('en-US')} icon={<Images className="h-4 w-4" />} spark={[...myDesigns].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((d) => d.uses)} delta={{ text: `${myDesigns.filter((d) => d.status === 'published').length} published designs`, good: true }} />
          <KpiCard label="Request win rate" value={`${winRate}%`} icon={<Trophy className="h-4 w-4" />} spark={sent.map((_, i) => sent.slice(0, i + 1).filter((p) => p.status === 'accepted').length)} delta={{ text: `${won} of ${sent.length} proposals accepted`, good: winRate >= 30 }} />
          <KpiCard label="Rating" value={designer.rating.toFixed(1)} icon={<Star className="h-4 w-4" />} delta={{ text: `${designer.reviewCount} reviews`, good: designer.rating >= 4.5 }} />
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Earnings by month</h2>
            <Link href="/designer/earnings" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-accent-text">
              Details <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <Skeleton className="h-64" />
          ) : chartData.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v: number) => money(v)} />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)' }}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                    formatter={(v) => money(Number(v))}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                  <Bar dataKey="Royalties" stackId="a" fill={ROYALTY_COLOR} stroke="var(--surface)" strokeWidth={2} maxBarSize={36} />
                  <Bar dataKey="Commissions" stackId="a" fill={COMMISSION_COLOR} stroke="var(--surface)" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState kind="spark" body="No earnings yet. Every print of your designs and every finished request shows up here." />
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Top designs</h2>
          {loading ? (
            <ListSkeleton rows={4} />
          ) : top.length ? (
            <ol className="space-y-2">
              {top.map((d, i) => (
                <li key={d.id}>
                  <Link href={`/designer/designs/${d.id}`} className="flex items-center gap-3 rounded-input p-1.5 hover:bg-surface-2">
                    <span className="w-4 text-center text-sm font-bold text-muted">{i + 1}</span>
                    <SafeImage src={d.files.src} alt="" className="h-11 w-11 shrink-0 rounded-input" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{d.title}</p>
                      <p className="text-xs text-muted">{d.uses} uses</p>
                    </div>
                    <MoneyText value={e.byDesign[d.id] ?? 0} className="text-sm font-semibold" />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState kind="shirt" body="Upload your first design and start earning on every print." action={<Button asChild size="sm"><Link href="/designer/designs/new">Upload design</Link></Button>} />
          )}
        </Card>
      </div>

      <Card className="mt-5 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Open requests matching your tags</h2>
          <Link href="/designer/requests?tab=open" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-accent-text">
            Open board <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <ListSkeleton rows={2} />
        ) : matching.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {matching.slice(0, 6).map((r) => (
              <li key={r.id}>
                <Link href={`/designer/requests/${r.id}`} className="block rounded-card border border-border p-4 transition-colors hover:border-accent/60">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{r.title}</p>
                    <StatusPill status={r.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{r.brief}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-semibold text-text">
                      <MoneyText value={r.budget.min} /> to <MoneyText value={r.budget.max} />
                    </span>
                    <span>Due {relativeDay(r.deadline)}</span>
                    {r.styleTags.map((t) => (
                      <Badge key={t} tone={designer.tags.includes(t) ? 'accent' : 'neutral'}>
                        {t}
                      </Badge>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState kind="inbox" body="No open requests match your tags right now. Add more specialties to see more." action={<Button asChild variant="secondary" size="sm"><Link href="/designer/onboarding">Edit specialties</Link></Button>} />
        )}
      </Card>
    </div>
  );
}
