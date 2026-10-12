import { useState } from "react";
import { SeriesScope } from "@/components/SeriesScope";
import { ModeSelector } from "@/components/duel/ModeSelector";
import { DuelResults, DuelLegend } from "@/components/duel/DuelResults";
import { DuelDetail } from "@/components/duel/DuelDetail";
import { displayName, duelMunicipality, duelTitle, groupSummary } from "@/lib/duel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { filtersSchema } from "@/lib/filters";
import { duelQuery, electionsQuery } from "@/services/queries";
import { useFilters } from "@/hooks/use-filters";
import { fmtInt } from "@/lib/format";
import { Card, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";
import { FilterBar } from "@/components/FilterBar";
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
  const [layout, setLayout] = useState<"vantagem" | "lado">("vantagem");
  const duelData = useQuery({ ...duelQuery(election?.id ?? 0, f.uf), enabled: !!election && !!f.uf });
  const muni = new Map((duelData.data?.rows ?? []).map((r) => [r.ibge_code, duelMunicipality(r)]));
  const pick = (k: "b" | "l" | "adv") => new Map([...muni].map(([c, m]) => [c, k === "adv" ? m.advantage : k === "b" ? m.b.share : m.l.share]));
  const grouped = groupSummary(summary.data ?? []);
  const sharedMax = Math.max(1, ...[...muni.values()].flatMap((m) => [m.b.share ?? 0, m.l.share ?? 0]));
  const detail = (c: string) => <DuelDetail m={muni.get(c)} year={f.ano} />;
  const single = mode !== "comparar";
  const focus = mode === "lula" ? duel.lula : duel.bolsonaro;

  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Atlas" subtitle={`Presidente · ${duelTitle(f.ano)} · por município`} />
      <FilterBar ctx={ctx} />
      <ModeSelector ctx={ctx} />

      {!election ? (
        <NoElection year={f.ano} round={f.turno} />
      ) : (
        <>
          <Card title={f.mun ? "Resultado no município" : `Resultado · ${f.uf ?? "Brasil"}`} footer={`Votos nominais válidos (todas as candidaturas): ${fmtInt(grouped?.valid ?? 0)}${f.uf ? "" : " · exclui votos no exterior"}. Brancos, nulos e abstenção ficam fora de Outros.`}>
            {summary.isLoading ? <Skeleton /> : summary.error ? (
              <EmptyState title="Erro ao carregar" description={summary.error.message} />
            ) : !grouped ? <EmptyState title="Sem dados" description="Nenhum voto importado neste recorte." /> : (
              <DuelResults summary={grouped} year={f.ano} mode={mode} names={duel} />
            )}
          </Card>

          <TurnoutCard electionId={election.id} uf={f.uf} ibge={f.mun} />

          <Card title={single ? `Mapa · ${displayName(mode === "lula" ? "pt" : "bolsonaro", f.ano, focus)}` : `Mapa · ${duelTitle(f.ano)}`} footer="Malha municipal IBGE · use dois dedos para zoom · toque para ver os dois e Outros">
            {!f.uf ? (
              <EmptyState title="Escolha uma UF" description="O mapa municipal é exibido por UF para manter o desempenho no celular." />
            ) : duelData.isLoading ? <Skeleton /> : duelData.error ? (
              <EmptyState title="Erro ao carregar" description={duelData.error.message} action={<button className="min-h-11 rounded-full bg-secondary px-4 text-sm" onClick={() => duelData.refetch()}>Tentar de novo</button>} />
            ) : single ? (
              <SeriesScope candidate={focus}><ChoroplethMap uf={f.uf} shares={pick(mode === "lula" ? "l" : "b")} selected={f.mun} onSelect={(mun) => set({ mun })} detail={detail} /></SeriesScope>
            ) : (
              <>
                <div role="radiogroup" aria-label="Tipo de mapa" className="mb-3 grid grid-cols-2 gap-1 rounded-full border p-1">
                  {(["vantagem", "lado"] as const).map((l) => (
                    <button key={l} role="radio" aria-checked={layout === l} onClick={() => setLayout(l)} className={`min-h-11 rounded-full text-xs ${layout === l ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
                      {l === "vantagem" ? "Vantagem B − L" : "Lado a lado"}
                    </button>
                  ))}
                </div>
                {layout === "vantagem" ? (
                  <ChoroplethMap uf={f.uf} diverging shares={pick("adv")} selected={f.mun} onSelect={(mun) => set({ mun })} detail={detail} label="vantagem" />
                ) : (
                  <div className="space-y-4">
                    <DuelLegend year={f.ano} />
                    {(["b", "l"] as const).map((k) => (
                      <div key={k} data-series={k === "b" ? "bolsonaro" : "pt"}>
                        <p className="label-caps mb-1">{k === "b" ? displayName("bolsonaro", f.ano, duel.bolsonaro) : "Lula"} · mesma escala</p>
                        <ChoroplethMap uf={f.uf ?? ""} shares={pick(k)} max={sharedMax} selected={f.mun} onSelect={(mun) => set({ mun })} detail={k === "l" ? detail : undefined} label={k} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
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
