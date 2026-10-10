import { useMemo, useState } from "react";
import type { ScatterPoint } from "@/lib/data.functions";
import { pearson } from "@/lib/stats";
import { fmtBRL, fmtInt, fmtPct } from "@/lib/format";

const W = 320, H = 240, PAD = { l: 34, r: 8, t: 8, b: 26 };

/** Municipal-level scatter: x = income per capita (log scale), y = vote share. */
export function ScatterPlot({ points }: { points: ScatterPoint[] }) {
  const [active, setActive] = useState<ScatterPoint | null>(null);
  const m = useMemo(() => {
    const lx = points.map((p) => Math.log10(p.income));
    const minX = Math.min(...lx), maxX = Math.max(...lx);
    const sx = (v: number) => PAD.l + ((Math.log10(v) - minX) / (maxX - minX || 1)) * (W - PAD.l - PAD.r);
    const sy = (v: number) => H - PAD.b - (v / 100) * (H - PAD.t - PAD.b);
    return { sx, sy, minX, maxX, r: pearson(lx, points.map((p) => p.share)) };
  }, [points]);

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W, y = ((e.clientY - rect.top) / rect.height) * H;
    let best: ScatterPoint | null = null, bd = Infinity;
    for (const p of points) {
      const d = (m.sx(p.income) - x) ** 2 + (m.sy(p.share) - y) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    setActive(bd < 400 ? best : null);
  };

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Stat label="Municípios" value={fmtInt(points.length)} />
        <Stat label="r de Pearson (log renda)" value={m.r == null ? "—" : m.r.toFixed(2).replace(".", ",")} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" onPointerDown={pick} onPointerMove={(e) => e.buttons && pick(e)} role="img" aria-label="Dispersão renda por votação">
        {[0, 50, 100].map((v) => (
          <text key={v} x={PAD.l - 4} y={m.sy(v) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">{v}%</text>
        ))}
        {[m.minX, m.maxX].map((lv, i) => (
          <text key={i} x={i ? W - PAD.r : PAD.l} y={H - 8} textAnchor={i ? "end" : "start"} className="fill-muted-foreground text-[9px]">
            {fmtBRL(10 ** lv)}
          </text>
        ))}
        {points.map((p) => (
          <circle key={p.ibge_code} cx={m.sx(p.income)} cy={m.sy(p.share)} r={1.6} className="fill-primary" fillOpacity={0.45} />
        ))}
        {active && <circle cx={m.sx(active.income)} cy={m.sy(active.share)} r={4} className="fill-none stroke-foreground" strokeWidth={1.5} />}
      </svg>
      <p className="mt-2 min-h-5 text-xs text-muted-foreground">
        {active ? `${active.name}/${active.uf} · ${fmtBRL(active.income)} · ${fmtPct(active.share)}` : "Toque em um ponto para ver o município."}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="label-caps">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
