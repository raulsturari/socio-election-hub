import { useMemo, useState, type ReactNode } from "react";
import { PointsCanvas } from "../motion/PointsCanvas";
import { scatterDomain, transformScatterX, type ScatterDomain } from "@/lib/scatter-domain";

export interface ScatterPt { code: string; name: string; uf: string; x: number; y: number }
export interface ScatterSeries { id: "bolsonaro" | "pt"; label: string; points: ScatterPt[]; stat?: ReactNode }

const W = 320, H = 260, PAD = { l: 36, r: 8, t: 10, b: 28 };

/**
 * One or two series over the SAME X/Y scales (blue Bolsonaro, red Lula). Each municipality appears once per series;
 * statistics are computed per series upstream, never pooled.
 */
export function DuelScatter({ series, xLabel, yLabel, formatX, log = false, detail, replay = 0, domain }: {
  series: ScatterSeries[]; xLabel: string; yLabel: string; formatX: (v: number) => string; log?: boolean;
  detail?: (code: string) => ReactNode; replay?: number; domain?: ScatterDomain;
}) {
  const [active, setActive] = useState<string | null>(null);
  const m = useMemo(() => {
    const tx = (v: number) => transformScatterX(v, domain?.log ?? log);
    const all = series.flatMap((s) => s.points);
    const d = domain ?? scatterDomain(all, log, true);
    const [x0, x1] = d.x, [y0, y1] = d.y;
    const sx = (v: number) => PAD.l + ((tx(v) - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
    const sy = (v: number) => H - PAD.b - ((v - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b);
    return { sx, sy, x0, x1, y0, y1, untx: (v: number) => (log ? 10 ** v : v) };
  }, [series, log, domain]);
  const layers = useMemo(() => series.map((s) => ({ id: s.id, pts: s.points.map((p) => ({ key: p.code, x: m.sx(p.x), y: m.sy(p.y) })) })), [series, m]);

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W, py = ((e.clientY - rect.top) / rect.height) * H;
    let best: string | null = null, bd = Infinity;
    for (const s of series) for (const p of s.points) {
      const d = (m.sx(p.x) - px) ** 2 + (m.sy(p.y) - py) ** 2;
      if (d < bd) { bd = d; best = p.code; }
    }
    setActive(bd < 400 ? best : null);
  };
  const hits = active ? series.map((s) => ({ s, p: s.points.find((p) => p.code === active) })) : [];
  const first = hits.find((h) => h.p)?.p;

  return (
    <div>
      <p className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
        {series.map((s) => <span key={s.id} data-series={s.id} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-series" aria-hidden />{s.label} · n={s.points.length.toLocaleString("pt-BR")}</span>)}
      </p>
      {series.some((s) => s.stat) && (
        <div className={`mb-3 grid gap-2 ${series.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {series.map((s) => <div key={s.id} data-series={s.id} className="rounded-2xl bg-muted p-3 text-xs"><p className="label-caps text-series-label">{s.label}</p><div className="mt-1">{s.stat}</div></div>)}
        </div>
      )}
      <div className="relative">
        {layers.map((l) => <div key={l.id} data-series={l.id} className="absolute inset-0"><PointsCanvas points={l.pts} width={W} height={H} alpha={series.length > 1 ? 0.35 : 0.45} replay={replay} /></div>)}
        <svg viewBox={`0 0 ${W} ${H}`} className="relative w-full touch-none select-none" onPointerDown={pick} onPointerMove={(e) => e.buttons && pick(e)} role="img" aria-label={`Dispersão ${xLabel} por ${yLabel}`}>
          {[m.y0, (m.y0 + m.y1) / 2, m.y1].map((v, i) => <text key={i} x={PAD.l - 4} y={m.sy(v) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">{v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</text>)}
          {[m.x0, m.x1].map((v, i) => <text key={i} x={i ? W - PAD.r : PAD.l} y={H - 8} textAnchor={i ? "end" : "start"} className="fill-muted-foreground text-[9px]">{formatX(m.untx(v))}</text>)}
          {hits.map(({ s, p }) => p && <circle key={s.id} data-series={s.id} cx={m.sx(p.x)} cy={m.sy(p.y)} r={4.5} className="fill-none stroke-foreground" strokeWidth={1.5} />)}
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">X: {xLabel}{log ? " (escala log)" : ""} · Y: {yLabel} · mesmas escalas para as duas séries.</p>
      <div className="mt-2 min-h-12 text-xs" role="status">
        {first ? (detail ? detail(first.code) : (
          <div className="rounded-2xl bg-muted p-3"><p className="font-medium">{first.name} · {first.uf} · {formatX(first.x)}</p>
            {hits.map(({ s, p }) => <p key={s.id} data-series={s.id} className="tabular-nums text-series-label">{s.label}: {p ? p.y.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}</p>)}</div>
        )) : <span className="text-muted-foreground">Toque em um ponto para ver o município.</span>}
      </div>
    </div>
  );
}
