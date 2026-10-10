import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Every drawing surface inside the Explore viewer (canvas map, points canvas, animated bars)
 * registers here and reports when its first draw/animation finished. The viewer is "ready"
 * only when at least one surface registered and all of them are done — so a second map,
 * the IBGE mesh or the Lula series still pending keeps the tour clock stopped.
 */
interface Registry { report: (id: symbol, done: boolean) => void; remove: (id: symbol) => void }
const ReadyContext = createContext<Registry | null>(null);

export function useReadyRegistry() {
  const surfaces = useRef(new Map<symbol, boolean>());
  const [version, setVersion] = useState(0);
  const report = useCallback((id: symbol, done: boolean) => {
    if (surfaces.current.get(id) === done) return;
    surfaces.current.set(id, done); setVersion((v) => v + 1);
  }, []);
  const remove = useCallback((id: symbol) => { if (surfaces.current.delete(id)) setVersion((v) => v + 1); }, []);
  const registry = useMemo(() => ({ report, remove }), [report, remove]);
  const allDone = useMemo(() => surfaces.current.size > 0 && [...surfaces.current.values()].every(Boolean), [version]);
  const Provider = useCallback(({ children }: { children: ReactNode }) => <ReadyContext.Provider value={registry}>{children}</ReadyContext.Provider>, [registry]);
  return { Provider, allDone };
}

/** Declare a drawing surface; `done` = its first complete frame for the current data is on screen. */
export function useChartReady(done: boolean) {
  const registry = useContext(ReadyContext);
  const id = useRef(Symbol("surface"));
  useEffect(() => { registry?.report(id.current, done); }, [registry, done]);
  useEffect(() => () => registry?.remove(id.current), [registry]);
}

/** For DOM animations with a known duration (bars): done after the animation window for these deps. */
export function useReadyAfter(ms: number, deps: unknown[]) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(false);
    const t = window.setTimeout(() => setDone(true), ms);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies data deps explicitly
  }, deps);
  useChartReady(done);
}
