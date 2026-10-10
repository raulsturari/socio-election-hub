import { SeriesScope } from "@/components/SeriesScope";
import { ModeSelector } from "@/components/duel/ModeSelector";
import { DuelScatter, type ScatterSeries } from "@/components/duel/DuelScatter";
import { displayName, duelTitle } from "@/lib/duel";
import { fmtNum } from "@/lib/format";
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download } from "lucide-react";
import { filtersSchema } from "@/lib/filters";
import { labSearchSchema, REGIONS, X_VARIABLES, Y_METRICS, type LabInput, type YMetric } from "@/lib/lab-variables";
import type { LabAnalysis } from "@/lib/lab-analysis";
import { electionsQuery, labQuery } from "@/services/queries";
import { useFilters } from "@/hooks/use-filters";
import { Card, EmptyState, PageHeader } from "@/components/ui-kit";
import { FilterBar } from "@/components/FilterBar";
import { NoElection } from "@/components/NoElection";
import { LabScatter } from "@/components/lab/LabScatter";
import { CorrelationGrid, ModelTable } from "@/components/lab/StatsPanel";
import { AuditCard } from "@/components/lab/AuditCard";
import { LabControls } from "@/components/lab/LabControls";
import { fmtInt } from "@/lib/format";
import { interpretGraph, readingPoints, type ReadingContext } from "@/lib/graph-reading";
import { scatterDomain } from "@/lib/scatter-domain";
import { GeometryDetails } from "@/components/lab/GeometryDetails";
import { GraphReading } from "@/components/lab/GraphReading";
import { StatisticalDetails } from "@/components/lab/StatisticalDetails";
import { LabMethod } from "@/components/lab/LabMethod";
import { Button } from "@/components/ui/button";

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
  const { f, election, elections, candidate, duel, mode } = ctx;
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/laboratorio" });
  const [sheet, setSheet] = useState<"x" | "y" | "reg" | null>(null);
  const xv = X_VARIABLES.find((v) => v.id === search.x) ?? X_VARIABLES[0];
  if (!xv) throw new Error("Catalogue de variables indisponível.");
  const metric = Y_METRICS.find((m) => m.id === search.y) ?? Y_METRICS[0];
  const base = metric.needsBase && f.ano === 2026 ? elections.find((e) => e.year === 2022 && e.round === f.turno) ?? null : null;
  const baseMissing = metric.needsBase && !base;

  const mkInput = (num: number | null): LabInput | null => election && !baseMissing && (!metric.needsCandidate || num != null) ? {
    electionId: election.id, baseElectionId: base?.id ?? null, metric: metric.id,
    candidateNumber: metric.needsCandidate ? num : null, x: xv.id, uf: (f.uf ?? null) as LabInput["uf"],
    region: f.uf ? null : search.reg ?? null,
  } : null;
  const compare = metric.needsCandidate && mode === "comparar";
  const input = mkInput(candidate?.number ?? null);
  const inputL = compare ? mkInput(duel.lula?.number ?? null) : null;
  const lab = useQuery({ ...labQuery(input ?? ({} as LabInput)), enabled: !!input });
  const labL = useQuery({ ...labQuery(inputL ?? ({} as LabInput)), enabled: !!inputL });
  const focusName = (c: typeof candidate) => (c ? (c === duel.lula ? "Lula" : displayName("bolsonaro", f.ano, c)) : "—");
  const yLabel = metric.needsCandidate ? `${metric.label} · ${compare ? duelTitle(f.ano) : focusName(candidate)}` : metric.label;
  const scope = f.uf ?? REGIONS.find((r) => r.id === search.reg)?.label ?? "Brasil";

  const readingContext: ReadingContext = { x: xv, metric: metric.id, year: f.ano, round: f.turno, scope };
  const analysisKey = JSON.stringify([input, inputL, mode, f.mun]);

  const patch = (p: { x?: string; y?: YMetric; reg?: string | undefined; cand?: number }) =>
    navigate({ search: (prev) => ({ ...prev, ...p }), replace: true });

  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Laboratório" subtitle="Estatística municipal com dados oficiais" />
      <FilterBar ctx={ctx} />
      {metric.needsCandidate && <ModeSelector ctx={ctx} />}
      <div className="grid grid-cols-3 gap-2">
        <Picker label="X" value={xv.label} onClick={() => setSheet("x")} />
        <Picker label="Y" value={metric.label} onClick={() => setSheet("y")} />
        <Picker label="Região" value={f.uf ? `UF ${f.uf}` : REGIONS.find((r) => r.id === search.reg)?.label ?? "Todas"} onClick={() => setSheet("reg")} />
      </div>
      <LabControls open={sheet} onClose={() => setSheet(null)} x={xv.id} y={metric.id} reg={search.reg ?? null}
        onChange={patch} />

      {election && <AuditCard electionId={election.id} label={`${f.ano} · ${f.turno}º turno`} />}

      {!election ? <NoElection year={f.ano} round={f.turno} /> : baseMissing ? (
        <EmptyState title="Comparação indisponível" description="Variações 2022→2026 exigem ano 2026 e o mesmo turno validado em 2022. Selecione 2026 nos filtros." />
      ) : lab.isLoading || ctx.summary.isLoading || !input ? <Skeleton /> : lab.error ? (
        <EmptyState title="Erro ao calcular" description={lab.error.message} action={<Button variant="secondary" className="min-h-11 rounded-full" onClick={() => lab.refetch()}>Tentar de novo</Button>} />
      ) : lab.data && "unavailable" in lab.data ? (
        <EmptyState title="Indicador indisponível" description={lab.data.unavailable} />
      ) : lab.data && lab.data.points.y.length === 0 ? (
        <EmptyState title="Sem pares X/Y" description="Nenhum município tem as duas variáveis neste recorte (ex.: candidato sem o mesmo número em 2022)." />
      ) : compare ? (
        labL.isLoading ? <Skeleton /> : labL.error || !labL.data || "unavailable" in labL.data ? (
          <EmptyState title="Série de Lula indisponível" description={labL.error?.message ?? "Sem dados para Lula neste recorte."} />
        ) : !lab.data || "unavailable" in lab.data ? null : <DuelLab key={analysisKey} context={readingContext} b={lab.data} l={labL.data} bName={focusName(duel.bolsonaro)} xv={xv} yLabel={metric.label} scope={scope}
            fileName={`lab_${f.ano}_t${f.turno}_${xv.id}_${metric.id}_${scope}_bolsonaro_x_lula.csv`} />
      ) : lab.data ? (
        <SeriesScope candidate={candidate} electoral={metric.needsCandidate}><Results key={analysisKey} context={readingContext} name={metric.needsCandidate ? focusName(candidate) : metric.label} a={lab.data} xv={xv} yLabel={yLabel} scope={scope} fileName={`lab_${f.ano}_t${f.turno}_${xv.id}_${metric.id}_${scope}.csv`} /></SeriesScope>
      ) : null}


    </div>
  );
}

