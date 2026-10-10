import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { SlidersHorizontal } from "lucide-react";
import { ELECTION_YEARS, UFS } from "@/lib/constants";
import { resultsQuery } from "@/services/datasets";
import { BottomSheet, Card, Chip, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";

const searchSchema = z.object({ 
  ano: z.coerce.number().refine((y) => y === undefined || (ELECTION_YEARS as readonly number[]).includes(y)).optional().catch(2022),
  uf: z.string().nullable().optional().catch(null),
  municipio: z.string().nullable().optional().catch(null),
  candidato: z.string().nullable().optional().catch(null),
});

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  loaderDeps: ({ search }) => ({ ano: search.ano ?? 2022, uf: search.uf ?? null }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(resultsQuery(deps.ano, deps.uf)),
  head: () => ({
    meta: [
      { title: "Atlas municipal — Brasil Data Lab" },
      { name: "description", content: "Atlas eleitoral e sociodemográfico dos municípios brasileiros com dados oficiais do TSE e IBGE." },
      { property: "og:title", content: "Atlas municipal — Brasil Data Lab" },
      { property: "og:description", content: "Resultados eleitorais e indicadores por município, com fonte e metodologia." },
    ],
  }),
  errorComponent: ({ error }) => <div role="alert" className="p-4 text-sm">{(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-4 text-sm">Não encontrado.</div>,
  component: Atlas,
});

function Atlas() {
  const raw = Route.useSearch();
  const search = { ano: raw.ano ?? 2022, uf: raw.uf ?? null, municipio: raw.municipio ?? null, candidato: raw.candidato ?? null };
  const navigate = useNavigate({ from: "/" });
  const { data: results } = useSuspenseQuery(resultsQuery(search.ano, search.uf));
  const [sheet, setSheet] = useState(false);
  const hasData = results.length > 0;
  const set = (patch: Partial<typeof search>) => navigate({ search: (p) => ({ ...p, ...patch }) });
  const noData = (
    <EmptyState
      title="Sem dados carregados"
      description="Nenhum arquivo oficial foi ingerido e verificado para este recorte."
      action={<Link to="/dados" className="text-sm text-primary">Ver status das fontes</Link>}
    />
  );

  return (
    <div className="space-y-4 px-4">
      <PageHeader
        title="Atlas"
        subtitle={`${search.ano} · ${search.uf ?? "Brasil"}${search.municipio ? ` · ${search.municipio}` : ""}`}
        action={
          <button onClick={() => setSheet(true)} aria-label="Filtros" className="grid size-11 place-items-center rounded-full bg-secondary">
            <SlidersHorizontal className="size-5" />
          </button>
        }
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {ELECTION_YEARS.map((y) => (
          <Chip key={y} active={search.ano === y} onClick={() => set({ ano: y })}>{y}</Chip>
        ))}
      </div>

      {search.ano === 2026 && (
        <p className="rounded-lg border px-3 py-2 text-xs text-warning">
          2026: apenas resultados oficiais publicados pelo TSE serão exibidos. Sem projeções.
        </p>
      )}

      <Card title="Mapa municipal" footer="Malha municipal IBGE · pinça para zoom quando carregada">
        <div className="aspect-square touch-pinch-zoom">{hasData ? null : noData}</div>
      </Card>

      <Card title="Resultados">
        {hasData ? null : <p className="text-sm text-muted-foreground">—</p>}
      </Card>

      <Card title="Comparação histórica" footer="2018 · 2022 · 2026, harmonizado por código IBGE">
        {noData}
      </Card>

      <Card title="Dispersão renda × votação" footer="Nível municipal. Não indica comportamento individual (falácia ecológica).">
        <Link to="/correlacoes" className="text-sm text-primary">Abrir correlações</Link>
      </Card>

      <Card title="Fonte e metodologia">
        <SourceNote>
          Votos: TSE, resultados por município. Renda: IBGE SIDRA (Censo). Junção por código IBGE de 7 dígitos e ano.
          Valores ausentes aparecem como “—”. Nenhum número é estimado ou gerado.
        </SourceNote>
      </Card>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Filtros">
        <div className="space-y-4 pb-4">
          <div>
            <p className="label-caps mb-2">UF</p>
            <div className="grid grid-cols-6 gap-2">
              <Chip active={!search.uf} onClick={() => set({ uf: null, municipio: null })}>BR</Chip>
              {UFS.map((uf) => (
                <Chip key={uf} active={search.uf === uf} onClick={() => set({ uf, municipio: null })}>{uf}</Chip>
              ))}
            </div>
          </div>
          {(["municipio", "candidato"] as const).map((k) => (
            <label key={k} className="block">
              <span className="label-caps">{k === "municipio" ? "Município" : "Candidato"}</span>
              <input
                defaultValue={search[k] ?? ""}
                onBlur={(e) => set({ [k]: e.target.value.trim() || null })}
                placeholder="Disponível após ingestão"
                className="mt-2 min-h-11 w-full rounded-full border bg-secondary px-4 text-base outline-none focus:border-primary"
              />
            </label>
          ))}
          <button onClick={() => setSheet(false)} className="min-h-12 w-full rounded-full bg-primary font-medium text-primary-foreground">
            Aplicar
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
