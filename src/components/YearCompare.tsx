import { useQuery } from "@tanstack/react-query";
import { summaryQuery } from "@/services/queries";
import type { ElectionDTO } from "@/lib/data.functions";
import { displayName, groupSummary, resolveDuel } from "@/lib/duel";
import { fmtPct } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui-kit";

/** Same round and area, 2022 vs 2026, grouped as Bolsonaro / Lula / Outros with the correct person per year. */
export function YearCompare({ elections, round, uf, ibge, areaLabel }: {
  elections: ElectionDTO[]; round: number; uf: string | null; ibge: string | null; areaLabel: string;
}) {
  const a = elections.find((e) => e.year === 2022 && e.round === round);
  const b = elections.find((e) => e.year === 2026 && e.round === round);
  return (
    <Card title={`2022 × 2026 · ${round}º turno · ${areaLabel}`} footer="% sobre todos os votos nominais válidos de cada ano. Mudança de candidato: Jair Bolsonaro (2022) → Flávio Bolsonaro (2026). A comparação não indica transferência de eleitores.">
      {!a || !b ? (
        <EmptyState title="Comparação indisponível" description={`Requer ${round}º turno de 2022 e 2026 importados e reconciliados.`} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Column year={2022} id={a.id} uf={uf} ibge={ibge} />
          <Column year={2026} id={b.id} uf={uf} ibge={ibge} />
        </div>
      )}
    </Card>
  );
}

function Column({ year, id, uf, ibge }: { year: number; id: number; uf: string | null; ibge: string | null }) {
  const q = useQuery(summaryQuery(id, uf, ibge));
  const g = groupSummary(q.data ?? []);
  const pair = resolveDuel(q.data ?? []);
  return (
    <div className="min-w-0">
      <p className="label-caps mb-2">{year}</p>
      {q.isLoading ? <div className="h-32 skeleton rounded-lg bg-muted" /> : q.error ? (
        <p className="text-xs text-muted-foreground">{q.error.message}</p>
      ) : !g ? <p className="text-xs text-muted-foreground">—</p> : (
        <ul className="space-y-2">
          {[g.bolsonaro, g.lula, g.outros].map((r) => (
            <li key={r.group} data-series={r.group} className="min-w-0">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">{displayName(r.group, year, r.group === "bolsonaro" ? pair.bolsonaro : pair.lula)}</span>
                <span className="tabular-nums">{fmtPct(r.share)}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-muted">
                <div className="h-1 rounded-full bg-series" style={{ width: `${Math.min(100, r.share ?? 0)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
