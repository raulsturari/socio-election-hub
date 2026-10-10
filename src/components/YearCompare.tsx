import { candidateSeries } from "@/lib/series-identity";
import { useQuery } from "@tanstack/react-query";
import { summaryQuery } from "@/services/queries";
import type { ElectionDTO } from "@/lib/data.functions";
import { fmtPct } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui-kit";

/** Same round, same area, two years side by side. Candidates differ across years, so rows are per year. */
export function YearCompare({ elections, round, uf, ibge, areaLabel }: {
  elections: ElectionDTO[]; round: number; uf: string | null; ibge: string | null; areaLabel: string;
}) {
  const a = elections.find((e) => e.year === 2022 && e.round === round);
  const b = elections.find((e) => e.year === 2026 && e.round === round);
  return (
    <Card title={`2022 × 2026 · ${round}º turno · ${areaLabel}`} footer="Percentual sobre votos nominais válidos. Candidatos diferem entre anos; partidos são indicados para referência.">
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
  return (
    <div className="min-w-0">
      <p className="label-caps mb-2">{year}</p>
      {q.isLoading ? <div className="h-32 skeleton rounded-lg bg-muted" /> : q.error ? (
        <p className="text-xs text-muted-foreground">{q.error.message}</p>
      ) : (
        <ul className="space-y-2">
          {(q.data ?? []).slice(0, 6).map((c) => (
            <li key={c.number} data-series={candidateSeries(c)} className="min-w-0">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">{c.ballot_name}</span>
                <span className="tabular-nums">{fmtPct(c.share)}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-muted">
                <div className="h-1 rounded-full bg-series" style={{ width: `${Math.min(100, Number(c.share ?? 0))}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">{c.party}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
