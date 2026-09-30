'use client';
import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Palette, ShieldCheck, Store, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { customerAddress, publicDesigns } from '@/lib/selectors';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { EmptyState, GridSkeleton, SafeImage, useFakeLoading } from '@/components/shared/bits';
import { HeroMockup } from '@/components/customer/HeroMockup';
import { DesignCard, DesignerCard, SectionHeader, ShopCard } from '@/components/customer/cards';
import { CATEGORY_LABEL, defaultColorHex, vendorsNear } from '@/components/customer/shopPricing';

export default function HomePage() {
  const data = useStore();
  const customerId = data.personas.customer;
  const loading = useFakeLoading();
  const addr = customerAddress(data, customerId);

  const products = React.useMemo(() => Object.values(data.products).sort((a, b) => b.popularity - a.popularity), [data.products]);
  const trending = React.useMemo(() => publicDesigns(data).sort((a, b) => b.uses - a.uses).slice(0, 10), [data]);
  const designers = React.useMemo(() => Object.values(data.designers).filter((d) => d.onboarded).sort((a, b) => b.rating - a.rating), [data.designers]);
  const shops = React.useMemo(() => vendorsNear(data, customerId).slice(0, 4), [data, customerId]);

  return (
    <div className="pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-accent-soft via-bg to-bg">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-designer/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-vendor/15 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-accent-text shadow-s1">
              <Sparkles className="h-3.5 w-3.5" /> Local shops compete for your order
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Design anything.
              <br />
              <span className="bg-gradient-to-r from-customer via-designer to-vendor bg-clip-text text-transparent">Printed by the best local shop.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted sm:text-lg">
              Put your idea on a tee, hoodie, mug or jersey. See the exact price from every shop near you, pick one, done. No surprises at checkout.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/catalog">
                  Start designing <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/requests/new">
                  <Palette className="h-5 w-5 text-designer" /> Request a custom design
                </Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-success" /> Exact price, always
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Store className="h-4 w-4 text-vendor" /> {Object.values(data.vendors).filter((v) => v.status === 'active').length} shops across Bangladesh
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Palette className="h-4 w-4 text-designer" /> {publicDesigns(data).length} designs ready to use
              </li>
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -left-6 bottom-16 hidden w-40 -rotate-6 overflow-hidden rounded-card border-4 border-surface shadow-s3 sm:block">
              <SafeImage src="/stock/hero.jpg" alt="People wearing custom printed tees" className="aspect-[4/5] w-full" />
            </div>
            <HeroMockup className="mx-auto w-full max-w-[340px]" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 pt-10">
        {/* Categories */}
        <section aria-labelledby="cat-h">
          <SectionHeader title="What are we printing?" subtitle="Pick a product to start" href="/catalog" linkLabel="All products" />
          {loading ? (
            <div className="no-scrollbar flex gap-3 overflow-x-auto">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-32 shrink-0" />
              ))}
            </div>
          ) : (
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-9 lg:overflow-visible lg:px-0">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/catalog?category=${p.category}`}
                  className="group flex w-32 shrink-0 snap-start flex-col items-center rounded-card border border-border bg-surface p-3 text-center shadow-s1 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-s2 lg:w-auto"
                >
                  <div className="w-full rounded-input bg-accent-soft p-2">
                    <MockupRenderer product={p} colorHex={defaultColorHex(data, p.id)} className="transition-transform group-hover:scale-105" />
                  </div>
                  <span className="mt-2 text-sm font-semibold">{CATEGORY_LABEL[p.category]}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Trending designs */}
        <section>
          <SectionHeader title="Trending designs" subtitle="Most printed this month. Tap one to put it on anything." href="/designs" />
          {loading ? (
            <GridSkeleton items={5} className="lg:grid-cols-5" />
          ) : trending.length ? (
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {trending.map((d) => (
                <DesignCard key={d.id} design={d} designer={d.designerId ? data.designers[d.designerId] : undefined} className="w-44 shrink-0 snap-start sm:w-52" />
              ))}
            </div>
          ) : (
            <EmptyState kind="spark" body="No designs are live right now. Check back soon or upload your own in the customizer." action={<Button asChild><Link href="/catalog">Start designing</Link></Button>} />
          )}
        </section>

        {/* Featured designers */}
        <section>
          <SectionHeader title="Featured designers" subtitle="Hire a local artist for something one of a kind" href="/designers" />
          {loading ? (
            <GridSkeleton items={4} />
          ) : (
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
              {designers.map((d) => (
                <DesignerCard key={d.id} designer={d} className="w-64 shrink-0 snap-start lg:w-auto" />
              ))}
            </div>
          )}
        </section>

        {/* Shops near you */}
        <section>
          <SectionHeader title="Top shops near you" subtitle={addr ? `Closest to ${addr.city}, ${addr.division} first` : 'Add an address to see shops near you'} />
          {loading ? (
            <GridSkeleton items={4} />
          ) : shops.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shops.map(({ vendor, zone }) => (
                <ShopCard key={vendor.id} vendor={vendor} zone={zone} data={data} />
              ))}
            </div>
          ) : (
            <EmptyState kind="box" body="No shops are open right now. They will be back soon." />
          )}
        </section>

        {/* Team banner */}
        <section className="relative overflow-hidden rounded-sheet bg-[#1B1340] text-white shadow-s3">
          <SafeImage src="/stock/team.jpg" alt="A team in matching printed jerseys" className="absolute inset-0 h-full w-full opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B1340] via-[#1B1340]/85 to-transparent" />
          <div className="relative max-w-xl p-6 sm:p-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Users className="h-3.5 w-3.5" /> Teams, events, offices
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Team and event orders</h2>
            <p className="mt-2 text-white/80">One design, every size in one grid. Prices drop automatically as your order grows, and bulk shops compete for it.</p>
            <Button asChild size="lg" className="mt-5 bg-white text-[#1B1340] hover:bg-white/90">
              <Link href="/product/p_tee?mode=bulk">
                Start a team order <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
