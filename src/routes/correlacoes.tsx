import { DuelScatter, type ScatterSeries } from "@/components/duel/DuelScatter";
import { DuelDetail } from "@/components/duel/DuelDetail";
import { ModeSelector } from "@/components/duel/ModeSelector";
import { displayName, duelMunicipality, duelTitle } from "@/lib/duel";
import { pearson } from "@/lib/stats";
import { fmtBRL, fmtInt } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { filtersSchema } from "@/lib/filters";
import { duelQuery, electionsQuery, scatterQuery } from "@/services/queries";
import { useFilters } from "@/hooks/use-filters";
import { Card, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";
import { FilterBar } from "@/components/FilterBar";
import { NoElection } from "@/components/NoElection";

export const Route = createFileRoute("/correlacoes")({
  validateSearch: filtersSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(electionsQuery()),
  head: () => ({
    meta: [
      { title: "Correlações renda × votação — Brasil Data Lab" },
      { name: "description", content: "Dispersão municipal entre renda per capita (Censo 2022) e votação presidencial (TSE)." },
      { property: "og:title", content: "Correlações renda × votação — Brasil Data Lab" },
      { property: "og:description", content: "Relação entre renda e votação em nível municipal, com aviso de falácia ecológica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => <div role="alert" className="p-4 text-sm">{(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-4 text-sm">Não encontrado.</div>,
  component: Correlacoes,
});

function Correlacoes() {
  const ctx = useFilters();
  const { f, election, duel, mode } = ctx;
  const showB = mode !== "lula", showL = mode !== "bolsonaro";
  const qb = useQuery({ ...scatterQuery(election?.id ?? 0, duel.bolsonaro?.candidate_id ?? 0, f.uf), enabled: !!election && !!duel.bolsonaro && showB });
  const ql = useQuery({ ...scatterQuery(election?.id ?? 0, duel.lula?.candidate_id ?? 0, f.uf), enabled: !!election && !!duel.lula && showL });
  const dq = useQuery({ ...duelQuery(election?.id ?? 0, f.uf), enabled: !!election });
  const muni = new Map((dq.data?.rows ?? []).map((r) => [r.ibge_code, duelMunicipality(r)]));
  const income = new Map([...(qb.data ?? []), ...(ql.data ?? [])].map((p) => [p.ibge_code, p.income]));
  const active = [showB && qb, showL && ql].filter((q): q is typeof qb => !!q);
  const loading = active.some((q) => q.isLoading) || ctx.summary.isLoading;
  const error = active.find((q) => q.error)?.error;
  const mk = (id: "bolsonaro" | "pt", label: string, pts: typeof qb.data): ScatterSeries => {
    const list = (pts ?? []).map((p) => ({ code: p.ibge_code, name: p.name, uf: p.uf, x: p.income, y: p.share }));
    const r = pearson(list.map((p) => Math.log10(p.x)), list.map((p) => p.y));
    return { id, label, points: list, stat: <span className="tabular-nums">r (log renda) = <strong>{r == null ? "—" : r.toFixed(2).replace(".", ",")}</strong> · N = {fmtInt(list.length)}</span> };
  };
  const series: ScatterSeries[] = [
    ...(showB && duel.bolsonaro ? [mk("bolsonaro", displayName("bolsonaro", f.ano, duel.bolsonaro), qb.data)] : []),
    ...(showL && duel.lula ? [mk("pt", "Lula", ql.data)] : []),
  ];

  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Correlações" subtitle="Renda per capita × votação, por município" />
      <FilterBar ctx={ctx} />
      <ModeSelector ctx={ctx} />

      <div className="flex gap-3 rounded-lg border p-3" role="note">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Falácia ecológica:</span> cada ponto é um município. Uma relação
          entre médias municipais não indica como pessoas de determinada renda votaram. Correlação não implica causalidade.
        </p>
      </div>

      <Card title={`${mode === "comparar" ? duelTitle(f.ano) : series[0]?.label ?? "—"} · ${f.uf ?? "Brasil"}`} footer="Estatísticas calculadas separadamente para cada candidato; um município não é contado duas vezes numa mesma estatística.">
        {!election ? <NoElection year={f.ano} round={f.turno} /> : loading ? (
          <div className="aspect-[4/3] skeleton rounded-lg bg-muted" />
        ) : error ? (
          <EmptyState title="Erro ao carregar" description={error.message} />
        ) : series.every((s) => s.points.length === 0) ? (
          <EmptyState title="Dados não importados" description="Sem pares renda/votação para este recorte." />
        ) : (
          <DuelScatter series={series} xLabel="renda domiciliar per capita" yLabel="% dos votos válidos" formatX={fmtBRL} log
            detail={(c) => <><p className="mb-1 text-muted-foreground">Renda: {income.has(c) ? fmtBRL(income.get(c)!) : "—"}</p><DuelDetail m={muni.get(c)} year={f.ano} /></>} />
        )}
      </Card>

      <Card title="Fonte">
        <SourceNote>
          Renda: IBGE SIDRA tabela 10295, variável 13431 — rendimento nominal médio mensal domiciliar per capita, Censo 2022.
          Votação: TSE, % de todos os votos nominais válidos do município (Outros = 100% − os dois). Junção por código IBGE. r calculado sobre log10 da renda.
        </SourceNote>
      </Card>
    </div>
  );
}
