import { GEOMETRY_CRITERIA, type ScatterGeometry } from '@/lib/scatter-geometry';
import { fmtReading } from '@/lib/graph-reading';

export function GeometryDetails({ geometry: g }: { geometry: ScatterGeometry }) {
  const value = (v: number) => Number.isFinite(v) ? fmtReading(v) : '—';
  return <section className="space-y-3 text-xs text-muted-foreground" aria-label="Diagnóstico do desenho">
    <h3 className="text-sm font-medium text-foreground">Desenho e escala exibida</h3>
    <p>{GEOMETRY_CRITERIA}</p>
    <p className="tabular-nums">X {g.domain.log ? '(log10)' : '(linear)'}: {g.domain.x.map(value).join(' a ')} · Y: {g.domain.y.map(value).join(' a ')}. Municípios únicos: {g.horizontal.n}; pares: {g.pairedN}. Terço esquerdo: {value(g.horizontal.left * 100)}%; direito: {value(g.horizontal.right * 100)}%. X original: mín. {value(g.horizontal.min)}, mediana {value(g.horizontal.median)}, P90 {value(g.horizontal.p90)}, máx. {value(g.horizontal.max)}.</p>
    {g.vertical.map(v => <div key={v.name} className="space-y-1 tabular-nums"><p>{v.name}: base {value(v.base * 100)}%, topo {value(v.top * 100)}%; mediana Y {value(v.median)}; IQR intrafaixa mediano / altura {value(v.spread * 100)}%.</p>{v.bins.map((b, i) => <p key={i}>Faixa X {value(b.xMin)}–{value(b.xMax)}: n={b.n}, mediana Y={value(b.medianY)}, IQR={value(b.iqrY)}.</p>)}</div>)}
    <p>Cruzamento conservador sustentado: {g.crossing ? 'sim' : 'não'}. {g.composition ? `Composição percentual verificada nos pares; mediana residual de Outros: ${value(g.composition.othersMedian)}%.` : 'Residual Outros não calculado: métrica não composicional ou pares insuficientes/inválidos.'}</p>
    {g.bands.map((b, i) => <p key={i} className="tabular-nums">Faixa pareada {value(b.xMin)}–{value(b.xMax)}: n={b.n}; medianas {value(b.first)} / {value(b.second)}.</p>)}
  </section>;
}