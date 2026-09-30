'use client';
import { LayoutDashboard, ClipboardList, ShieldAlert, Scale, Settings } from 'lucide-react';
import { PanelShell } from '@/components/shell/PanelShell';
import { useStore } from '@/lib/store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const flagged = useStore((s) => Object.values(s.designs).filter((d) => d.status === 'flagged').length);
  const disputes = useStore((s) => Object.values(s.subOrders).filter((o) => o.status === 'escalated').length);
  return (
    <PanelShell
      role="admin"
      identity={{ name: 'Platform Admin', subtitle: 'Printloom operations', avatar: 'PA' }}
      nav={[
        { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
        { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
        { href: '/admin/moderation', label: 'Moderation', icon: ShieldAlert, badge: flagged },
        { href: '/admin/disputes', label: 'Disputes', icon: Scale, badge: disputes },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
      ]}
    >
      {children}
    </PanelShell>
  );
}
