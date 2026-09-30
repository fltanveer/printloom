'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Palette, PlusCircle, Package, User, ShoppingBag, Search, Sparkles } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { useStore } from '@/lib/store';
import { NotificationCenter } from '@/components/demo/DemoBar';
import { Avatar } from '@/components/shared/bits';

const NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/designs', label: 'Designs', icon: Palette },
  { href: '/catalog', label: 'Create', icon: PlusCircle },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/account', label: 'Account', icon: User },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2 font-display text-xl font-bold', className)} aria-label="Printloom home">
      <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-customer via-designer to-vendor text-white shadow-s1">
        <span className="text-sm">P</span>
      </span>
      Printloom
    </Link>
  );
}

function isActive(path: string, href: string) {
  if (href === '/') return path === '/';
  if (href === '/catalog') return path.startsWith('/catalog') || path.startsWith('/product');
  return path.startsWith(href);
}

export function CartButton() {
  const customerId = useStore((s) => s.personas.customer);
  const count = useStore((s) => (s.carts[customerId] ?? []).reduce((n, l) => n + Object.values(l.sizeBreakdown).reduce((a, b) => a + b, 0), 0));
  return (
    <Link href="/cart" id="cart-icon" aria-label={`Cart, ${count} items`} className="relative grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2">
      <ShoppingBag className="h-5 w-5" />
      {count ? (
        <motion.span key={count} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </motion.span>
      ) : null}
    </Link>
  );
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '/';
  const setRole = useStore((s) => s.setRole);
  const role = useStore((s) => s.role);
  const customerId = useStore((s) => s.personas.customer);
  const customer = useStore((s) => s.customers[customerId]);
  React.useEffect(() => {
    if (role !== 'customer') setRole('customer');
  }, [role, setRole]);
  const hideBottom = path.startsWith('/product/');

  return (
    <div data-role="customer" className="min-h-screen pb-20 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md lg:top-12">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Logo />
          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
            {[
              { href: '/catalog', label: 'Products' },
              { href: '/designs', label: 'Designs' },
              { href: '/requests', label: 'Custom design' },
              { href: '/orders', label: 'Orders' },
            ].map((n) => (
              <Link key={n.href} href={n.href} className={cn('rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text', isActive(path, n.href) && 'bg-accent-soft text-accent-text')}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/designs" aria-label="Search designs" className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2 md:hidden">
              <Search className="h-5 w-5" />
            </Link>
            <Link href="/requests/new" className="mr-1 hidden items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm font-semibold hover:border-accent lg:flex">
              <Sparkles className="h-4 w-4 text-designer" /> Request a design
            </Link>
            <div className="lg:hidden">
              <NotificationCenter dark={false} />
            </div>
            <CartButton />
            <Link href="/account" className="hidden rounded-full md:block" aria-label="Account">
              <Avatar name={customer?.name ?? ''} src={customer?.avatar} size={36} />
            </Link>
          </div>
        </div>
      </header>
      <motion.main key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        {children}
      </motion.main>
      {!hideBottom ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md md:hidden" aria-label="Bottom">
          <div className="grid grid-cols-5">
            {NAV.map((n) => {
              const active = isActive(path, n.href);
              return (
                <Link key={n.href} href={n.href} className={cn('flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium', active ? 'text-accent-text' : 'text-muted')}>
                  <n.icon className={cn('h-5 w-5', n.label === 'Create' && 'h-6 w-6')} />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
