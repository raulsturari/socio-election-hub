import { displayName, groupSummary } from "@/lib/duel";
import { ModeSelector } from "@/components/duel/ModeSelector";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { filtersSchema } from "@/lib/filters";
import { electionsQuery, municipalitiesQuery, summaryQuery } from "@/services/queries";
import { useFilters } from "@/hooks/use-filters";
import { ELECTION_YEARS } from "@/lib/constants";
import { fmtPct } from "@/lib/format";
import { Card, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";
import { FilterBar } from "@/components/FilterBar";
import { NoElection } from "@/components/NoElection";
import { YearCompare } from "@/components/YearCompare";

export const Route = createFileRoute("/comparar")({
  validateSearch: filtersSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(electionsQuery()),
  head: () => ({
    meta: [
      { title: "Comparar municípios — Brasil Data Lab" },
      { name: "description", content: "Compare resultados oficiais entre municípios e anos eleitorais." },
      { property: "og:title", content: "Comparar municípios — Brasil Data Lab" },
      { property: "og:description", content: "Comparação lado a lado de resultados municipais do TSE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => <div role="alert" className="p-4 text-sm">{(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-4 text-sm">Não encontrado.</div>,
  component: Comparar,
});

function Comparar() {
  const ctx = useFilters();
  const { f, election, elections, summary } = ctx;
  const [other, setOther] = useState("");
  const muns = useQuery({ ...municipalitiesQuery(f.uf ?? ""), enabled: !!f.uf });
  const b = useQuery({ ...summaryQuery(election?.id ?? 0, f.uf, other || null), enabled: !!election && !!other });
  const nameOf = (c: string | null) => (muns.data ?? []).find((m) => m.ibge_code === c)?.name ?? (c ? c : f.uf ?? "Brasil");
  const ga = groupSummary(summary.data ?? []), gb = groupSummary(b.data ?? []);
  const groups = (["bolsonaro", "lula", "outros"] as const);

  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Comparar" subtitle="Município A × município B" />
      <FilterBar ctx={ctx} />
      <ModeSelector ctx={ctx} />
      {!election ? <NoElection year={f.ano} round={f.turno} /> : (
        <Card title="Comparação no mesmo turno">
          {!f.uf ? (
            <EmptyState title="Escolha uma UF" description="Selecione UF e município A nos filtros; escolha B abaixo." />
          ) : (
            <>
              <select value={other} onChange={(e) => setOther(e.target.value)} className="mb-4 min-h-11 w-full rounded-full border bg-secondary px-4 text-base">
                <option value="">Município B…</option>
                {(muns.data ?? []).map((m) => <option key={m.ibge_code} value={m.ibge_code}>{m.name}</option>)}
              </select>
              <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-3 label-caps">
                <span>Grupo</span><span className="w-16 truncate text-right">{nameOf(f.mun)}</span><span className="w-16 truncate text-right">{other ? nameOf(other) : "B"}</span>
              </div>
              <ul className="divide-y">
                {groups.map((k) => {
                  const ra = ga?.[k], rb = gb?.[k], dim = ctx.mode !== "comparar" && k !== "outros" && (ctx.mode === "lula") !== (k === "lula");
                  return (
                    <li key={k} data-series={ra?.group ?? k} className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 text-sm ${dim ? "opacity-55" : ""}`}>
                      <span className="truncate"><span className="inline-block size-2 rounded-full bg-series mr-2" aria-hidden />{displayName(ra?.group ?? "outros", f.ano, k === "bolsonaro" ? ctx.duel.bolsonaro : ctx.duel.lula)}</span>
                      <span className="w-16 text-right tabular-nums">{fmtPct(ra?.share ?? null)}</span>
                      <span className="w-16 text-right tabular-nums text-muted-foreground">{other ? fmtPct(rb?.share ?? null) : "—"}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      )}
      <YearCompare elections={elections} round={f.turno} uf={f.uf} ibge={f.mun} areaLabel={f.mun ? nameOf(f.mun) : f.uf ?? "Brasil"} />
      <Card title="Disponibilidade histórica">
        <ul className="space-y-1 text-sm">
          {ELECTION_YEARS.map((y) => (
            <li key={y} className="flex justify-between">
              <span>{y}</span>
              <span className="text-muted-foreground">
                {[1, 2].map((r) => elections.some((e) => e.year === y && e.round === r) ? `${r}º ✓` : `${r}º —`).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Nota"><SourceNote>Comparações usam o mesmo cargo e turno; percentuais sobre todos os votos nominais válidos; Outros = soma das demais candidaturas.</SourceNote></Card>
    </div>
  );
}
