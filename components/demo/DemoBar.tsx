'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, ChevronDown, FlaskConical, Map, Moon, RotateCcw, Sun, X, Zap, Settings2 } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { useStore } from '@/lib/store';
import { PERSONAS } from '@/lib/seed';
import type { Role } from '@/lib/types';
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Dialog, SheetContent } from '@/components/ui/dialog';
import { Avatar, ROLE_COLOR, Ago } from '@/components/shared/bits';

export const ROLE_HOME: Record<Role, string> = { customer: '/', vendor: '/vendor', designer: '/designer', admin: '/admin' };
const ROLES: Role[] = ['customer', 'vendor', 'designer', 'admin'];
const ROLE_LABEL: Record<Role, string> = { customer: 'Customer', vendor: 'Vendor', designer: 'Designer', admin: 'Admin' };

function roleFromPath(path: string): Role {
  if (path.startsWith('/vendor')) return 'vendor';
  if (path.startsWith('/designer') && !path.startsWith('/designer-profile')) return 'designer';
  if (path.startsWith('/admin')) return 'admin';
  return 'customer';
}

export function useActiveRole(): Role {
  const path = usePathname() ?? '/';
  const storeRole = useStore((s) => s.role);
  return path.startsWith('/journeys') ? storeRole : roleFromPath(path);
}

