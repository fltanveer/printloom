'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Menu, type LucideIcon } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';
import { Dialog, SheetContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/misc';
import { NotificationCenter } from '@/components/demo/DemoBar';
import { Avatar, ROLE_COLOR } from '@/components/shared/bits';
import { Logo } from './CustomerShell';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  exact?: boolean;
}

/** Desktop sidebar layout used by the vendor, designer and admin panels. Collapses to a drawer on mobile. */
export function PanelShell({
  role,
  nav,
  identity,
  setup,
  children,
}: {
  role: Exclude<Role, 'customer'>;
  nav: NavItem[];
  identity: { name: string; subtitle: string; avatar?: string; color?: string };
  setup?: { progress: number; href: string } | null;
  children: React.ReactNode;
}) {
  const path = usePathname() ?? '';
  const setRole = useStore((s) => s.setRole);
  const storeRole = useStore((s) => s.role);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (storeRole !== role) setRole(role);
  }, [role, storeRole, setRole]);

  const active = (n: NavItem) => (n.exact ? path === n.href : path === n.href || path.startsWith(n.href + '/'));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 p-4">
        <Avatar src={identity.avatar} name={identity.name} color={identity.color ?? ROLE_COLOR[role]} size={40} square />
        <div className="min-w-0">
          <div className="truncate font-display font-semibold">{identity.name}</div>
          <div className="truncate text-xs text-muted">{identity.subtitle}</div>
        </div>
      </div>
      {setup && setup.progress < 100 ? (
        <Link href={setup.href} onClick={() => setOpen(false)} className="mx-3 mb-2 rounded-card border border-accent/30 bg-accent-soft p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span>Finish setup</span>
            <span className="text-accent-text">{setup.progress}%</span>
          </div>
          <Progress value={setup.progress} />
        </Link>
      ) : null}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2" aria-label={`${role} navigation`}>
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={cn('flex min-h-[44px] items-center gap-3 rounded-input px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text', active(n) && 'bg-accent-soft text-accent-text')}
          >
            <n.icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{n.label}</span>
            {n.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{n.badge}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted">
        <Link href="/" className="flex min-h-[40px] items-center rounded-input px-2 hover:bg-surface-2">
          View customer storefront
        </Link>
      </div>
    </div>
  );

  return (
    <div data-role={role} className="min-h-screen">
      <div className="flex">
        <aside className="sticky top-12 hidden h-[calc(100vh-3rem)] w-64 shrink-0 border-r border-border bg-surface lg:block">{sidebar}</aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur-md lg:hidden">
            <button aria-label="Open menu" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2">
              <Menu className="h-5 w-5" />
            </button>
            <Logo className="text-base" />
            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase text-white" style={{ background: ROLE_COLOR[role] }}>
              {role}
            </span>
            <div className="ml-auto">
              <NotificationCenter dark={false} />
            </div>
          </header>
          <motion.main key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="mx-auto max-w-[1280px] px-4 py-5 pb-28 sm:px-6 lg:py-8">
            {children}
          </motion.main>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <SheetContent title="Menu">
          {sidebar}
        </SheetContent>
      </Dialog>
    </div>
  );
}
