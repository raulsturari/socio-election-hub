import { DuelScatter, type ScatterSeries } from "@/components/duel/DuelScatter";
import { DuelDetail } from "@/components/duel/DuelDetail";
import { ModeSelector } from "@/components/duel/ModeSelector";
import { displayName, duelMunicipality, duelTitle } from "@/lib/duel";
import { pearsonTest, spearmanTest } from "@/lib/lab-stats";
import type { LabAnalysis } from "@/lib/lab-analysis";
import { X_VARIABLES } from "@/lib/lab-variables";
import { interpretGraph, READING_CONVENTION } from "@/lib/graph-reading";
import { GraphReading } from "@/components/lab/GraphReading";
import { StatisticalDetails } from "@/components/lab/StatisticalDetails";
import { CorrelationGrid } from "@/components/lab/StatsPanel";
import { fmtBRL, fmtInt } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
    return { id, label, points: list };
  };
  const series: ScatterSeries[] = [
    ...(showB && duel.bolsonaro ? [mk("bolsonaro", displayName("bolsonaro", f.ano, duel.bolsonaro), qb.data)] : []),
    ...(showL && duel.lula ? [mk("pt", "Lula", ql.data)] : []),
  ];

  const x = X_VARIABLES.find((v) => v.id === "renda");
  const readings = series.map((s) => {
    const tx = s.points.map((p) => Math.log10(p.x)), ys = s.points.map((p) => p.y);
    const analysis: LabAnalysis = {
      totalRows: s.points.length, missing: { x: 0, y: 0, covariates: 0, examples: [] },
      points: { c: s.points.map((p) => p.code), n: s.points.map((p) => p.name), u: s.points.map((p) => p.uf), x: s.points.map((p) => p.x), y: ys },
      pearson: pearsonTest(tx, ys), spearman: spearmanTest(tx, ys), model: null, modelNote: null,
    };
    return { name: s.label, id: s.id, analysis, hasModelAnalysis: false };
  });
  const ready = !!election && !loading && !error && series.some((s) => s.points.length > 0);

  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Correlações" subtitle="Renda per capita × votação, por município" />
      <FilterBar ctx={ctx} />
      <ModeSelector ctx={ctx} />

      <Card title={`${mode === "comparar" ? duelTitle(f.ano) : series[0]?.label ?? "—"} · ${f.uf ?? "Brasil"}`} footer={`TSE ${f.ano}/${f.turno}º turno · IBGE Censo 2022 · ${f.uf ?? "Brasil"}. ${ready ? series.map((s) => `${s.label}: ${fmtInt(s.points.length)} municípios`).join("; ") : ""}`}>
        {!election ? <NoElection year={f.ano} round={f.turno} /> : loading ? (
          <div className="aspect-[4/3] skeleton rounded-lg bg-muted" />
        ) : error ? (
          <EmptyState title="Erro ao carregar" description={error.message} />
        ) : series.every((s) => s.points.length === 0) ? (
          <EmptyState title="Dados não importados" description="Sem pares renda/votação para este recorte." />
        ) : (
          <DuelScatter series={series} xLabel="renda domiciliar per capita" yLabel="% dos votos válidos" formatX={fmtBRL} log
            detail={(c) => <><p className="mb-1 text-muted-foreground">Renda: {fmtIncome(income.get(c))}</p><DuelDetail m={muni.get(c)} year={f.ano} /></>} />
        )}
      </Card>

      {ready && x && <>
        <p className="text-xs text-muted-foreground">Amostra: apenas municípios com renda e votação disponíveis. O total de municípios sem esses dados não está disponível nesta consulta.</p>
        <GraphReading reading={interpretGraph({ x, metric: "share", year: f.ano, round: f.turno, scope: f.uf ?? "Brasil" }, readings)} />
        <StatisticalDetails key={JSON.stringify([f, mode])}>
          {readings.map((s) => <div key={s.id} data-series={s.id} className="space-y-3"><h3 className="text-sm font-medium text-series-label">{s.name}</h3><CorrelationGrid a={s.analysis} /></div>)}
          <h3 className="text-sm font-medium">Como calculamos</h3>
          <SourceNote>Renda: {x.source}, rendimento nominal médio mensal domiciliar per capita. Votação: TSE, percentual de todos os votos válidos municipais, sem renormalizar os dois candidatos. Junção por código IBGE. Pares disponíveis, sem imputação; a cobertura de ausências não é fornecida por esta consulta. Pearson sobre log10 da renda; Spearman sobre postos. Intervalos Fisher-z e Fieller; testes bilaterais aproximados. Cada série é calculada separadamente, sem regressão conjunta. Esta tela não estima modelo ajustado. Falácia ecológica: não inferir voto individual ou causalidade.</SourceNote>
          <SourceNote>{READING_CONVENTION}</SourceNote>
        </StatisticalDetails>
      </>}

    </div>
  );
}
const fmtIncome = (v: number | undefined) => (v == null ? "—" : fmtBRL(v));
