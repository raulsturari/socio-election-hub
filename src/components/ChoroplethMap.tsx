import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { meshQuery, type GeoFeature } from "@/services/queries";
import { fmtPct } from "@/lib/format";
import { EmptyState } from "./ui-kit";

interface Props {
  uf: string;
  shares: Map<string, number | null>;
  selected: string | null;
  onSelect: (ibge: string) => void;
  /** Signed values (Bolsonaro − Lula, p.p.): blue positive, red negative, symmetric scale. */
  diverging?: boolean;
  /** Shared scale maximum for synchronized small multiples. */
  max?: number;
  detail?: ((ibge: string) => ReactNode) | undefined;
  label?: string;
}

function ringsOf(f: GeoFeature): number[][][] {
  return f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates.flat();
}

/** Equirectangular projection corrected by cos(mid-latitude); adequate at UF scale. */
function project(features: GeoFeature[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const f of features) for (const ring of ringsOf(f)) for (const pt of ring) {
    const x = pt[0] ?? 0, y = pt[1] ?? 0;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const w = (maxX - minX) * k, h = maxY - minY;
  const scale = 1000 / Math.max(w, h);
  const paths = features.map((f) => ({
    code: f.properties.codarea,
    d: ringsOf(f).map((ring) =>
      ring.map(([x = 0, y = 0], i) => `${i ? "L" : "M"}${((x - minX) * k * scale).toFixed(1)},${((maxY - y) * scale).toFixed(1)}`).join("") + "Z",
    ).join(""),
  }));
  return { paths, width: w * scale, height: h * scale };
}

export function ChoroplethMap({ uf, shares, selected, onSelect, diverging = false, max: fixedMax, detail, label }: Props) {
  const mesh = useQuery(meshQuery(uf));
  const geo = useMemo(() => (mesh.data ? project(mesh.data.features) : null), [mesh.data]);
  const { view, handlers, reset } = usePinchZoom();
  const max = fixedMax ?? Math.max(1, ...[...shares.values()].map((v) => Math.abs(v ?? 0)));

  if (mesh.isLoading) return <div className="aspect-square skeleton rounded-lg bg-muted" />;
  if (mesh.error || !geo) return <EmptyState title="Malha indisponível" description="Não foi possível carregar a malha municipal do IBGE." />;

  const sel = selected ? shares.get(selected) : undefined;
  return (
    <div>
      <div className="relative aspect-square touch-none overflow-hidden rounded-lg bg-muted" {...handlers}>
        <svg viewBox={`0 0 ${geo.width} ${geo.height}`} className="h-full w-full" role="img" aria-label={`Mapa municipal ${uf}${label ? ` · ${label}` : ""}`}>
          <g style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: "0 0" }}>
            {geo.paths.map((p) => {
              const v = shares.get(p.code);
              return (
                <path
                  key={p.code}
                  d={p.d}
                  onClick={() => onSelect(p.code)}
                  className={`choro-path stroke-background ${v == null ? "fill-data-missing" : diverging ? "" : "fill-series"}`}
                  style={{ fill: v != null && diverging ? (v >= 0 ? "var(--candidate-bolsonaro)" : "var(--candidate-pt)") : undefined,
                    fillOpacity: v == null ? 1 : 0.12 + 0.88 * Math.min(1, Math.abs(v) / max), strokeWidth: p.code === selected ? 3 / view.k : 0.4 / view.k }}
                />
              );
            })}
          </g>
        </svg>
        {view.k !== 1 && (
          <button onClick={reset} className="absolute right-2 top-2 min-h-9 rounded-full bg-card px-3 text-xs">Redefinir</button>
        )}
      </div>
      {diverging ? (
        <div className="mt-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2"><span className="tabular-nums">Lula +{fmtNum1(max)} p.p.</span><span className="mx-2 h-1.5 flex-1 rounded-full duel-legend" /><span className="tabular-nums">Bolsonaro +{fmtNum1(max)} p.p.</span></div>
          <p className="mt-1">Vantagem entre os dois (p.p. dos votos válidos), escala simétrica. Não indica vencedor do município entre todas as candidaturas.</p>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="mx-2 h-1.5 flex-1 rounded-full bg-gradient-to-r from-series/10 to-series" />
          <span className="tabular-nums">{fmtPct(max)}</span>
        </div>
      )}
      {selected && (detail ? <div className="mt-2 text-xs">{detail(selected)}</div> : <p className="mt-2 text-xs text-muted-foreground">Selecionado: <span className="tabular-nums text-foreground">{fmtPct(sel ?? null)}</span> dos votos válidos</p>)}
    </div>
  );
}

const fmtNum1 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function usePinchZoom() {
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  const state = () => {
    const p = [...pts.current.values()];
    const a = p[0], b = p[1];
    if (!a) return { dist: 0, cx: 0, cy: 0 };
    if (!b) return { dist: 0, cx: a.x, cy: a.y };
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  };
  const handlers = {
    onPointerDown: (e: PointerEvent) => { pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); last.current = state(); },
    onPointerMove: (e: PointerEvent) => {
      if (!pts.current.has(e.pointerId) || !last.current) return;
      pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const s = state(), l = last.current;
      setView((v) => {
        const k = s.dist && l.dist ? Math.min(8, Math.max(1, v.k * (s.dist / l.dist))) : v.k;
        return { k, x: v.x + (s.cx - l.cx), y: v.y + (s.cy - l.cy) };
      });
      last.current = s;
    },
    onPointerUp: (e: PointerEvent) => { pts.current.delete(e.pointerId); last.current = pts.current.size ? state() : null; },
    onPointerCancel: (e: PointerEvent) => { pts.current.delete(e.pointerId); last.current = null; },
  };
  return { view, handlers, reset: () => setView({ x: 0, y: 0, k: 1 }) };
}
