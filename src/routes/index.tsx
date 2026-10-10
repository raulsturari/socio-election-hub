import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { filtersSchema } from "@/lib/filters";
import { electionsQuery, sharesQuery } from "@/services/queries";
import { useFilters } from "@/hooks/use-filters";
import { fmtInt } from "@/lib/format";
import { Card, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";
import { FilterBar } from "@/components/FilterBar";
import { ResultsList } from "@/components/ResultsList";
import { ChoroplethMap } from "@/components/ChoroplethMap";
import { NoElection } from "@/components/NoElection";
import { TurnoutCard } from "@/components/TurnoutCard";
import { YearCompare } from "@/components/YearCompare";

export const Route = createFileRoute("/")({
  validateSearch: filtersSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(electionsQuery()),
  head: () => ({
    meta: [
      { title: "Atlas municipal — Brasil Data Lab" },
      { name: "description", content: "Resultados eleitorais oficiais do TSE por município, com mapa e proveniência." },
      { property: "og:title", content: "Atlas municipal — Brasil Data Lab" },
      { property: "og:description", content: "Resultados presidenciais por município, a partir dos dados abertos do TSE." },
    ],
  }),
  errorComponent: ({ error }) => <div role="alert" className="p-4 text-sm">{(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-4 text-sm">Não encontrado.</div>,
  component: Atlas,
});

function Atlas() {
  const ctx = useFilters();
  const { f, election, elections, summary, candidate, set } = ctx;
  const shares = useQuery({
    ...sharesQuery(election?.id ?? 0, candidate?.candidate_id ?? 0, f.uf),
    enabled: !!election && !!candidate && !!f.uf,
  });
  const shareMap = new Map((shares.data ?? []).map((s) => [s.ibge_code, s.share === null ? null : Number(s.share)]));
  const total = (summary.data ?? []).reduce((a, c) => a + c.votes, 0);

  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Atlas" subtitle="Presidente · resultados por município" />
      <FilterBar ctx={ctx} />

      {!election ? (
        <NoElection year={f.ano} round={f.turno} />
      ) : (
        <>
          <Card title={f.mun ? "Resultado no município" : `Resultado · ${f.uf ?? "Brasil"}`} footer={`Votos nominais válidos: ${fmtInt(total)}${f.uf ? "" : " · exclui votos no exterior"}`}>
            {summary.isLoading ? <Skeleton /> : summary.error ? (
              <EmptyState title="Erro ao carregar" description={summary.error.message} />
            ) : (
              <ResultsList rows={summary.data ?? []} selected={candidate?.number ?? null} onSelect={(n) => set({ cand: n })} />
            )}
          </Card>

          <TurnoutCard electionId={election.id} uf={f.uf} ibge={f.mun} />

          <Card title={`Mapa · ${candidate?.ballot_name ?? "—"}`} footer="Malha municipal IBGE · use dois dedos para zoom · toque para selecionar">
            {!f.uf ? (
              <EmptyState title="Escolha uma UF" description="O mapa municipal é exibido por UF para manter o desempenho no celular." />
            ) : shares.isLoading ? <Skeleton /> : (
              <ChoroplethMap uf={f.uf} shares={shareMap} selected={f.mun} onSelect={(mun) => set({ mun })} />
            )}
          </Card>
        </>
      )}

      <YearCompare elections={elections} round={f.turno} uf={f.uf} ibge={f.mun} areaLabel={f.mun ?? f.uf ?? "Brasil"} />

      <Card title="Comparação histórica" footer="Só aparecem eleições importadas e reconciliadas.">
        <Link to="/comparar" search={true} className="text-sm text-primary">Comparar municípios e anos</Link>
      </Card>

      <Card title="Fonte e metodologia">
        <SourceNote>
          TSE, arquivo votacao_candidato_munzona_{f.ano} (QT_VOTOS_NOMINAIS_VALIDOS), agregado de zona para município.
          Código TSE convertido para código IBGE e validado contra a API de Localidades do IBGE. Percentual = votos do
          candidato ÷ votos nominais válidos no município. Comparecimento, abstenção, brancos e nulos vêm de detalhe_votacao_munzona.
        </SourceNote>
      </Card>
    </div>
  );
}

function Skeleton() {
  return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 skeleton rounded-lg bg-muted" />)}</div>;
}
