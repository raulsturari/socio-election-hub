import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { useReadyAfter } from '@/components/explore/chart-ready';
import { Button } from '@/components/ui/button';
import { leaderOf, readBands, type BandsResult } from '@/lib/duel-bands';
import { downloadCsv } from '@/lib/csv';

const pct = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const int = (v: number) => v.toLocaleString('pt-BR');

/** "Quem lidera em cada faixa?": both candidates side by side per municipal band on one 0–100% scale. */
export function LeaderBands({ result, bName, outros, xLabel, unit, topic, source, replay }: {
  result: BandsResult; bName: string; outros: boolean; xLabel: string; unit: string; topic: string; source: string; replay: number;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);
  useReadyAfter(reduce ? 0 : 900, [result, replay, reduce, outros]);
  const short = bName.split(' ')[0] ?? bName;
  const reading = readBands(result.bands, bName, topic);
  const rows = (b: BandsResult['bands'][number]) => [
    { s: 'bolsonaro', name: short, v: b.b, votes: b.bVotes },
    { s: 'pt', name: 'Lula', v: b.l, votes: b.lVotes },
    ...(outros ? [{ s: 'outros', name: 'Outros', v: b.o, votes: b.oVotes }] : []),
  ];
  const exportCsv = () => downloadCsv('faixas-bolsonaro-lula.csv',
    ['faixa', 'x_min', 'x_max', 'x_limite_inferior_exclusivo', 'unidade_x', 'municipios', 'votos_validos', 'votos_bolsonaro', 'votos_lula', 'votos_outros', 'pct_bolsonaro', 'pct_lula', 'pct_outros', 'diferenca_pp', 'diferenca_votos', 'fonte'],
    result.bands.map((b) => [b.label, b.min, b.max, b.lowerExclusive, unit, b.count, b.valid, b.bVotes, b.lVotes, b.oVotes, b.b, b.l, b.o, b.diffPp, b.diffVotes, source]));
  return (
    <div className="space-y-4">
      {reading && <div><h3 className="text-lg font-semibold leading-snug">{reading.headline}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{reading.body}</p></div>}
      <p className="text-xs text-muted-foreground">Municípios agrupados por {xLabel.toLowerCase()} · percentual sobre todos os votos válidos de cada faixa · escala 0–100%</p>
      {result.reduced && <p role="note" className="text-xs text-muted-foreground">Poucos valores distintos neste indicador: {result.bands.length} faixa(s), sem dividir empates.</p>}
      <div role="list" aria-label="Faixas do indicador" className="space-y-3">
        {result.bands.map((b) => {
          const lead = leaderOf(b.diffPp);
          return (
            <div role="listitem" key={b.index} className="rounded-lg bg-secondary/40 p-3">
              <button type="button" className="flex min-h-11 w-full items-center justify-between gap-2 text-left" aria-expanded={open === b.index} onClick={() => setOpen(open === b.index ? null : b.index)}>
                <span className="text-sm font-medium">{b.label}</span>
                <span data-series={lead === 'empate' ? 'outros' : lead} className="shrink-0 rounded-full border border-series px-2 py-0.5 text-xs tabular-nums text-series-label">
                  {lead === 'empate' ? 'Empate' : `${lead === 'bolsonaro' ? short : 'Lula'} +${Math.abs(b.diffPp).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`}
                </span>
              </button>
              <div className="mt-1 space-y-1.5">
                {rows(b).map((s) => (
                  <div key={s.s} data-series={s.s} className="grid grid-cols-[52px_1fr_52px] items-center gap-2 text-xs">
                    <span className="truncate text-series-label">{s.name}</span>
                    <span className="block h-4 overflow-hidden rounded-full bg-secondary">
                      <motion.span key={replay} initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: 1 }} transition={{ duration: reduce ? 0 : 0.7, ease: 'easeOut' }} className="block h-full origin-left rounded-full bg-series" style={{ width: `${s.v}%` }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{pct(s.v)}</span>
                  </div>
                ))}
              </div>
              {open === b.index && (
                <dl role="status" className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-3 text-xs text-muted-foreground tabular-nums">
                  <dt>Municípios</dt><dd className="text-right">{int(b.count)}</dd>
                  <dt>Votos válidos</dt><dd className="text-right">{int(b.valid)}</dd>
                  <dt>{short}</dt><dd className="text-right">{int(b.bVotes)}</dd>
                  <dt>Lula</dt><dd className="text-right">{int(b.lVotes)}</dd>
                  <dt>Outros</dt><dd className="text-right">{int(b.oVotes)}</dd>
                  <dt>Diferença</dt><dd className="text-right">{b.diffVotes > 0 ? '+' : ''}{int(b.diffVotes)} votos · {b.diffPp > 0 ? '+' : ''}{b.diffPp.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p.</dd>
                  <dt>Intervalo observado</dt><dd className="text-right">{b.min.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} a {b.max.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {unit}</dd>
                  <dt className="col-span-2">{source}</dt>
                </dl>
              )}
            </div>
          );
        })}
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="min-h-11 cursor-pointer py-3">Ver detalhes do cálculo</summary>
        <p className="leading-relaxed">Faixas por quantis de municípios (até {result.requested}), ordenadas do menor ao maior valor de {xLabel.toLowerCase()}; cada faixa inclui valores acima do limite da anterior até o seu limite, sem dividir empates. Percentual = soma dos votos do candidato ÷ soma dos votos válidos dos municípios da faixa (votos válidos contados uma vez por município); Outros = votos válidos − {short} − Lula. Brancos, nulos e abstenções não entram. {int(result.excludedNoX)} município(s) sem o indicador e {int(result.excludedNoVotes)} sem votos ficaram fora, sem estimativa. Diferenças abaixo de 0,5 p.p. aparecem como empate. Comparação entre municípios; não identifica o voto de cada pessoa.</p>
      </details>
      <Button variant="secondary" className="min-h-11 rounded-full" onClick={exportCsv}><Download className="size-4" />Exportar CSV</Button>
    </div>
  );
}
