/**
 * Pure, exact comparison aggregates for Explore: municipal bands of an indicator X and
 * per-territory advantage. Every share is a ratio of sums over ALL valid votes of the group
 * (valid counted once per municipality); Outros = valid − Bolsonaro − Lula. Never averages
 * municipal percentages and never reconstructs votes from rounded shares.
 */
export interface BandInput { ibge_code: string; x: number | null; b: number | null; l: number | null; valid: number | null }
export interface GroupTotals { count: number; valid: number; bVotes: number; lVotes: number; oVotes: number; b: number; l: number; o: number; diffPp: number; diffVotes: number }
export interface Band extends GroupTotals { index: number; min: number; max: number; lowerExclusive: number | null; label: string }
export interface BandsResult { bands: Band[]; excludedNoX: number; excludedNoVotes: number; distinct: number; requested: number; reduced: boolean }

export const MAX_BANDS = 5;
export const MIN_BANDS = 3;

function totals(rows: readonly { b: number; l: number; valid: number }[]): GroupTotals {
  let bVotes = 0, lVotes = 0, valid = 0;
  for (const r of rows) { bVotes += r.b; lVotes += r.l; valid += r.valid; }
  const oVotes = valid - bVotes - lVotes;
  const pct = (v: number) => (valid > 0 ? (100 * v) / valid : 0);
  const b = pct(bVotes), l = pct(lVotes);
  return { count: rows.length, valid, bVotes, lVotes, oVotes, b, l, o: pct(oVotes), diffPp: b - l, diffVotes: bVotes - lVotes };
}

/** Indicator value formatted with its real unit. */
export function formatX(v: number, unit: string): string {
  const n = (d: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: d });
  if (unit === 'R$') return `R$ ${n(0)}`;
  if (unit === '%') return `${n(1)}%`;
  return unit ? `${n(2)} ${unit}` : n(2);
}

/**
 * Quantile bands over municipalities ordered by X. Ties are never split: a cut happens only
 * between distinct values, so each value belongs to exactly one band. Fewer distinct values
 * than requested bands => fewer bands (`reduced`). Band k contains x with lowerExclusive < x ≤ max.
 */
export function buildBands(rows: readonly BandInput[], unit: string, requested = MAX_BANDS): BandsResult {
  let excludedNoX = 0, excludedNoVotes = 0;
  const usable: { x: number; b: number; l: number; valid: number }[] = [];
  for (const r of rows) {
    if (r.x == null || !Number.isFinite(r.x)) { excludedNoX++; continue; }
    if (r.b == null || r.l == null || r.valid == null || r.valid <= 0) { excludedNoVotes++; continue; }
    usable.push({ x: r.x, b: r.b, l: r.l, valid: r.valid });
  }
  usable.sort((a, b) => a.x - b.x);
  const distinct = new Set(usable.map((r) => r.x)).size;
  const k = Math.max(1, Math.min(requested, distinct));
  const groups: (typeof usable)[] = [];
  let current: typeof usable = [];
  for (let i = 0; i < usable.length; i++) {
    const r = usable[i]!;
    current.push(r);
    const next = usable[i + 1];
    const target = ((groups.length + 1) * usable.length) / k;
    if (next && next.x !== r.x && i + 1 >= target && groups.length < k - 1) { groups.push(current); current = []; }
  }
  if (current.length) groups.push(current);
  const bands: Band[] = groups.map((g, index) => {
    const min = g[0]!.x, max = g[g.length - 1]!.x;
    const lowerExclusive = index === 0 ? null : groups[index - 1]![groups[index - 1]!.length - 1]!.x;
    const label = groups.length === 1 ? `De ${formatX(min, unit)} a ${formatX(max, unit)}`
      : index === 0 ? `Até ${formatX(max, unit)}`
      : index === groups.length - 1 ? `Acima de ${formatX(lowerExclusive ?? min, unit)}`
      : `De ${formatX(min, unit)} a ${formatX(max, unit)}`;
    return { index, min, max, lowerExclusive, label, ...totals(g) };
  });
  return { bands, excludedNoX, excludedNoVotes, distinct, requested, reduced: bands.length < Math.min(requested, MIN_BANDS) || bands.length < requested };
}

export interface TerritoryRow { ibge_code: string; uf: string; b_votes: number | null; l_votes: number | null; valid_votes: number | null }
export interface Territory extends GroupTotals { key: string }

