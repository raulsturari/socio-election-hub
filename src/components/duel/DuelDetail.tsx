import { displayName, type DuelMunicipality } from "@/lib/duel";
import { fmtInt, fmtPct } from "@/lib/format";

const pp = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`);

/** Tap tooltip: both focus candidates and Outros with votes and % of all valid votes. */
export function DuelDetail({ m, year }: { m: DuelMunicipality | undefined; year: number }) {
  if (!m) return <p className="text-muted-foreground">Sem dados eleitorais para este município.</p>;
  const rows = [
    { s: "bolsonaro", label: displayName("bolsonaro", year), g: m.b },
    { s: "pt", label: "Lula", g: m.l },
    { s: "outros", label: "Outros", g: m.o },
  ];
  return (
    <div role="status" className="rounded-2xl bg-muted p-3">
      <p className="flex justify-between gap-2 font-medium"><span className="truncate">{m.name} · {m.uf}</span><span className="shrink-0 tabular-nums text-muted-foreground">B − L {pp(m.advantage)}</span></p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((r) => (
          <li key={r.s} data-series={r.s} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 tabular-nums">
            <span className="flex min-w-0 items-center gap-1.5"><span className="size-2 shrink-0 rounded-full bg-series" aria-hidden /><span className="truncate">{r.label}</span></span>
            <span>{fmtPct(r.g.share)}</span>
            <span className="w-24 text-right text-muted-foreground">{r.g.votes == null ? "—" : `${fmtInt(r.g.votes)} v.`}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] text-muted-foreground">Válidos: {m.valid == null ? "—" : fmtInt(m.valid)}</p>
    </div>
  );
}
