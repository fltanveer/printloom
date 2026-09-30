'use client';
import * as React from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useStore } from '@/lib/store';
import { DemoBar } from '@/components/demo/DemoBar';

function useHydrated() {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

// Exposed for demo scripting and automated smoke tests.
if (typeof window !== 'undefined') (window as unknown as { __printloom: typeof useStore }).__printloom = useStore;

function ThemeSync() {
  const theme = useStore((s) => s.theme);
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

function BootScreen() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-customer via-designer to-vendor" />
        <p className="font-display text-sm font-semibold text-muted">Loading Printloom demo</p>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const theme = useStore((s) => s.theme);
  return (
    <TooltipProvider delayDuration={150}>
      <ThemeSync />
      {hydrated ? (
        <>
          <DemoBar />
          {children}
        </>
      ) : (
        <BootScreen />
      )}
      <Toaster position="bottom-center" richColors closeButton theme={theme} toastOptions={{ style: { borderRadius: 16 } }} />
    </TooltipProvider>
  );
}
