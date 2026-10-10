import { Card } from "@/components/ui-kit";
import { MUNICIPAL_CAUTION, type GraphReading as Reading } from "@/lib/graph-reading";

export function GraphReading({ reading }: { reading: Reading }) {
  return <Card title="Leitura do gráfico">
    <div className="space-y-4 text-sm leading-relaxed" data-testid="graph-reading">
      <h3 className="font-medium">{reading.title}</h3>
      {reading.paragraphs.map((text, i) => <p key={i} className="text-muted-foreground">{text}</p>)}
      {reading.limitations.length > 0 && <p className="text-xs text-muted-foreground" aria-label="Limitações">{reading.limitations.join(" ")}</p>}
      <p className="text-xs text-muted-foreground">{MUNICIPAL_CAUTION}</p>
    </div>
  </Card>;
}
