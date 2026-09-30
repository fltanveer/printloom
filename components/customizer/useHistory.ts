'use client';
import * as React from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UpdateOptions {
  /** Live gesture update (drag / transform). Not recorded until a non-transient update lands. */
  transient?: boolean;
  /** Merge rapid updates with the same key (typing, sliders) into one history step. */
  coalesce?: string;
  /** Replace present without any history entry (derived fixes). */
  silent?: boolean;
}

const LIMIT = 80;
const COALESCE_MS = 800;

/**
 * Undo / redo history for a form draft. The source of truth lives in a ref so that
 * several updates in one tick chain correctly (and StrictMode double calls stay pure).
 */
export function useHistory<T>(initial: () => T) {
  const ref = React.useRef<HistoryState<T> | null>(null);
  if (!ref.current) ref.current = { past: [], present: initial(), future: [] };
  const [h, setH] = React.useState<HistoryState<T>>(ref.current);
  const gestureBase = React.useRef<T | null>(null);
  const lastCoalesce = React.useRef<{ key: string; at: number } | null>(null);

  const commit = React.useCallback((next: HistoryState<T>) => {
    ref.current = next;
    setH(next);
  }, []);

  const update = React.useCallback(
    (fn: (prev: T) => T, opts: UpdateOptions = {}) => {
      const cur = ref.current as HistoryState<T>;
      const next = fn(cur.present);
      if (next === cur.present) {
        if (!opts.transient && gestureBase.current) {
          // gesture ended without a final change: still record it
          const base = gestureBase.current;
          gestureBase.current = null;
          if (base !== cur.present) commit({ past: [...cur.past, base].slice(-LIMIT), present: cur.present, future: [] });
        }
        return;
      }
      if (opts.silent) return commit({ ...cur, present: next });
      if (opts.transient) {
        if (!gestureBase.current) gestureBase.current = cur.present;
        return commit({ ...cur, present: next });
      }
      const base = gestureBase.current ?? cur.present;
      gestureBase.current = null;
      const now = Date.now();
      const lc = lastCoalesce.current;
      if (opts.coalesce && lc && lc.key === opts.coalesce && now - lc.at < COALESCE_MS && cur.past.length) {
        lastCoalesce.current = { key: opts.coalesce, at: now };
        return commit({ past: cur.past, present: next, future: [] });
      }
      lastCoalesce.current = opts.coalesce ? { key: opts.coalesce, at: now } : null;
      commit({ past: [...cur.past, base].slice(-LIMIT), present: next, future: [] });
    },
    [commit],
  );

  const undo = React.useCallback(() => {
    const cur = ref.current as HistoryState<T>;
    gestureBase.current = null;
    lastCoalesce.current = null;
    if (!cur.past.length) return;
    commit({ past: cur.past.slice(0, -1), present: cur.past[cur.past.length - 1], future: [cur.present, ...cur.future] });
  }, [commit]);

  const redo = React.useCallback(() => {
    const cur = ref.current as HistoryState<T>;
    gestureBase.current = null;
    lastCoalesce.current = null;
    if (!cur.future.length) return;
    commit({ past: [...cur.past, cur.present], present: cur.future[0], future: cur.future.slice(1) });
  }, [commit]);

  return { state: h.present, update, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
