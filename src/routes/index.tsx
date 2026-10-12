import { ModeSelector } from "@/components/duel/ModeSelector";
import { DuelResults } from "@/components/duel/DuelResults";
import { duelTitle, groupSummary } from "@/lib/duel";
import { createFileRoute } from "@tanstack/react-router";
import { filtersSchema } from "@/lib/filters";
import { electionsQuery } from "@/services/queries";
import { useFilters } from "@/hooks/use-filters";
import { fmtInt } from "@/lib/format";
import { Card, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";
import { FilterBar } from "@/components/FilterBar";
import { MunicipalWinnerMap } from "@/components/MunicipalWinnerMap";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => <div role="alert" className="p-4 text-sm">{(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-4 text-sm">Não encontrado.</div>,
  component: Atlas,
});

function Atlas() {
  const ctx = useFilters();
  const { f, election, elections, summary, duel, mode, set } = ctx;
  const grouped = groupSummary(summary.data ?? []);

  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Atlas" subtitle={`Presidente · ${duelTitle(f.ano)} · por município`} />
      <FilterBar ctx={ctx} />
      <ModeSelector ctx={ctx} />

      {!election ? (
        <NoElection year={f.ano} round={f.turno} />
      ) : (
        <>
          <Card title={`Vencedor por município · ${f.uf ?? "Brasil"}`} footer="Mais votado entre todas as candidaturas reais. Empate e ausência de dados são apresentados separadamente; a soma Outros não determina um vencedor.">
            <MunicipalWinnerMap electionId={election.id} year={f.ano} uf={f.uf} selected={f.mun} onSelect={(mun) => set({ mun })} />
          </Card>

          <Card title={f.mun ? "Resultado no município" : `Resultado · ${f.uf ?? "Brasil"}`} footer={`Votos nominais válidos (todas as candidaturas): ${fmtInt(grouped?.valid ?? 0)}${f.uf ? "" : " · exclui votos no exterior"}. Brancos, nulos e abstenção ficam fora de Outros.`}>
            {summary.isLoading ? <Skeleton /> : summary.error ? (
              <EmptyState title="Erro ao carregar" description={summary.error.message} />
            ) : !grouped ? <EmptyState title="Sem dados" description="Nenhum voto importado neste recorte." /> : (
              <DuelResults summary={grouped} year={f.ano} mode={mode} names={duel} />
            )}
          </Card>

          <TurnoutCard electionId={election.id} uf={f.uf} ibge={f.mun} />


        </>
      )}

      <YearCompare elections={elections} round={f.turno} uf={f.uf} ibge={f.mun} areaLabel={f.mun ?? f.uf ?? "Brasil"} />

      <Card title="Fonte e metodologia">
        <SourceNote>
          TSE, arquivo votacao_candidato_munzona_{f.ano} (QT_VOTOS_NOMINAIS_VALIDOS), agregado de zona para município.
          Código TSE convertido para código IBGE e validado contra a API de Localidades do IBGE. Percentual = votos do
          grupo ÷ todos os votos nominais válidos do recorte (sem renormalizar os dois a 100%). Outros = soma dos votos das demais
          candidaturas, mantidas individualmente na base. Comparecimento, abstenção, brancos e nulos vêm de detalhe_votacao_munzona.
        </SourceNote>
      </Card>
    </div>
  );
}

function Skeleton() {
  return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 skeleton rounded-lg bg-muted" />)}</div>;
}
