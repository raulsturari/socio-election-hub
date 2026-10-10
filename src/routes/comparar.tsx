import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyState, PageHeader, SourceNote } from "@/components/ui-kit";

export const Route = createFileRoute("/comparar")({
  head: () => ({
    meta: [
      { title: "Comparar municípios — Brasil Data Lab" },
      { name: "description", content: "Compare municípios e eleições lado a lado com dados oficiais." },
      { property: "og:title", content: "Comparar municípios — Brasil Data Lab" },
      { property: "og:description", content: "Comparação entre municípios, UFs e anos eleitorais." },
    ],
  }),
  component: () => (
    <div className="space-y-4 px-4">
      <PageHeader title="Comparar" subtitle="Municípios, UFs e anos lado a lado" />
      <Card title="Seleção">
        <EmptyState title="Nada para comparar ainda" description="A comparação fica disponível quando houver ao menos dois recortes com dados verificados." />
      </Card>
      <Card title="Nota">
        <SourceNote>Comparações usam apenas o mesmo cargo e turno, e código IBGE harmonizado entre anos.</SourceNote>
      </Card>
    </div>
  ),
});
