'use client';
import { LayoutDashboard, Package, ClipboardList, AlertTriangle, Star, Wallet, Settings, Rocket } from 'lucide-react';
import { PanelShell } from '@/components/shell/PanelShell';
import { useStore } from '@/lib/store';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const vendorId = useStore((s) => s.personas.vendor);
  const vendor = useStore((s) => s.vendors[vendorId]);
  const newOrders = useStore((s) => Object.values(s.subOrders).filter((o) => o.vendorId === vendorId && o.status === 'placed').length);
  const issues = useStore((s) => Object.values(s.subOrders).filter((o) => o.vendorId === vendorId && o.issue && ['open'].includes(o.issue.status)).length);
  return (
    <PanelShell
      role="vendor"
      identity={{ name: vendor?.shopName ?? 'Shop', subtitle: `${vendor?.location.city ?? ''} · ${vendor?.status === 'paused' ? 'Paused' : vendor?.status === 'onboarding' ? 'Setting up' : 'Open'}`, avatar: vendor?.logo, color: vendor?.logoColor }}
      setup={vendor ? { progress: vendor.setupProgress, href: '/vendor/onboarding' } : null}
      nav={[
        { href: '/vendor', label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { href: '/vendor/orders', label: 'Orders', icon: ClipboardList, badge: newOrders },
        { href: '/vendor/offerings', label: 'Products and pricing', icon: Package },
        { href: '/vendor/issues', label: 'Issues', icon: AlertTriangle, badge: issues },
        { href: '/vendor/reviews', label: 'Reviews', icon: Star },
        { href: '/vendor/payouts', label: 'Payouts', icon: Wallet },
        { href: '/vendor/onboarding', label: 'Setup checklist', icon: Rocket },
        { href: '/vendor/settings', label: 'Settings', icon: Settings },
      ]}
    >
      {children}
    </PanelShell>
  );
}
