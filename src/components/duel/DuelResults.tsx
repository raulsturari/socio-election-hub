import { displayName, type DuelMode, type DuelSummary, type GroupShare } from "@/lib/duel";
import type { CandidateIdentity } from "@/lib/series-identity";
import { fmtInt, fmtPct } from "@/lib/format";

const seriesOf = (g: GroupShare["group"]) => g;

/** Exactly three rows (Bolsonaro, Lula, Outros) plus a 3-segment composition bar over ALL valid votes. */
export function DuelResults({ summary, year, mode, names }: {
  summary: DuelSummary; year: number; mode: DuelMode; names: { bolsonaro: CandidateIdentity | null; lula: CandidateIdentity | null };
}) {
  const rows = [summary.bolsonaro, summary.lula, summary.outros];
  const label = (g: GroupShare) => displayName(g.group, year, g.group === "bolsonaro" ? names.bolsonaro : names.lula);
  return (
    <div className="space-y-3">
      <CompositionBar summary={summary} />
      <ul className="space-y-2">
        {rows.map((g) => {
          const focus = mode === "comparar" ? g.group !== "outros" : (mode === "bolsonaro") === (g.group === "bolsonaro") && g.group !== "outros";
          return (
            <li key={g.group} data-series={seriesOf(g.group)} className={`rounded-2xl border p-3 ${focus ? "border-series bg-muted" : "bg-card"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <span className="size-2.5 shrink-0 rounded-full bg-series" aria-hidden />
                  <span className="truncate">{label(g)}</span>
                  {g.group === "outros" && <span className="text-xs font-normal text-muted-foreground">· soma das demais</span>}
                </span>
                <span className="text-lg font-semibold tabular-nums">{fmtPct(g.share)}</span>
              </div>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">{g.votes == null ? "— sem dado" : `${fmtInt(g.votes)} votos`}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CompositionBar({ summary }: { summary: DuelSummary }) {
  const segs = [summary.bolsonaro, summary.lula, summary.outros];
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-[var(--data-missing)]" role="img"
        aria-label={segs.map((s) => `${s.group === "pt" ? "Lula" : s.group === "outros" ? "Outros" : "Bolsonaro"} ${fmtPct(s.share)}`).join(", ")}>
        {segs.map((s) => <div key={s.group} data-series={s.group} className="h-full bg-series" style={{ width: `${s.share ?? 0}%` }} />)}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Composição sobre todos os votos válidos do recorte (soma = 100%).</p>
    </div>
  );
}

/** Legend naming the two persons explicitly; gray = Outros, dark gray = sem dados. */
export function DuelLegend({ year, outros = false }: { year: number; outros?: boolean }) {
  const item = (s: string, t: string) => <span data-series={s} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-series" aria-hidden />{t}</span>;
  return (
    <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
      {item("bolsonaro", displayName("bolsonaro", year))}{item("pt", "Lula")}{outros && item("outros", "Outros")}{item("missing", "sem dados")}
    </p>
  );
}
