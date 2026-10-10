import { normalized, transformScatterX, type ScatterDomain } from './scatter-domain';

export interface GeometryPoint { code: string; x: number; y: number }
export interface GeometrySeries { name: string; points: readonly GeometryPoint[] }
export const GEOMETRY_CRITERIA = 'Heurísticas descritivas conservadoras, não provas científicas: mínimo de 40 municípios para forma; concentração ≥70% no terço horizontal ou quinto vertical do eixo exibido; cauda quando P90/P10 ocupa menos de 55% da largura. Até quatro faixas quantílicas de X, sem dividir empates, com mínimo de 10 pares. Cruzamento exige vantagem mediana de sinais opostos nas faixas extremas, magnitude ≥3% da altura exibida e progressão consistente em ≥2/3 das transições. Abertura é a mediana dos IQRs de Y dentro de cada série/faixa: ≥15% da altura é ampla, ≤6% é estreita. Nenhum diagnóstico mistura as duas candidaturas. Constantes, amostras pequenas ou faixas insuficientes não recebem classificação.';
export function quantile(values: readonly number[], p: number): number {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b), index = (sorted.length - 1) * p;
  const lo = sorted[Math.floor(index)], hi = sorted[Math.ceil(index)];
  return lo == null || hi == null ? NaN : lo + (hi - lo) * (index % 1);
}
function clean(points: readonly GeometryPoint[], domain: ScatterDomain): GeometryPoint[] {
  return [...new Map(points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y) && (!domain.log || p.x > 0)).map(p => [p.code, p])).values()];
}
function bins(points: readonly GeometryPoint[], reference: readonly GeometryPoint[] = points): GeometryPoint[][] {
  const cuts = [...new Set([.25, .5, .75].map(p => quantile(reference.map(v => v.x), p)))];
  return Array.from({ length: cuts.length + 1 }, (_, i) => points.filter(p => (i === 0 || p.x > (cuts[i - 1] ?? -Infinity)) && (i === cuts.length || p.x <= (cuts[i] ?? Infinity)))).filter(b => b.length >= 10);
}
export function analyzeScatterGeometry(series: readonly GeometrySeries[], domain: ScatterDomain, validatedShares = false) {
  const cleaned = series.map(s => ({ ...s, points: clean(s.points, domain) }));
  const unique = [...new Map(cleaned.flatMap(s => s.points).map(p => [p.code, p])).values()];
  const xs = unique.map(p => p.x), nx = xs.map(x => normalized(transformScatterX(x, domain.log), domain.x));
  const eligible = unique.length >= 40 && domain.x[1] > domain.x[0];
  const left = nx.filter(v => v <= 1 / 3).length / (nx.length || 1), right = nx.filter(v => v >= 2 / 3).length / (nx.length || 1);
  const p10 = quantile(nx, .1), p90 = quantile(nx, .9);
  const horizontal = {
    n: unique.length, min: quantile(xs, 0), median: quantile(xs, .5), p90: quantile(xs, .9), max: quantile(xs, 1),
    left, right, concentration: eligible && left >= .7 ? 'left' : eligible && right >= .7 ? 'right' : 'none',
    tail: eligible && left >= .7 && p90 < .55 ? 'right' : eligible && right >= .7 && p10 > .45 ? 'left' : 'none',
  };
  const vertical = cleaned.map(s => {
    const ys = s.points.map(p => p.y), ny = ys.map(y => normalized(y, domain.y));
    const b = bins(s.points, unique), spread = quantile(b.map(b => (quantile(b.map(p => p.y), .75) - quantile(b.map(p => p.y), .25)) / (domain.y[1] - domain.y[0] || 1)), .5);
    const base = ny.filter(y => y <= .2).length / (ny.length || 1), top = ny.filter(y => y >= .8).length / (ny.length || 1);
    const enough = s.points.length >= 40 && domain.y[1] > domain.y[0];
    return { name: s.name, n: ys.length, median: quantile(ys, .5), min: quantile(ys, 0), max: quantile(ys, 1), base, top, bins: b.map(b => ({ n: b.length, xMin: quantile(b.map(p => p.x), 0), xMax: quantile(b.map(p => p.x), 1), medianY: quantile(b.map(p => p.y), .5), iqrY: quantile(b.map(p => p.y), .75) - quantile(b.map(p => p.y), .25) })),
      spread, width: enough && b.length >= 3 ? spread >= .15 ? 'wide' : spread <= .06 ? 'thin' : 'moderate' : 'unknown',
      concentration: enough && base >= .7 ? 'base' : enough && top >= .7 ? 'top' : 'none' };
  });
  const first = cleaned[0], second = cleaned[1];
  const other = new Map(second?.points.map(p => [p.code, p]) ?? []);
  const paired = (first?.points ?? []).flatMap(p => {
    const q = other.get(p.code);
    return q && p.x === q.x ? [{ ...p, otherY: q.y }] : [];
  });
  const pairedMap = new Map(paired.map(p => [p.code, p]));
  const bands = bins(paired).map(b => ({ n: b.length, xMin: quantile(b.map(p => p.x), 0), xMax: quantile(b.map(p => p.x), 1), first: quantile(b.map(p => p.y), .5), second: quantile(b.map(p => pairedMap.get(p.code)?.otherY ?? NaN), .5) }));
  const advantages = bands.map(b => b.first - b.second), start = advantages[0] ?? 0, end = advantages.at(-1) ?? 0;
  const direction = Math.sign(end - start), tolerance = (domain.y[1] - domain.y[0]) * .03;
  const consistent = advantages.slice(1).filter((v, i) => direction * (v - (advantages[i] ?? v)) > 0).length;
  const firstChange = (bands.at(-1)?.first ?? 0) - (bands[0]?.first ?? 0);
  const secondChange = (bands.at(-1)?.second ?? 0) - (bands[0]?.second ?? 0);
  const eachConsistent = bands.slice(1).filter((v, i) => {
    const previous = bands[i];
    return previous && Math.sign(firstChange) * (v.first - previous.first) > 0 && Math.sign(secondChange) * (v.second - previous.second) > 0;
  }).length >= Math.ceil((bands.length - 1) * 2 / 3);
  const crossing = paired.length >= 40 && bands.length >= 3 && start * end < 0 && firstChange * secondChange < 0 && eachConsistent && Math.min(Math.abs(start), Math.abs(end)) >= tolerance && consistent >= Math.ceil((bands.length - 1) * 2 / 3);
  const compositionValid = validatedShares && paired.length > 0 && paired.every(p => p.y >= 0 && p.otherY >= 0 && p.y + p.otherY <= 100 + 1e-8);
  return { domain, horizontal, vertical, pairedN: paired.length, crossing, bands, lowLeader: start > 0 ? first?.name : second?.name, highLeader: end > 0 ? first?.name : second?.name,
    composition: compositionValid ? { n: paired.length, othersMedian: quantile(paired.map(p => Math.max(0, 100 - p.y - p.otherY)), .5) } : null };
}
export type ScatterGeometry = ReturnType<typeof analyzeScatterGeometry>;