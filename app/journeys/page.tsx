'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  ClipboardList,
  CreditCard,
  FileHeart,
  Gavel,
  Home,
  Inbox,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  Package,
  Palette,
  PenTool,
  Rocket,
  Search,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Upload,
  User,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { PERSONAS, COLORS } from '@/lib/seed';
import { subOrdersForVendor } from '@/lib/selectors';
import type { AppData, Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { ROLE_COLOR, RoleBadge } from '@/components/shared/bits';
import { Logo } from '@/components/shell/CustomerShell';
import { fitDesignLayer } from '@/components/customer/shopPricing';

interface Screen {
  key: string;
  name: string;
  href: string;
  persona: string;
  icon: LucideIcon;
  note?: string;
  mock?: { productId: string; color: keyof typeof COLORS; designId?: string };
}

interface Lane {
  role: Role;
  title: string;
  blurb: string;
  screens: Screen[];
}

function buildLanes(data: AppData): Lane[] {
  const c1Orders = Object.values(data.orders)
    .filter((o) => o.customerId === 'c1')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const c1Order = c1Orders[0]?.id;
  const v1Sub = subOrdersForVendor(data, 'v1')[0]?.id;
  const c1Req = Object.values(data.requests).find((r) => r.customerId === 'c1' && r.status === 'in_progress')?.id ?? 'rq_4';
  return [
    {
      role: 'customer',
      title: 'Customer',
      blurb: 'Browse, design, compare shops, order and track.',
      screens: [
        { key: 'home', name: 'Home', href: '/', persona: 'c1', icon: Home, mock: { productId: 'p_tee', color: 'Black', designId: 'ds_19' } },
        { key: 'catalog', name: 'Catalog', href: '/catalog?category=tshirt', persona: 'c1', icon: LayoutGrid },
        { key: 'library', name: 'Design library', href: '/designs?tag=cute', persona: 'c1', icon: Palette },
        { key: 'design', name: 'Design detail', href: '/designs/ds_19', persona: 'c1', icon: FileHeart, mock: { productId: 'p_hoodie', color: 'Cream', designId: 'ds_19' } },
        { key: 'designers', name: 'Designers', href: '/designers', persona: 'c1', icon: Users },
        { key: 'dprofile', name: 'Designer profile', href: '/designer-profile/d1', persona: 'c1', icon: PenTool },
        { key: 'shop', name: 'Shop storefront', href: '/shop/v1', persona: 'c1', icon: Store },
        { key: 'product', name: 'Customizer', href: '/product/p_tee', persona: 'c1', icon: Sparkles, mock: { productId: 'p_tee', color: 'White', designId: 'ds_22' } },
        { key: 'product-vendor', name: 'Customizer locked to shop', href: '/product/p_tee?vendor=v1', persona: 'c1', icon: Store, note: 'From a storefront' },
        { key: 'product-design', name: 'Customizer with design', href: '/product/p_tee?design=ds_19', persona: 'c1', icon: FileHeart, mock: { productId: 'p_tee', color: 'Navy', designId: 'ds_19' } },
        { key: 'product-bulk', name: 'Team order (size grid)', href: '/product/p_tee?mode=bulk', persona: 'c1', icon: Users, mock: { productId: 'p_jersey', color: 'White', designId: 'ds_25' } },
        { key: 'cart', name: 'Cart', href: '/cart', persona: 'c1', icon: ShoppingBag },
        { key: 'checkout', name: 'Checkout', href: '/checkout', persona: 'c1', icon: CreditCard },
        { key: 'orders', name: 'Orders', href: '/orders', persona: 'c1', icon: Package },
        { key: 'order', name: 'Order tracking', href: c1Order ? `/orders/${c1Order}` : '/orders', persona: 'c1', icon: ClipboardList, note: 'Report, review, cancel' },
        { key: 'requests', name: 'My requests', href: '/requests', persona: 'c1', icon: Inbox },
        { key: 'request-new', name: 'New design request', href: '/requests/new?designer=d1&product=p_tee', persona: 'c1', icon: Sparkles },
        { key: 'request', name: 'Request with proposals', href: '/requests/rq_2', persona: 'c2', icon: MessageSquare, note: '2 proposals waiting' },
        { key: 'request-active', name: 'Request in progress', href: `/requests/${c1Req}`, persona: 'c1', icon: MessageSquare },
        { key: 'request-delivered', name: 'Review a delivery', href: '/requests/rq_5', persona: 'c2', icon: BadgeCheck },
        { key: 'account', name: 'Account', href: '/account?tab=orders', persona: 'c1', icon: User },
        { key: 'account-designs', name: 'My designs', href: '/account?tab=designs', persona: 'c1', icon: Palette },
        { key: 'account-fav', name: 'Favorites', href: '/account?tab=favorites', persona: 'c1', icon: FileHeart },
        { key: 'account-req', name: 'Account requests', href: '/account?tab=requests', persona: 'c1', icon: Inbox },
        { key: 'account-addr', name: 'Addresses', href: '/account?tab=addresses', persona: 'c1', icon: Home },
        { key: 'account-pay', name: 'Payment methods', href: '/account?tab=payments', persona: 'c1', icon: Wallet },
        { key: 'account-notif', name: 'Notifications', href: '/account?tab=notifications', persona: 'c1', icon: Bell },
      ],
    },
    {
      role: 'vendor',
      title: 'Vendor (print shop)',
      blurb: 'Set up offerings and prices, then work the order queue.',
      screens: [
        { key: 'v-dash', name: 'Dashboard', href: '/vendor', persona: 'v1', icon: BarChart3 },
        { key: 'v-onb', name: 'Onboarding checklist', href: '/vendor/onboarding', persona: 'v1', icon: ListChecks },
        { key: 'v-offs', name: 'Offerings', href: '/vendor/offerings', persona: 'v1', icon: LayoutGrid, mock: { productId: 'p_tee', color: 'Black' } },
        { key: 'v-off', name: 'Offering editor', href: '/vendor/offerings/of_v1_tee?tab=pricing', persona: 'v1', icon: Settings, note: 'Pricing and simulator' },
        { key: 'v-off-colors', name: 'Offering colors and stock', href: '/vendor/offerings/of_v1_tee?tab=colors', persona: 'v1', icon: Palette },
        { key: 'v-orders', name: 'Orders queue', href: '/vendor/orders?tab=new', persona: 'v1', icon: Inbox },
        { key: 'v-order', name: 'Order detail', href: v1Sub ? `/vendor/orders/${v1Sub}` : '/vendor/orders', persona: 'v1', icon: ClipboardList },
        { key: 'v-issues', name: 'Issues', href: '/vendor/issues', persona: 'v2', icon: ShieldAlert, note: 'Open print quality issue' },
        { key: 'v-reviews', name: 'Reviews', href: '/vendor/reviews', persona: 'v1', icon: Star },
        { key: 'v-payouts', name: 'Payouts', href: '/vendor/payouts', persona: 'v1', icon: Wallet },
        { key: 'v-settings', name: 'Settings', href: '/vendor/settings', persona: 'v1', icon: Settings },
      ],
    },
    {
      role: 'designer',
      title: 'Designer',
      blurb: 'Publish designs, earn royalties, win commissions.',
      screens: [
        { key: 'd-dash', name: 'Dashboard', href: '/designer', persona: 'd1', icon: BarChart3 },
        { key: 'd-onb', name: 'Onboarding', href: '/designer/onboarding', persona: 'd1', icon: ListChecks },
        { key: 'd-designs', name: 'My designs', href: '/designer/designs', persona: 'd1', icon: Palette, mock: { productId: 'p_tee', color: 'White', designId: 'ds_13' } },
        { key: 'd-new', name: 'Upload design', href: '/designer/designs/new', persona: 'd1', icon: Upload },
        { key: 'd-design', name: 'Design editor', href: '/designer/designs/ds_13', persona: 'd1', icon: PenTool },
        { key: 'd-reqs', name: 'Requests inbox', href: '/designer/requests?tab=direct', persona: 'd3', icon: Inbox, note: 'Direct request waiting' },
        { key: 'd-open', name: 'Open requests board', href: '/designer/requests?tab=open', persona: 'd1', icon: Search },
        { key: 'd-req', name: 'Request workspace', href: '/designer/requests/rq_4', persona: 'd1', icon: MessageSquare },
        { key: 'd-earn', name: 'Earnings', href: '/designer/earnings', persona: 'd1', icon: Wallet },
        { key: 'd-profile', name: 'Public profile editor', href: '/designer/profile', persona: 'd1', icon: User },
      ],
    },
    {
      role: 'admin',
      title: 'Admin',
      blurb: 'Watch the marketplace, moderate, settle disputes.',
      screens: [
        { key: 'a-dash', name: 'Overview', href: '/admin', persona: 'a1', icon: BarChart3 },
        { key: 'a-orders', name: 'All orders', href: '/admin/orders', persona: 'a1', icon: Package },
        { key: 'a-mod', name: 'Moderation', href: '/admin/moderation', persona: 'a1', icon: ShieldAlert },
        { key: 'a-disp', name: 'Disputes', href: '/admin/disputes', persona: 'a1', icon: Gavel },
        { key: 'a-set', name: 'Platform settings', href: '/admin/settings', persona: 'a1', icon: Settings },
      ],
    },
  ];
}

interface Handoff {
  from: Role;
  to: Role;
  label: string;
  fromScreen: { name: string; href: string; persona: string };
  toScreen: { name: string; href: string; persona: string };
}

const HANDOFFS: Record<string, Handoff[]> = {
  'customer-vendor': [
    { from: 'customer', to: 'vendor', label: 'Order placed, lands in the vendor queue', fromScreen: { name: 'Checkout', href: '/checkout', persona: 'c1' }, toScreen: { name: 'Orders queue', href: '/vendor/orders?tab=new', persona: 'v1' } },
    { from: 'vendor', to: 'customer', label: 'Status updates reach the order timeline', fromScreen: { name: 'Order detail', href: '/vendor/orders', persona: 'v1' }, toScreen: { name: 'Orders', href: '/orders', persona: 'c1' } },
    { from: 'customer', to: 'vendor', label: 'Problem reported, appears in Issues', fromScreen: { name: 'Orders', href: '/orders', persona: 'c2' }, toScreen: { name: 'Issues', href: '/vendor/issues', persona: 'v2' } },
  ],
  'vendor-designer': [
    { from: 'customer', to: 'designer', label: 'Request sent, lands in the designer inbox', fromScreen: { name: 'New request', href: '/requests/new?designer=d1&product=p_tee', persona: 'c1' }, toScreen: { name: 'Requests inbox', href: '/designer/requests?tab=direct', persona: 'd1' } },
    { from: 'designer', to: 'customer', label: 'Design published, appears in the library', fromScreen: { name: 'Upload design', href: '/designer/designs/new', persona: 'd1' }, toScreen: { name: 'Design library', href: '/designs', persona: 'c1' } },
    { from: 'customer', to: 'designer', label: 'Order placed, royalties pending in earnings', fromScreen: { name: 'Checkout', href: '/checkout', persona: 'c1' }, toScreen: { name: 'Earnings', href: '/designer/earnings', persona: 'd5' } },
  ],
  'designer-admin': [
    { from: 'customer', to: 'admin', label: 'Design reported, goes to moderation', fromScreen: { name: 'Design detail', href: '/designs/ds_19', persona: 'c1' }, toScreen: { name: 'Moderation', href: '/admin/moderation', persona: 'a1' } },
    { from: 'vendor', to: 'admin', label: 'Issue escalated, becomes a dispute', fromScreen: { name: 'Issues', href: '/vendor/issues', persona: 'v2' }, toScreen: { name: 'Disputes', href: '/admin/disputes', persona: 'a1' } },
    { from: 'admin', to: 'customer', label: 'Settings change prices everywhere', fromScreen: { name: 'Settings', href: '/admin/settings', persona: 'a1' }, toScreen: { name: 'Catalog', href: '/catalog', persona: 'c1' } },
  ],
};

const ROLE_OF = (id: string): Role => PERSONAS.find((p) => p.id === id)?.role ?? 'customer';
const NAME_OF = (id: string): string => PERSONAS.find((p) => p.id === id)?.name ?? id;

export default function JourneysPage() {
  const data = useStore();
  const role = useStore((s) => s.role);
  const setPersona = useStore((s) => s.setPersona);
  const router = useRouter();
  const lanes = React.useMemo(() => buildLanes(data), [data]);
  const total = lanes.reduce((n, l) => n + l.screens.length, 0);

  const open = (href: string, personaId: string) => {
    setPersona(ROLE_OF(personaId), personaId);
    router.push(href);
  };

  return (
    <div data-role={role} className="min-h-screen bg-bg pb-16">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-4">
          <Logo />
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">Journey map</span>
          <Button asChild variant="secondary" size="sm" className="ml-auto">
            <Link href="/">Back to the store</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4">
        <div className="py-8">
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold sm:text-4xl">
            <Workflow className="h-8 w-8 text-accent" /> Every screen, every role
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            {total} screens across four swimlanes. Each card opens the screen as the right persona. The strips between lanes show how one role&apos;s action shows up for another.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {lanes.map((l) => (
              <a key={l.role} href={`#lane-${l.role}`} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-semibold hover:border-accent/50">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLOR[l.role] }} />
                {l.title} ({l.screens.length})
              </a>
            ))}
          </div>
        </div>

        {lanes.map((lane, i) => {
          const next = lanes[i + 1];
          const hk = next ? `${lane.role}-${next.role}` : null;
          return (
            <React.Fragment key={lane.role}>
              <LaneView lane={lane} data={data} onOpen={open} />
              {hk && HANDOFFS[hk] ? <HandoffStrip handoffs={HANDOFFS[hk]} onOpen={open} /> : null}
            </React.Fragment>
          );
        })}

        <section className="mt-8 rounded-card border border-dashed border-border bg-surface p-4 text-sm text-muted">
          You are here: <span className="font-semibold text-text">Journey map</span> (<code>/journeys</code>). The Demo Bar at the top also links back to this page from anywhere.
        </section>
      </div>
    </div>
  );
}

function LaneView({ lane, data, onOpen }: { lane: Lane; data: AppData; onOpen: (href: string, persona: string) => void }) {
  const color = ROLE_COLOR[lane.role];
  return (
    <section id={`lane-${lane.role}`} data-role={lane.role} className="scroll-mt-16 overflow-hidden rounded-sheet border border-border bg-surface shadow-s2">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-5" style={{ background: `linear-gradient(90deg, ${color}22, transparent 60%)` }}>
        <RoleBadge role={lane.role} />
        <h2 className="font-display text-xl font-bold">{lane.title}</h2>
        <p className="text-sm text-muted">{lane.blurb}</p>
      </div>
      <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto p-4 sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
        {lane.screens.map((s) => (
          <ScreenCard key={s.key} screen={s} color={color} data={data} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function ScreenCard({ screen: s, color, data, onOpen }: { screen: Screen; color: string; data: AppData; onOpen: (href: string, persona: string) => void }) {
  const Icon = s.icon;
  const product = s.mock ? data.products[s.mock.productId] : undefined;
  const design = s.mock?.designId ? data.designs[s.mock.designId] : undefined;
  const layer = product && design ? fitDesignLayer(product, design) : null;
  return (
    <div className="flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-card border border-border bg-bg transition-shadow hover:shadow-s2 sm:w-auto">
      <div className="relative grid h-24 place-items-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}33, ${color}0d)` }}>
        {product && s.mock ? (
          <MockupRenderer product={product} colorHex={COLORS[s.mock.color]} layers={layer ? [layer] : []} className="h-24 w-auto" label={`${s.name} preview`} />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface shadow-s2" style={{ color }}>
            <Icon className="h-6 w-6" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="text-sm font-semibold leading-tight">{s.name}</div>
        <code className="truncate text-[11px] text-muted" title={s.href}>
          {s.href}
        </code>
        {s.note ? <div className="text-[11px] text-muted">{s.note}</div> : null}
        <button
          type="button"
          onClick={() => onOpen(s.href, s.persona)}
          className="mt-auto inline-flex min-h-[40px] items-center justify-center gap-1 rounded-input px-2 text-xs font-semibold text-white transition-[filter] hover:brightness-110"
          style={{ background: color }}
        >
          Open as {ROLE_OF(s.persona) === 'vendor' || ROLE_OF(s.persona) === 'admin' ? NAME_OF(s.persona) : NAME_OF(s.persona).split(' ')[0]} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function HandoffStrip({ handoffs, onOpen }: { handoffs: Handoff[]; onOpen: (href: string, persona: string) => void }) {
  return (
    <div className="relative grid gap-3 py-4 md:grid-cols-3" aria-label="Cross-role handoffs">
      {handoffs.map((h) => (
        <div key={h.label} className="flex items-stretch gap-3">
          <svg viewBox="0 0 24 80" className="h-20 w-6 shrink-0" aria-hidden>
            <defs>
              <linearGradient id={`g-${h.from}-${h.to}-${h.label.length}`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="80">
                <stop offset="0" stopColor={ROLE_COLOR[h.from]} />
                <stop offset="1" stopColor={ROLE_COLOR[h.to]} />
              </linearGradient>
            </defs>
            <path d="M12 2 V70" stroke={`url(#g-${h.from}-${h.to}-${h.label.length})`} strokeWidth="3" strokeDasharray="5 4" fill="none" />
            <path d="M5 64 L12 76 L19 64" stroke={ROLE_COLOR[h.to]} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex min-w-0 flex-1 flex-col justify-center rounded-card border border-dashed border-border bg-surface px-3 py-2">
            <div className="text-sm font-semibold">{h.label}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
              <button type="button" onClick={() => onOpen(h.fromScreen.href, h.fromScreen.persona)} className="inline-flex min-h-[32px] items-center rounded-full px-2 font-semibold text-white" style={{ background: ROLE_COLOR[h.from] }}>
                {h.fromScreen.name}
              </button>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
              <button type="button" onClick={() => onOpen(h.toScreen.href, h.toScreen.persona)} className="inline-flex min-h-[32px] items-center rounded-full px-2 font-semibold text-white" style={{ background: ROLE_COLOR[h.to] }}>
                {h.toScreen.name}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

