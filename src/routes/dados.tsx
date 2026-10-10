import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DATA_SOURCES } from "@/lib/constants";
import { statusesQuery } from "@/services/datasets";
import { Card, PageHeader, SourceNote } from "@/components/ui-kit";

export const Route = createFileRoute("/dados")({
  loader: ({ context }) => context.queryClient.ensureQueryData(statusesQuery()),
  head: () => ({
    meta: [
      { title: "Fontes e proveniência — Brasil Data Lab" },
      { name: "description", content: "Status de ingestão e verificação das fontes TSE, IBGE, IPEA, INEP e DATASUS." },
      { property: "og:title", content: "Fontes e proveniência — Brasil Data Lab" },
      { property: "og:description", content: "Transparência sobre cada base de dados utilizada." },
    ],
  }),
  errorComponent: ({ error }) => <div role="alert" className="p-4 text-sm">{(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-4 text-sm">Não encontrado.</div>,
  component: Dados,
});

function Dados() {
  const { data: statuses } = useSuspenseQuery(statusesQuery());
  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Dados" subtitle="Fontes oficiais e proveniência" />
      <Card title="Fontes">
        <ul className="divide-y">
          {DATA_SOURCES.map((s) => {
            const st = statuses.find((x) => x.source === s.id);
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium">{s.name}</a>
                  <p className="truncate text-xs text-muted-foreground">{s.scope}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground">
                    {st?.loaded ? "Verificado" : "Não carregado"}
                  </span>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">{st?.rows ?? "—"} linhas</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card title="Princípios">
        <SourceNote>
          Cada registro guarda fonte, arquivo, data de coleta e checksum. Harmonização por código IBGE e ano.
          Dados de demonstração, se usados, serão sempre rotulados como tal.
        </SourceNote>
      </Card>
    </div>
  );
}
