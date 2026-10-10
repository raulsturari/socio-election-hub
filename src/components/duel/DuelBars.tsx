import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useReadyAfter } from "@/components/explore/chart-ready";

export interface DuelBar { key: string; label: string; b: number | null; l: number | null; o: number | null; count: number }

const fmt = (v: number | null) => (v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

/** Grouped bars (Bolsonaro, Lula, optional Outros) on one shared 0–max scale; values are % of all valid votes. */
export function DuelBars({ bars, bName, outros, replay }: { bars: DuelBar[]; bName: string; outros: boolean; replay: number }) {
  const reduce = useReducedMotion();
  const [sel, setSel] = useState<string | null>(null);
  useReadyAfter(reduce ? 0 : 1100, [bars, replay, reduce, outros]);
  const max = Math.max(1, ...bars.flatMap((b) => [b.b ?? 0, b.l ?? 0, outros ? b.o ?? 0 : 0]));
  const segs = (b: DuelBar) => [
    { s: "bolsonaro", label: bName, v: b.b },
    { s: "pt", label: "Lula", v: b.l },
    ...(outros ? [{ s: "outros", label: "Outros", v: b.o }] : []),
  ];
  return (
    <div className="min-h-[420px] space-y-3 py-2" role="img" aria-label="Barras agrupadas comparativas">
      <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {segs({ key: "", label: "", b: 0, l: 0, o: 0, count: 0 }).map((s) => <span key={s.s} data-series={s.s} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-series" aria-hidden />{s.label}</span>)}
      </p>
      {bars.map((b) => (
        <motion.button layout="position" key={b.key} transition={{ duration: reduce ? 0 : 0.6 }} onClick={() => setSel(sel === b.key ? null : b.key)}
          className="block min-h-12 w-full text-left" aria-label={`${b.label}: ${segs(b).map((s) => `${s.label} ${fmt(s.v)}`).join(", ")}`}>
          <span className="flex justify-between gap-2 text-xs"><span className="truncate">{b.label}</span><span className="shrink-0 tabular-nums text-muted-foreground">{segs(b).map((s) => fmt(s.v)).join(" · ")}</span></span>
          <span className="mt-1 block space-y-0.5">
            {segs(b).map((s) => (
              <span key={s.s} data-series={s.s} className="block h-2 overflow-hidden rounded-full bg-secondary">
                <motion.span key={replay} initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: 1 }} transition={{ duration: reduce ? 0 : 0.9 }}
                  className="block h-full origin-left rounded-full bg-series" style={{ width: `${((s.v ?? 0) / max) * 100}%` }} />
              </span>
            ))}
          </span>
          {sel === b.key && <span role="status" className="mt-1 block text-xs text-muted-foreground">{b.count.toLocaleString("pt-BR")} município(s) · percentuais sobre todos os votos válidos do grupo</span>}
        </motion.button>
      ))}
    </div>
  );
}
