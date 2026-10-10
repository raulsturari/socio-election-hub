import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, Download } from "lucide-react";
import { filtersSchema } from "@/lib/filters";
import { labSearchSchema, REGIONS, X_VARIABLES, Y_METRICS, type LabInput, type YMetric } from "@/lib/lab-variables";
import type { LabAnalysis } from "@/lib/lab-analysis";
import { electionsQuery, labQuery } from "@/services/queries";
import { useFilters } from "@/hooks/use-filters";
import { Card, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";
import { FilterBar } from "@/components/FilterBar";
import { NoElection } from "@/components/NoElection";
import { LabScatter } from "@/components/lab/LabScatter";
import { CorrelationGrid, ModelTable } from "@/components/lab/StatsPanel";
import { AuditCard } from "@/components/lab/AuditCard";
import { LabControls } from "@/components/lab/LabControls";
import { fmtInt } from "@/lib/format";

const searchSchema = filtersSchema.extend(labSearchSchema.shape);

export const Route = createFileRoute("/laboratorio")({
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(electionsQuery()),
  head: () => ({
    meta: [
      { title: "Laboratório estatístico eleitoral — Brasil Data Lab" },
      { name: "description", content: "Pearson, Spearman e regressão OLS municipal entre indicadores do Censo 2022 e resultados TSE 2022/2026." },
      { property: "og:title", content: "Laboratório estatístico eleitoral — Brasil Data Lab" },
      { property: "og:description", content: "Correlações e regressões municipais com dados oficiais TSE e IBGE, com avisos de falácia ecológica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => <div role="alert" className="p-4 text-sm">{(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-4 text-sm">Não encontrado.</div>,
  component: Laboratorio,
});

function Laboratorio() {
  const ctx = useFilters();
  const { f, election, elections, candidate, candidates } = ctx;
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/laboratorio" });
  const [sheet, setSheet] = useState<"x" | "y" | "reg" | null>(null);
  const xv = X_VARIABLES.find((v) => v.id === search.x) ?? X_VARIABLES[0]!;
  const metric = Y_METRICS.find((m) => m.id === search.y) ?? Y_METRICS[0];
  const base = metric.needsBase && f.ano === 2026 ? elections.find((e) => e.year === 2022 && e.round === f.turno) ?? null : null;
  const baseMissing = metric.needsBase && !base;

  const input: LabInput | null = election && !baseMissing && (!metric.needsCandidate || candidate) ? {
    electionId: election.id, baseElectionId: base?.id ?? null, metric: metric.id,
    candidateNumber: metric.needsCandidate ? candidate!.number : null, x: xv.id, uf: (f.uf ?? null) as LabInput["uf"],
    region: f.uf ? null : search.reg ?? null,
  } : null;
  const lab = useQuery({ ...labQuery(input!), enabled: !!input });
  const yLabel = metric.needsCandidate ? `${metric.label} · ${candidate?.ballot_name ?? "—"}` : metric.label;
  const scope = f.uf ?? REGIONS.find((r) => r.id === search.reg)?.label ?? "Brasil";

  const patch = (p: { x?: string; y?: YMetric; reg?: string; cand?: number }) =>
    navigate({ search: (prev) => ({ ...prev, ...p }), replace: true });

  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Laboratório" subtitle="Estatística municipal com dados oficiais" />
      <FilterBar ctx={ctx} />
      <div className="grid grid-cols-3 gap-2">
        <Picker label="X" value={xv.label} onClick={() => setSheet("x")} />
        <Picker label="Y" value={metric.label} onClick={() => setSheet("y")} />
        <Picker label="Região" value={f.uf ? `UF ${f.uf}` : REGIONS.find((r) => r.id === search.reg)?.label ?? "Todas"} onClick={() => setSheet("reg")} />
      </div>
      <LabControls open={sheet} onClose={() => setSheet(null)} x={xv.id} y={metric.id} reg={search.reg ?? null}
        candNumber={candidate?.number ?? null} candidates={candidates} onChange={patch} />

      {election && <AuditCard electionId={election.id} label={`${f.ano} · ${f.turno}º turno`} />}
      <Warning />

      {!election ? <NoElection year={f.ano} round={f.turno} /> : baseMissing ? (
        <EmptyState title="Comparação indisponível" description="Variações 2022→2026 exigem ano 2026 e o mesmo turno validado em 2022. Selecione 2026 nos filtros." />
      ) : lab.isLoading || !input ? <Skeleton /> : lab.error ? (
        <EmptyState title="Erro ao calcular" description={lab.error.message} action={<button className="min-h-11 rounded-full bg-secondary px-4 text-sm" onClick={() => lab.refetch()}>Tentar de novo</button>} />
      ) : lab.data && "unavailable" in lab.data ? (
        <EmptyState title="Indicador indisponível" description={lab.data.unavailable} />
      ) : lab.data && lab.data.points.y.length === 0 ? (
        <EmptyState title="Sem pares X/Y" description="Nenhum município tem as duas variáveis neste recorte (ex.: candidato sem o mesmo número em 2022)." />
      ) : lab.data ? (
        <Results a={lab.data} xv={xv} yLabel={yLabel} scope={scope} fileName={`lab_${f.ano}_t${f.turno}_${xv.id}_${metric.id}_${scope}.csv`} />
      ) : null}

      <Card title="Método">
        <SourceNote>
          Unidade de análise: município (sem ponderação por eleitorado). X: Censo 2022 (IBGE SIDRA, mesma referência para 2022 e 2026).
          Y: TSE, % dos votos nominais válidos; comparecimento e abstenção sobre aptos; brancos+nulos sobre comparecimento; variações em pontos
          percentuais pelo mesmo número de urna. Missing: exclusão listwise, contada acima (nada é imputado). Pearson com IC de Fisher-z;
          Spearman em postos com IC de Fieller. OLS: y ~ X + log10 renda + % superior completo + log10 população, com efeitos fixos de UF
          quando o recorte inclui mais de uma UF; EP robusto HC1, IC 95% t, Breusch-Pagan e VIF. Cálculo no servidor sobre todos os municípios.
        </SourceNote>
      </Card>
    </div>
  );
}

function Results({ a, xv, yLabel, scope, fileName }: { a: LabAnalysis; xv: (typeof X_VARIABLES)[number]; yLabel: string; scope: string; fileName: string }) {
  const dropped = a.missing.x + a.missing.y;
  return (
    <>
      <Card title={`${xv.label} × ${yLabel} · ${scope}`} footer={`Fonte X: ${xv.source}. Amostra: ${fmtInt(a.points.y.length)} de ${fmtInt(a.totalRows)} municípios${dropped ? ` (${fmtInt(dropped)} sem dado${a.missing.examples.length ? `: ${a.missing.examples.join(", ")}` : ""})` : ""}.`}>
        <LabScatter points={a.points} xv={xv} yLabel={yLabel} />
        <button onClick={() => downloadCsv(a, xv.label, yLabel, fileName)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary text-sm">
          <Download className="size-4" aria-hidden /> Exportar CSV
        </button>
      </Card>
      <Card title="Correlação bivariada"><CorrelationGrid a={a} /></Card>
      <Card title="Regressão OLS multivariada" footer={a.missing.covariates ? `${fmtInt(a.missing.covariates)} municípios excluídos do modelo por covariável ausente.` : undefined}>
        <ModelTable a={a} />
      </Card>
    </>
  );
}

function downloadCsv(a: LabAnalysis, xl: string, yl: string, name: string) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [["codigo_ibge", "municipio", "uf", esc(xl), esc(yl)].join(",")];
  a.points.c.forEach((c, i) => lines.push([c, esc(a.points.n[i]!), a.points.u[i], a.points.x[i], a.points.y[i]].join(",")));
  const url = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const el = document.createElement("a");
  el.href = url; el.download = name; el.click();
  URL.revokeObjectURL(url);
}

function Picker({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-14 min-w-0 flex-col items-start justify-center rounded-2xl border bg-card px-3 text-left">
      <span className="label-caps flex items-center gap-1">{label}<ChevronDown className="size-3" aria-hidden /></span>
      <span className="w-full truncate text-xs" title={value}>{value}</span>
    </button>
  );
}

function Warning() {
  return (
    <div className="flex gap-3 rounded-lg border p-3" role="note">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Dados agregados, não individuais.</span> Cada ponto é um município: associações
        entre médias municipais não dizem como pessoas votaram (falácia ecológica). Correlação e coeficientes de regressão não indicam causalidade.
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-3"><div className="h-24 animate-pulse rounded-lg bg-muted" /><div className="h-24 animate-pulse rounded-lg bg-muted" /></div>
    </div>
  );
}