function RoleSwitcher({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const active = useActiveRole();
  const setRole = useStore((s) => s.setRole);
  return (
    <div className="flex rounded-full bg-white/10 p-0.5" role="radiogroup" aria-label="Role">
      {ROLES.map((r) => (
        <button
          key={r}
          role="radio"
          aria-checked={active === r}
          onClick={() => {
            setRole(r);
            router.push(ROLE_HOME[r]);
            onDone?.();
          }}
          className={cn('min-h-[32px] rounded-full px-3 text-xs font-semibold transition-colors', active === r ? 'text-white shadow' : 'text-white/60 hover:text-white')}
          style={active === r ? { background: ROLE_COLOR[r] } : undefined}
        >
          {ROLE_LABEL[r]}
        </button>
      ))}
    </div>
  );
}

function PersonaSwitcher({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const path = usePathname() ?? '/';
  const role = useActiveRole();
  const personas = useStore((s) => s.personas);
  const setPersona = useStore((s) => s.setPersona);
  const current = PERSONAS.find((p) => p.id === personas[role]);
  return (
    <Dropdown>
      <DropdownTrigger className="flex min-h-[36px] items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-2.5 text-xs font-semibold text-white hover:bg-white/15">
        <Avatar src={current?.avatar} name={current?.name ?? ''} size={26} color={ROLE_COLOR[role]} />
        <span className="max-w-[120px] truncate">{current?.name}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </DropdownTrigger>
      <DropdownContent align="start" className="w-72">
        {ROLES.map((r) => (
          <React.Fragment key={r}>
            <DropdownLabel>{ROLE_LABEL[r]}s</DropdownLabel>
            {PERSONAS.filter((p) => p.role === r).map((p) => (
              <DropdownItem
                key={p.id}
                onSelect={() => {
                  setPersona(r, p.id);
                  const detail = /\/(orders|requests|offerings|designs)\/[^/]+/.test(path);
                  if (r !== role || detail) router.push(ROLE_HOME[r]);
                  toast.success(`Now viewing as ${p.name}`);
                  onDone?.();
                }}
                className={cn(personas[r] === p.id && r === role && 'bg-accent-soft')}
              >
                <Avatar src={p.avatar} name={p.name} size={28} color={ROLE_COLOR[r]} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-xs text-muted">{p.subtitle}</div>
                </div>
              </DropdownItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}

export function NotificationCenter({ dark = true }: { dark?: boolean }) {
  const router = useRouter();
  const role = useActiveRole();
  const personaId = useStore((s) => s.personas[role]);
  const all = useStore((s) => s.notifications);
  const markRead = useStore((s) => s.markNotificationRead);
  const markAll = useStore((s) => s.markAllRead);
  const mine = all.filter((n) => n.personaId === personaId);
  const unread = mine.filter((n) => !n.read).length;
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Notifications, ${unread} unread`}
        className={cn('relative grid h-9 w-9 place-items-center rounded-full', dark ? 'text-white hover:bg-white/10' : 'text-text hover:bg-surface-2')}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread ? <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span> : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="font-display font-semibold">Notifications</div>
          <button className="min-h-[32px] text-xs font-semibold text-accent-text disabled:opacity-40" disabled={!unread} onClick={() => markAll(personaId)}>
            Mark all read
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {mine.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">No notifications yet. Actions in other panels show up here.</p>
          ) : (
            mine.slice(0, 40).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  setOpen(false);
                  router.push(n.link);
                }}
                className={cn('flex w-full gap-3 border-b border-border px-3 py-3 text-left last:border-0 hover:bg-surface-2', !n.read && 'bg-accent-soft/60')}
              >
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{n.title}</span>
                  <span className="block text-sm text-muted">{n.body}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    <Ago at={n.at} />
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SimulateMenu() {
  const sim = useStore((s) => s.sim);
  const paymentFail = useStore((s) => s.simulate.paymentFail);
  const vendors = useStore((s) => s.vendors);
  const run = (fn: () => string) => () => toast(fn(), { icon: <FlaskConical className="h-4 w-4" /> });
  return (
    <Dropdown>
      <DropdownTrigger className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/15">
        <Zap className="h-3.5 w-3.5 text-amber-300" /> Simulate
      </DropdownTrigger>
      <DropdownContent align="end" className="w-80">
        <DropdownLabel>Orders</DropdownLabel>
        <DropdownItem onSelect={run(sim.advanceOrder)}>Advance latest order to next status</DropdownItem>
        <DropdownItem onSelect={run(sim.autoComplete)}>Auto-complete delivered orders (3 days passed)</DropdownItem>
        <DropdownItem onSelect={run(sim.lateDelivery)}>Make an in-flight order late</DropdownItem>
        <DropdownItem onSelect={run(sim.escalateIssue)}>Shop rejects an issue, customer escalates</DropdownItem>
        <DropdownItem onSelect={run(sim.togglePaymentFail)}>{paymentFail ? 'Stop failing payments' : 'Next payment fails'}</DropdownItem>
        <DropdownSeparator />
        <DropdownLabel>Vendors</DropdownLabel>
        <DropdownItem onSelect={run(() => sim.outOfStock('of_v1_tee', 'Black', 'XL'))}>Dhaka Ink Lab runs out of Black / XL</DropdownItem>
        <DropdownItem onSelect={run(() => sim.priceIncrease('v1', 10))}>Price increase on Dhaka Ink Lab (+10%)</DropdownItem>
        <DropdownItem onSelect={run(() => sim.priceIncrease('v2', 10))}>Price increase on Ctg Thread Works (+10%)</DropdownItem>
        <DropdownItem onSelect={run(() => sim.pauseVendor('v1'))}>{vendors.v1?.status === 'paused' ? 'Reopen' : 'Pause'} Dhaka Ink Lab</DropdownItem>
        <DropdownItem onSelect={run(() => sim.fillCapacity('v3'))}>Sylhet Print House near capacity today</DropdownItem>
        <DropdownItem onSelect={run(sim.expirePromotion)}>Expire active promotion</DropdownItem>
        <DropdownSeparator />
        <DropdownLabel>Designs and requests</DropdownLabel>
        <DropdownItem onSelect={run(() => sim.flagDesign())}>Flag a design (prefers one in a cart)</DropdownItem>
        <DropdownItem onSelect={run(sim.designerDeliver)}>Designer delivers pending request</DropdownItem>
        <DropdownItem onSelect={run(sim.expireRequest)}>Expire an open request</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

function Utilities({ stacked }: { stacked?: boolean }) {
  const currency = useStore((s) => s.currency);
  const setCurrency = useStore((s) => s.setCurrency);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const reset = useStore((s) => s.resetDemo);
  const router = useRouter();
  return (
    <div className={cn('flex items-center gap-1.5', stacked && 'flex-wrap')}>
      <Link href="/journeys" className="flex min-h-[36px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white">
        <Map className="h-3.5 w-3.5" /> Journey map
      </Link>
      <div className="flex rounded-full bg-white/10 p-0.5" role="radiogroup" aria-label="Currency">
        {(['BDT', 'USD'] as const).map((c) => (
          <button key={c} role="radio" aria-checked={currency === c} onClick={() => setCurrency(c)} className={cn('min-h-[30px] rounded-full px-2.5 text-xs font-semibold', currency === c ? 'bg-white text-black' : 'text-white/60 hover:text-white')}>
            {c === 'BDT' ? '৳ BDT' : '$ USD'}
          </button>
        ))}
      </div>
      <button aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/10">
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <ConfirmDialog
        trigger={
          <button className="flex min-h-[36px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        }
        title="Reset demo data?"
        description="This wipes every order, cart, request and edit made in this browser and re-seeds the original demo data."
        confirmLabel="Reset demo"
        danger
        onConfirm={() => {
          reset();
          router.push('/');
          toast.success('Demo data reset');
        }}
      />
    </div>
  );
}

export function DemoBar() {
  const [sheet, setSheet] = React.useState(false);
  return (
    <>
      {/* desktop / tablet bar */}
      <div className="sticky top-0 z-[60] hidden h-12 items-center gap-3 border-b border-white/10 bg-[#0b0a14] px-3 text-white lg:flex" role="region" aria-label="Demo controls">
        <span className="flex items-center gap-1.5 rounded-md border border-dashed border-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/60">
          <FlaskConical className="h-3 w-3" /> Demo
        </span>
        <RoleSwitcher />
        <PersonaSwitcher />
        <NotificationCenter />
        <div className="ml-auto flex items-center gap-1.5">
          <SimulateMenu />
          <Utilities />
        </div>
      </div>
      {/* mobile floating pill */}
      <button
        onClick={() => setSheet(true)}
        className="fixed bottom-[84px] right-3 z-[60] flex h-11 items-center gap-2 rounded-full bg-[#0b0a14] px-4 text-xs font-bold text-white shadow-s3 lg:hidden"
        aria-label="Open demo controls"
      >
        <Settings2 className="h-4 w-4" /> Demo
      </button>
      <Dialog open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" title="Demo controls" description="Switch roles and personas, trigger edge cases." className="bg-[#0b0a14] text-white [&_h2]:text-white">
          <div className="space-y-4">
            <RoleSwitcher onDone={() => setSheet(false)} />
            <div className="flex items-center gap-2">
              <PersonaSwitcher />
              <NotificationCenter />
              <SimulateMenu />
            </div>
            <Utilities stacked />
            <button onClick={() => setSheet(false)} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-input bg-white/10 text-sm font-semibold">
              <X className="h-4 w-4" /> Close
            </button>
          </div>
        </SheetContent>
      </Dialog>
    </>
  );
}
