import { useMemo, useState } from "react";
import type { LabAnalysis } from "@/lib/lab-analysis";
import type { XVariable } from "@/lib/lab-variables";
import { fmtNum } from "@/lib/format";
import { PointsCanvas } from "../motion/PointsCanvas";

const W = 320, H = 260, PAD = { l: 36, r: 8, t: 10, b: 28 };

/** Touch scatter over municipal points; nearest point within ~20px is selected. */
export function LabScatter({ points, xv, yLabel }: { points: LabAnalysis["points"]; xv: XVariable; yLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const m = useMemo(() => {
    const tx = points.x.map((v) => (xv.log ? Math.log10(v) : v));
    const [x0, x1] = extent(tx), [y0, y1] = extent(points.y);
    const sx = (i: number) => PAD.l + ((tx[i]! - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
    const sy = (v: number) => H - PAD.b - ((v - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b);
    return { sx, sy, x0, x1, y0, y1 };
  }, [points, xv.log]);

  const pts = useMemo(() => points.y.map((v, i) => ({ key: String(points.c[i]), x: m.sx(i), y: m.sy(v) })), [points, m]);

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W, py = ((e.clientY - rect.top) / rect.height) * H;
    let best = -1, bd = Infinity;
    for (let i = 0; i < points.y.length; i++) {
      const d = (m.sx(i) - px) ** 2 + (m.sy(points.y[i]!) - py) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    setActive(bd < 400 ? best : null);
  };
  const xTick = (v: number) => fmtNum(xv.log ? 10 ** v : v);

  return (
    <div>
      <div className="relative">
      <PointsCanvas points={pts} width={W} height={H} alpha={0.4} />
      <svg viewBox={`0 0 ${W} ${H}`} className="relative w-full touch-none select-none" onPointerDown={pick}
        onPointerMove={(e) => e.buttons && pick(e)} role="img" aria-label={`Dispersão ${xv.label} por ${yLabel}`}>
        {m.y0 < 0 && m.y1 > 0 && <line x1={PAD.l} x2={W - PAD.r} y1={m.sy(0)} y2={m.sy(0)} className="stroke-border" />}
        {[m.y0, (m.y0 + m.y1) / 2, m.y1].map((v, i) => (
          <text key={i} x={PAD.l - 4} y={m.sy(v) + 3} textAnchor="end" className="fill-muted-foreground text-[9px] tabular-nums">{fmtNum(v)}</text>
        ))}
        {[m.x0, m.x1].map((v, i) => (
          <text key={i} x={i ? W - PAD.r : PAD.l} y={H - 10} textAnchor={i ? "end" : "start"} className="fill-muted-foreground text-[9px] tabular-nums">{xTick(v)}</text>
        ))}
        {active != null && <circle cx={m.sx(active)} cy={m.sy(points.y[active]!)} r={4.5} className="fill-none stroke-foreground" strokeWidth={1.5} />}
      </svg>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-block size-2 rounded-full bg-series/60" aria-hidden /> 1 ponto = 1 município
        {xv.log && <span>· eixo X em escala log</span>}
      </div>
      <p className="mt-2 min-h-10 rounded-lg bg-muted px-3 py-2 text-xs" aria-live="polite">
        {active != null
          ? <><span className="font-medium">{points.n[active]}/{points.u[active]}</span> · {xv.label}: <span className="tabular-nums">{fmtNum(points.x[active]!)} {xv.unit}</span> · {yLabel}: <span className="tabular-nums">{fmtNum(points.y[active]!)}</span></>
          : <span className="text-muted-foreground">Toque ou arraste sobre o gráfico para ver o município.</span>}
      </p>
    </div>
  );
}

function extent(v: readonly number[]): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (const x of v) { if (x < lo) lo = x; if (x > hi) hi = x; }
  return [lo, hi];
}