function Results({ a, xv, yLabel, scope, fileName, context, name }: { context: ReadingContext; name: string; a: LabAnalysis; xv: (typeof X_VARIABLES)[number]; yLabel: string; scope: string; fileName: string }) {
  const dropped = a.missing.x + a.missing.y;
  const domain = scatterDomain(readingPoints(a), xv.log, false);
  const reading = interpretGraph({ ...context, domain }, [{ name, analysis: a }]);
  return (
    <>
      <Card title={`${xv.label} × ${yLabel} · ${scope}`} footer={`TSE ${context.year}/${context.round}º turno · IBGE Censo 2022. ${scope}. Amostra: ${fmtInt(a.points.y.length)} de ${fmtInt(a.totalRows)} municípios${dropped ? ` (${fmtInt(dropped)} sem dado${a.missing.examples.length ? `: ${a.missing.examples.join(", ")}` : ""})` : ""}.`}>
        <LabScatter domain={domain} points={a.points} xv={xv} yLabel={yLabel} />
        <Button variant="secondary" onClick={() => downloadCsv(a, xv.label, yLabel, fileName)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary text-sm">
          <Download className="size-4" aria-hidden /> Exportar CSV
        </Button>
      </Card>
      <GraphReading reading={reading} />
      <StatisticalDetails>
      <GeometryDetails geometry={reading.geometry} />
      <div><h3 className="mb-3 text-sm font-medium">Correlação bivariada</h3><CorrelationGrid a={a} /></div>
      <div><h3 className="mb-3 text-sm font-medium">Regressão OLS multivariada</h3><ModelTable a={a} /></div>
      <LabMethod x={xv} />
      </StatisticalDetails>
    </>
  );
}

function DuelLab({ b, l, bName, xv, yLabel, scope, fileName, context }: { context: ReadingContext; b: LabAnalysis; l: LabAnalysis; bName: string; xv: (typeof X_VARIABLES)[number]; yLabel: string; scope: string; fileName: string }) {
  const toPts = (a: LabAnalysis) => a.points.y.map((y, i) => ({ code: String(a.points.c[i]), name: a.points.n[i] ?? "", uf: String(a.points.u[i] ?? ""), x: a.points.x[i] ?? 0, y }));
  const series: ScatterSeries[] = [{ id: "bolsonaro", label: bName, points: toPts(b) }, { id: "pt", label: "Lula", points: toPts(l) }];
  const domain = scatterDomain(series.flatMap(s => s.points), xv.log, true);
  const reading = interpretGraph({ ...context, domain }, [{ name: bName, id: "bolsonaro", analysis: b }, { name: "Lula", id: "pt", analysis: l }]);
  return (
    <>
      <Card title={`${xv.label} × ${yLabel} · ${scope}`} footer={`TSE ${context.year}/${context.round}º turno · IBGE Censo 2022 · ${scope}. ${bName}: ${fmtInt(b.points.y.length)} de ${fmtInt(b.totalRows)} municípios; Lula: ${fmtInt(l.points.y.length)} de ${fmtInt(l.totalRows)}.`}>
        <DuelScatter domain={domain} series={series} xLabel={xv.label} yLabel={yLabel} formatX={fmtNum} log={xv.log} />
        <Button variant="secondary" onClick={() => downloadDuelCsv(b, l, bName, xv.label, yLabel, fileName)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary text-sm">
          <Download className="size-4" aria-hidden /> Exportar CSV (os dois)
        </Button>
      </Card>
      <GraphReading reading={reading} />
      <StatisticalDetails>
      <GeometryDetails geometry={reading.geometry} />
      {([[b, bName, "bolsonaro"], [l, "Lula", "pt"]] as const).map(([a, name, s]) => (
        <div key={s} data-series={s} className="space-y-4">
          <h3 className="text-sm font-medium text-series-label">{name}</h3>
          <CorrelationGrid a={a} /><ModelTable a={a} />
        </div>
      ))}
      <LabMethod x={xv} />
      </StatisticalDetails>
    </>
  );
}

function downloadDuelCsv(b: LabAnalysis, l: LabAnalysis, bName: string, xl: string, yl: string, name: string) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const ly = new Map(l.points.c.map((c, i) => [String(c), l.points.y[i]]));
  const codes = new Map<string, { n: string; u: string; x: number | undefined }>();
  b.points.c.forEach((c, i) => codes.set(String(c), { n: b.points.n[i] ?? "", u: String(b.points.u[i] ?? ""), x: b.points.x[i] }));
  l.points.c.forEach((c, i) => { if (!codes.has(String(c))) codes.set(String(c), { n: l.points.n[i] ?? "", u: String(l.points.u[i] ?? ""), x: l.points.x[i] }); });
  const by = new Map(b.points.c.map((c, i) => [String(c), b.points.y[i]]));
  const lines = [["codigo_ibge", "municipio", "uf", esc(xl), esc(`${yl} · ${bName}`), esc(`${yl} · Lula`)].join(",")];
  for (const [c, m] of codes) lines.push([c, esc(m.n), m.u, m.x ?? "", by.get(c) ?? "", ly.get(c) ?? ""].join(","));
  saveCsv(lines, name);
}

function saveCsv(lines: string[], name: string) {
  const url = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const el = document.createElement("a");
  el.href = url; el.download = name; el.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(a: LabAnalysis, xl: string, yl: string, name: string) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [["codigo_ibge", "municipio", "uf", esc(xl), esc(yl)].join(",")];
  a.points.c.forEach((c, i) => lines.push([c, esc(a.points.n[i] ?? ""), a.points.u[i], a.points.x[i], a.points.y[i]].join(",")));
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

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="aspect-[4/3] skeleton rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-3"><div className="h-24 skeleton rounded-lg bg-muted" /><div className="h-24 skeleton rounded-lg bg-muted" /></div>
    </div>
  );
}
