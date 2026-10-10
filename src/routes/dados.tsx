import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { provenanceQuery } from "@/services/queries";
import { fmtDateTime, fmtInt } from "@/lib/format";
import { Card, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";

export const Route = createFileRoute("/dados")({
  loader: ({ context }) => context.queryClient.ensureQueryData(provenanceQuery()),
  head: () => ({
    meta: [
      { title: "Fontes, importações e integridade — Brasil Data Lab" },
      { name: "description", content: "Proveniência, cobertura e checagens de integridade de cada importação oficial." },
      { property: "og:title", content: "Fontes e importações — Brasil Data Lab" },
      { property: "og:description", content: "Transparência sobre TSE, IBGE e demais bases utilizadas." },
    ],
  }),
  errorComponent: ({ error }) => <div role="alert" className="p-4 text-sm">{(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-4 text-sm">Não encontrado.</div>,
  component: Dados,
});

const STATUS: Record<string, string> = { succeeded: "Concluída", failed: "Falhou", running: "Em andamento", pending: "Pendente" };
const PENDING = ["TSE 2018 (presidente)", "TSE 2026 (após publicação oficial)", "IPEA", "INEP", "DATASUS"];

function Dados() {
  const { data } = useSuspenseQuery(provenanceQuery());
  return (
    <div className="space-y-4 px-4">
      <PageHeader title="Dados" subtitle="Proveniência e integridade" />

      <Card title="Importações recentes">
        {data.jobs.length === 0 ? <EmptyState title="Nenhuma importação" description="Rode o pipeline de ingestão." /> : (
          <ul className="space-y-3">
            {data.jobs.map((j) => (
              <li key={j.id}>
                <details className="rounded-lg bg-muted p-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{j.kind}</span>
                      <span className="block text-xs text-muted-foreground">{j.source_id} · {fmtDateTime(j.finished_at ?? j.started_at)}</span>
                    </span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${j.status === "succeeded" ? "text-positive" : j.status === "failed" ? "text-negative" : "text-muted-foreground"}`}>
                      {STATUS[j.status] ?? j.status}
                    </span>
                  </summary>
                  <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <Row k="Linhas lidas / gravadas" v={`${fmtInt(j.rows_read)} / ${fmtInt(j.rows_written)}`} />
                    <Row k="Atualização na fonte" v={fmtDateTime(j.source_last_modified)} />
                    <Row k="SHA-256" v={j.file_sha256 ? `${j.file_sha256.slice(0, 16)}…` : "—"} />
                    {j.error && <Row k="Erro" v={j.error} />}
                  </dl>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-2 text-[10px] text-muted-foreground">
                    {`Cobertura ${j.coverage}\nIntegridade ${j.integrity}`}
                  </pre>
                  <a href={j.source_url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-primary">{j.source_url}</a>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Indicadores">
        <ul className="space-y-3">
          {data.indicators.map((i) => (
            <li key={i.id}>
              <p className="text-sm font-medium">{i.name} <span className="text-muted-foreground">({i.unit})</span></p>
              <p className="text-xs text-muted-foreground">SIDRA tabela {i.source_table}, variável {i.source_variable}. {i.methodology}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Fontes cadastradas">
        <ul className="divide-y">
          {data.sources.map((s) => (
            <li key={s.id} className="py-2">
              <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-sm">{s.name}</a>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Ainda não importado">
        <ul className="space-y-1 text-sm text-muted-foreground">{PENDING.map((p) => <li key={p}>— {p}</li>)}</ul>
      </Card>

      <Card title="Princípios">
        <SourceNote>Nenhum valor é estimado ou inventado. Eleição só aparece no app depois que zonas, municípios e o total do arquivo do TSE batem exatamente.</SourceNote>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt>{k}</dt><dd className="min-w-0 break-all text-right tabular-nums text-foreground">{v}</dd></div>;
}
