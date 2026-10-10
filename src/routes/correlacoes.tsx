import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { filtersSchema } from "@/lib/filters";
import { electionsQuery, scatterQuery } from "@/services/queries";
import { useFilters } from "@/hooks/use-filters";
import { Card, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";
import { FilterBar } from "@/components/FilterBar";
import { ScatterPlot } from "@/components/ScatterPlot";
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
  const { f, election, candidate } = ctx;
  const scatter = useQuery({
    ...scatterQuery(election?.id ?? 0, candidate?.candidate_id ?? 0, f.uf),
    enabled: !!election && !!candidate,
  });

  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Correlações" subtitle="Renda per capita × votação, por município" />
      <FilterBar ctx={ctx} />

      <div className="flex gap-3 rounded-lg border p-3" role="note">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Falácia ecológica:</span> cada ponto é um município. Uma relação
          entre médias municipais não indica como pessoas de determinada renda votaram. Correlação não implica causalidade.
        </p>
      </div>

      <Card title={`${candidate?.ballot_name ?? "—"} · ${f.uf ?? "Brasil"}`} footer="Eixo X em escala logarítmica.">
        {!election ? <NoElection year={f.ano} round={f.turno} /> : scatter.isLoading || !candidate ? (
          <div className="aspect-[4/3] skeleton rounded-lg bg-muted" />
        ) : scatter.error ? (
          <EmptyState title="Erro ao carregar" description={scatter.error.message} />
        ) : (scatter.data ?? []).length === 0 ? (
          <EmptyState title="Dados não importados" description="Sem pares renda/votação para este recorte." />
        ) : (
          <ScatterPlot points={scatter.data ?? []} />
        )}
      </Card>

      <Card title="Fonte">
        <SourceNote>
          Renda: IBGE SIDRA tabela 10295, variável 13431 — rendimento nominal médio mensal domiciliar per capita, Censo 2022.
          Votação: TSE 2022, % dos votos nominais válidos. Junção por código IBGE. r calculado sobre log10 da renda.
        </SourceNote>
      </Card>
    </div>
  );
}
