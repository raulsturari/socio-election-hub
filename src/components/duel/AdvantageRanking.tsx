import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useReadyAfter } from '@/components/explore/chart-ready';
import { Button } from '@/components/ui/button';
import { advantageOf, leaderOf, sortByAdvantage, type AdvantageScale, type Territory } from '@/lib/duel-bands';
import { downloadCsv } from '@/lib/csv';

const int = (v: number) => v.toLocaleString('pt-BR');
const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** One diverging ranking of the same territories: Bolsonaro to the right (blue), Lula to the left (red), zero centered. */
export function AdvantageRanking({ items, bName, label, selected, onSelect, replay, csvName, source }: {
  items: Territory[]; bName: string; label: (key: string) => string; selected?: string | null; onSelect?: (key: string) => void; replay: number; csvName: string; source: string;
}) {
  const reduce = useReducedMotion();
  const [scale, setScale] = useState<AdvantageScale>('pp');
  const [open, setOpen] = useState<string | null>(null);
  const sorted = useMemo(() => sortByAdvantage(items, scale), [items, scale]);
  useReadyAfter(reduce ? 0 : 900, [items, scale, replay, reduce]);
  const short = bName.split(' ')[0] ?? bName;
  const max = Math.max(1e-9, ...sorted.map((t) => Math.abs(advantageOf(t, scale))));
  const fmtAdv = (t: Territory) => scale === 'pp' ? `${Math.abs(t.diffPp).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.` : `${int(Math.abs(t.diffVotes))} votos`;
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Escala da vantagem" className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
        {(['pp', 'votes'] as const).map((s) => (
          <button key={s} role="radio" aria-checked={scale === s} onClick={() => setScale(s)} className={`min-h-11 rounded-full text-sm ${scale === s ? 'bg-background font-semibold' : 'text-muted-foreground'}`}>{s === 'pp' ? 'Pontos percentuais' : 'Saldo de votos'}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 text-xs"><span data-series="pt" className="text-series-label">← Lula à frente</span><span data-series="bolsonaro" className="text-right text-series-label">{short} à frente →</span></div>
      <div role="list" className="relative space-y-1">
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
        {sorted.map((t) => {
          const v = advantageOf(t, scale), lead = leaderOf(t.diffPp);
          const w = (Math.abs(v) / max) * 50;
          return (
            <div role="listitem" key={t.key}>
              <button type="button" aria-expanded={open === t.key} onClick={() => { setOpen(open === t.key ? null : t.key); onSelect?.(t.key); }}
                className={`relative block min-h-11 w-full rounded-md text-left ${selected === t.key ? 'ring-1 ring-primary' : ''}`}
                aria-label={`${label(t.key)}: ${lead === 'empate' ? 'empate' : `${lead === 'bolsonaro' ? short : 'Lula'} à frente por ${fmtAdv(t)}`}`}>
                <span className="relative block h-5">
                  <motion.span key={`${replay}-${scale}`} data-series={v >= 0 ? 'bolsonaro' : 'pt'} initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: 1 }} transition={{ duration: reduce ? 0 : 0.6 }}
                    className={`absolute top-0 h-full rounded-sm bg-series ${v >= 0 ? 'origin-left' : 'origin-right'}`} style={v >= 0 ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }} />
                  <span className={`absolute top-0 text-xs font-semibold leading-5 ${v >= 0 ? 'right-[52%]' : 'left-[52%]'}`}>{label(t.key)}</span>
                </span>
                <span className="block text-center text-[11px] tabular-nums text-muted-foreground">{short} {pct(t.b)} · Lula {pct(t.l)} · {lead === 'empate' ? 'empate' : `+${fmtAdv(t)}`} · {int(t.valid)} válidos</span>
              </button>
              {open === t.key && <p role="status" className="px-1 pb-2 text-xs tabular-nums text-muted-foreground">{int(t.count)} município(s) · {short} {int(t.bVotes)} · Lula {int(t.lVotes)} · Outros {int(t.oVotes)} ({pct(t.o)}) · saldo {t.diffVotes > 0 ? '+' : ''}{int(t.diffVotes)} votos</p>}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Escala simétrica em torno de zero. Saldo = votos de {short} − votos de Lula no mesmo recorte; não indica transferência de votos.</p>
      <Button variant="secondary" className="min-h-11 rounded-full" onClick={() => downloadCsv(csvName, ['territorio', 'municipios', 'votos_validos', 'votos_bolsonaro', 'votos_lula', 'votos_outros', 'pct_bolsonaro', 'pct_lula', 'pct_outros', 'vantagem_pp', 'saldo_votos', 'fonte'], sorted.map((t) => [label(t.key), t.count, t.valid, t.bVotes, t.lVotes, t.oVotes, t.b, t.l, t.o, t.diffPp, t.diffVotes, source]))}><Download className="size-4" />Exportar CSV</Button>
    </div>
  );
}
