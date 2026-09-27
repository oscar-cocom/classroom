import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const CHECK_EVERY_MS = 5 * 60 * 1000;

/**
 * Tells the user to reload when a newer build has been published. A tab left
 * open keeps running the code it first loaded, so without this it could show
 * stale screens or miss fixes.
 */
export function UpdateBanner() {
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();
        if (version && version !== __BUILD_ID__) setOutdated(true);
      } catch {
        // Offline or blocked: try again on the next check
      }
    };
    const onVisible = () => document.visibilityState === 'visible' && check();

    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!outdated) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 flex items-center gap-3 rounded-lg border bg-background p-4 shadow-lg"
    >
      <RefreshCw className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm flex-1">
        <span className="font-medium">Hay una nueva versión.</span>{' '}
        <span className="text-muted-foreground">Recarga para ver los últimos cambios.</span>
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        Recargar
      </button>
    </div>
  );
}
