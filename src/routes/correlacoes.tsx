import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";

export const Route = createFileRoute("/correlacoes")({
  head: () => ({
    meta: [
      { title: "Correlações — Brasil Data Lab" },
      { name: "description", content: "Relações entre indicadores sociodemográficos e votação em nível municipal." },
      { property: "og:title", content: "Correlações — Brasil Data Lab" },
      { property: "og:description", content: "Dispersão renda × votação e outros indicadores municipais." },
    ],
  }),
  component: () => (
    <div className="space-y-4 px-4">
      <PageHeader title="Correlações" subtitle="Indicadores × votação, nível municipal" />
      <Card title="Renda × votação">
        <EmptyState title="Sem pares de dados" description="Requer resultados TSE e renda IBGE ingeridos para o mesmo ano e municípios." />
      </Card>
      <Card title="Leitura responsável">
        <SourceNote>
          Correlações entre agregados municipais não descrevem o comportamento de indivíduos. Correlação não implica
          causalidade. Coeficientes são calculados por código, nunca estimados.
        </SourceNote>
      </Card>
    </div>
  ),
});
