'use client';
import { LayoutDashboard, Images, Upload, Inbox, Wallet, UserCircle, Rocket } from 'lucide-react';
import { PanelShell } from '@/components/shell/PanelShell';
import { useStore } from '@/lib/store';

export default function DesignerLayout({ children }: { children: React.ReactNode }) {
  const designerId = useStore((s) => s.personas.designer);
  const designer = useStore((s) => s.designers[designerId]);
  const direct = useStore((s) => Object.values(s.requests).filter((r) => r.designerId === designerId && r.status === 'sent').length);
  return (
    <PanelShell
      role="designer"
      identity={{ name: designer?.name ?? 'Designer', subtitle: designer?.tags.slice(0, 2).join(', ') ?? '', avatar: designer?.avatar }}
      setup={designer && !designer.onboarded ? { progress: 40, href: '/designer/onboarding' } : null}
      nav={[
        { href: '/designer', label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { href: '/designer/designs', label: 'My designs', icon: Images },
        { href: '/designer/designs/new', label: 'Upload design', icon: Upload, exact: true },
        { href: '/designer/requests', label: 'Requests', icon: Inbox, badge: direct },
        { href: '/designer/earnings', label: 'Earnings', icon: Wallet },
        { href: '/designer/profile', label: 'Public profile', icon: UserCircle },
        { href: '/designer/onboarding', label: 'Profile setup', icon: Rocket },
      ]}
    >
      {children}
    </PanelShell>
  );
}