/** One ranking over the same territories: Bolsonaro − Lula in p.p. and in votes, ratio of sums. */
export function territoryAdvantage(rows: readonly TerritoryRow[], keyOf: (r: TerritoryRow) => string | null): Territory[] {
  const acc = new Map<string, { b: number; l: number; valid: number }[]>();
  for (const r of rows) {
    const k = keyOf(r);
    if (k == null || r.b_votes == null || r.l_votes == null || r.valid_votes == null || r.valid_votes <= 0) continue;
    const list = acc.get(k) ?? [];
    list.push({ b: r.b_votes, l: r.l_votes, valid: r.valid_votes });
    acc.set(k, list);
  }
  return [...acc].map(([key, list]) => ({ key, ...totals(list) }));
}

export type AdvantageScale = 'pp' | 'votes';
export const advantageOf = (t: GroupTotals, scale: AdvantageScale) => (scale === 'pp' ? t.diffPp : t.diffVotes);
export function sortByAdvantage<T extends GroupTotals & { key: string }>(list: readonly T[], scale: AdvantageScale): T[] {
  return [...list].sort((a, b) => advantageOf(b, scale) - advantageOf(a, scale) || a.key.localeCompare(b.key));
}

/** p.p. differences below this are reported as a tie ("empate técnico" is not claimed). */
export const TIE_PP = 0.5;
export const leaderOf = (diffPp: number): 'bolsonaro' | 'pt' | 'empate' => (Math.abs(diffPp) < TIE_PP ? 'empate' : diffPp > 0 ? 'bolsonaro' : 'pt');

export interface BandsReading { headline: string; body: string }
const pp = (v: number) => `${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pontos`;

/**
 * Journalistic reading derived ONLY from the weighted bands on screen. `topic` = natural noun
 * phrase ("presença evangélica", "renda"). Claims a lead only where the band difference
 * exceeds TIE_PP; "aumenta" only when differences move monotonically across all bands.
 */
export function readBands(bands: readonly Band[], bName: string, topic: string): BandsReading | null {
  if (bands.length < 2) return null;
  const first = bands[0]!, last = bands[bands.length - 1]!;
  const name = (s: 'bolsonaro' | 'pt') => (s === 'bolsonaro' ? bName.split(' ')[0]! : 'Lula');
  const lf = leaderOf(first.diffPp), ll = leaderOf(last.diffPp);
  const diffs = bands.map((b) => b.diffPp);
  const up = diffs.every((d, i) => i === 0 || d >= diffs[i - 1]!), down = diffs.every((d, i) => i === 0 || d <= diffs[i - 1]!);
  const leaders = bands.map((b) => leaderOf(b.diffPp));
  const same = leaders.every((s) => s === leaders[0]);
  let headline: string, lead: string;
  if (lf !== 'empate' && ll !== 'empate' && lf !== ll) {
    headline = `${name(ll)} lidera nas cidades com maior ${topic}; ${name(lf)}, nas de menor`;
    lead = `Somando os votos das cidades em cada faixa, ${name(lf)} fica à frente nas cidades com menor ${topic}, por ${pp(first.diffPp)}, e ${name(ll)} passa à frente nas cidades com maior ${topic}, por ${pp(last.diffPp)}.`;
  } else if (same && leaders[0] !== 'empate') {
    const s = leaders[0] as 'bolsonaro' | 'pt';
    const grows = s === 'bolsonaro' ? up : down, shrinks = s === 'bolsonaro' ? down : up;
    headline = `${name(s)} lidera em todas as faixas de ${topic}`;
    lead = `${name(s)} tem mais votos que ${name(s === 'bolsonaro' ? 'pt' : 'bolsonaro')} em todos os grupos de cidades${grows && !shrinks ? `, e a diferença cresce nas cidades com maior ${topic}: de ${pp(first.diffPp)} para ${pp(last.diffPp)}` : shrinks && !grows ? `, mas a diferença diminui nas cidades com maior ${topic}: de ${pp(first.diffPp)} para ${pp(last.diffPp)}` : `; a diferença varia entre ${pp(Math.min(...diffs.map(Math.abs)))} e ${pp(Math.max(...diffs.map(Math.abs)))}, sem uma direção única`}.`;
  } else {
    headline = `Disputa equilibrada entre as faixas de ${topic}`;
    lead = `Neste recorte, não aparece um padrão claro de vantagem: em pelo menos um grupo de cidades a diferença entre os dois fica abaixo de meio ponto.`;
  }
  const others = Math.max(...bands.map((b) => b.o));
  const tail = others >= 10 ? ` Os demais candidatos somados chegam a ${others.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos votos válidos em alguma faixa.` : '';
  return { headline, body: `${lead} Cada faixa reúne cidades com número parecido de municípios, e o percentual vem da soma dos votos de todas elas — cidades grandes pesam mais.${tail}` };
}
