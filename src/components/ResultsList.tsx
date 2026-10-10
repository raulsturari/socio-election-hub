import { candidateSeries } from "@/lib/series-identity";
import type { CandidateRow } from "@/lib/data.functions";
import { fmtInt, fmtPct } from "@/lib/format";

export function ResultsList({ rows, selected, onSelect }: { rows: CandidateRow[]; selected: number | null; onSelect: (n: number) => void }) {
  return (
    <ul className="space-y-2">
      {rows.map((c) => (
        <li key={c.candidate_id} data-series={candidateSeries(c)}>
          <button
            onClick={() => onSelect(c.number)}
            className={`w-full rounded-lg border p-3 text-left transition-colors ${c.number === selected ? "border-series" : "bg-muted"}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">{c.ballot_name} <span className="text-muted-foreground">· {c.party}</span></span>
              <span className="text-base font-semibold tabular-nums">{fmtPct(c.share)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-series" style={{ width: `${c.share ?? 0}%` }} />
            </div>
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">{fmtInt(c.votes)} votos</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
