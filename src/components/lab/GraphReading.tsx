import { Card } from "@/components/ui-kit";
import { MUNICIPAL_CAUTION, type GraphReading as Reading } from "@/lib/graph-reading";

export function GraphReading({ reading }: { reading: Reading }) {
  return <Card title="O que este gráfico mostra">
    <div className="space-y-4 text-sm leading-relaxed" data-testid="graph-reading">
      <h3 className="font-medium">{reading.title}</h3>
      <p className="text-muted-foreground">{reading.introduction}</p>
      {reading.series.map((s) => <p key={s.name} data-series={s.id}><strong className={s.id ? "text-series-label" : "text-foreground"}>{s.name}. </strong>{s.text}</p>)}
      {reading.limitations.length > 0 && <ul className="space-y-2 text-xs text-muted-foreground" aria-label="Limitações">{reading.limitations.map((note) => <li key={note}>{note}</li>)}</ul>}
      <p className="text-xs text-muted-foreground">{MUNICIPAL_CAUTION}</p>
    </div>
  </Card>;
}
