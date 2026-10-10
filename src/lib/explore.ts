import { z } from 'zod';
export const PRESETS = [
  { id: 'vote-map', title: 'O território do voto', subtitle: 'Votação por candidato', kind: 'map', x: 'renda', metric: 'share', unit: '%', note: 'Percentual sobre votos válidos em cada município. Área geográfica não representa número de eleitores.' },
  { id: 'abstention-map', title: 'Quem não compareceu', subtitle: 'Abstenção municipal', kind: 'map', x: 'renda', metric: 'abstention', unit: '%', note: 'Abstenções divididas pelo eleitorado apto. Não mede preferência partidária.' },
  { id: 'income-map', title: 'A geografia da renda', subtitle: 'Renda per capita · Censo 2022', kind: 'map', x: 'renda', metric: 'indicator', unit: 'R$', note: 'Média domiciliar per capita do Censo 2022; não é renda de 2026 nem de cada eleitor.' },
  { id: 'education-map', title: 'Ensino superior no território', subtitle: 'Superior completo · 25 anos ou mais', kind: 'map', x: 'superior', metric: 'indicator', unit: '%', note: 'Proporção de pessoas de 25 anos ou mais com superior completo, Censo 2022.' },
  { id: 'religion-map', title: 'Religião no território', subtitle: 'Evangélicos · 10 anos ou mais', kind: 'map', x: 'evangelica', metric: 'indicator', unit: '%', note: 'Composição religiosa municipal de 2022, não identificação religiosa dos votantes.' },
  { id: 'vote-change', title: 'O voto entre duas eleições', subtitle: '2022 → 2026 · mesmo número de urna', kind: 'map', x: 'renda', metric: 'share_delta', unit: 'p.p.', note: 'Diferença de share pelo mesmo número de urna e turno. Candidaturas e eleitorado podem mudar; não indica transferência individual.' },
  { id: 'income-scatter', title: 'Renda e votação', subtitle: 'Renda × percentual de votos', kind: 'scatter', x: 'renda', metric: 'share', unit: '%', note: 'Cada ponto é um município, sem ponderação. Associação agregada não implica causalidade ou voto individual.' },
  { id: 'education-scatter', title: 'Escolaridade e votação', subtitle: 'Superior completo × percentual de votos', kind: 'scatter', x: 'superior', metric: 'share', unit: '%', note: 'A escolaridade é municipal (Censo 2022). A correlação não permite deduzir o voto de uma pessoa.' },
  { id: 'religion-scatter', title: 'Religião e votação', subtitle: 'Evangélicos × percentual de votos', kind: 'scatter', x: 'evangelica', metric: 'share', unit: '%', note: 'Associação entre composição religiosa e votação municipal. Nunca inferir comportamento religioso individual.' },
  { id: 'urban-scatter', title: 'Urbanização e votação', subtitle: 'População urbana × percentual de votos', kind: 'scatter', x: 'urbanizacao', metric: 'share', unit: '%', note: 'Urbanização do Censo 2022. Municípios são observações, não eleitores individuais.' },
  { id: 'vote-ranking', title: 'Onde o candidato lidera', subtitle: 'Ranking por percentual de votos', kind: 'bars', x: 'renda', metric: 'share', unit: '%', note: 'Os 15 maiores percentuais municipais, após o corte de eleitores aptos. Não é ranking de votos absolutos.' },
  { id: 'turnout-ranking', title: 'Mudança na participação', subtitle: 'Ranking de comparecimento · 2022 → 2026', kind: 'bars', x: 'renda', metric: 'turnout_delta', unit: 'p.p.', note: 'Os 15 maiores aumentos em pontos percentuais; apenas municípios com dados nos dois anos, no mesmo turno.' },
  { id: 'income-bands', title: 'Renda em faixas, votos em contexto', subtitle: 'Votação por faixa de renda municipal', kind: 'bars', x: 'renda', metric: 'share', unit: '%', note: 'Share ponderado pelos votos válidos, agrupando municípios pela renda média. Não é distribuição de renda dos eleitores.' },
  { id: 'states', title: 'Um país, muitos resultados', subtitle: 'Comparação entre estados', kind: 'bars', x: 'renda', metric: 'share', unit: '%', note: 'Votos do candidato divididos pelos votos válidos em cada UF, ponderados por votos válidos. Exterior excluído.' },
] as const;
export type Preset = typeof PRESETS[number];
export const exploreSearchSchema = z.object({ preset: z.enum(PRESETS.map(p => p.id) as [string, ...string[]]).optional().catch(undefined), min: z.coerce.number().int().min(0).max(10000000).optional().catch(undefined) });
export const exploreInputSchema = z.object({ preset: z.enum(PRESETS.map(p => p.id) as [string, ...string[]]), electionId: z.number().int().positive(), baseElectionId: z.number().int().positive().nullable(), candidateNumber: z.number().int().nullable(), uf: z.string().length(2).nullable(), minimum: z.number().int().min(0).max(10000000) });
export const exploreRowSchema = z.object({ ibge_code: z.string(), name: z.string(), uf: z.string(), x: z.coerce.number().nullable(), y: z.coerce.number().nullable(), eligible: z.number().nullable(), votes: z.number().nullable(), valid: z.number().nullable() });
export type ExploreRow = z.infer<typeof exploreRowSchema>;
export interface ExploreBar { key: string; label: string; value: number; count: number }
export interface ExploreData { rows: ExploreRow[]; bars: ExploreBar[]; coverage: number; missing: number; source: string; unitX: string; min: number | null; max: number | null; unavailable: string | null; updated: string | null }
export function aggregateBars(rows: ExploreRow[], id: string, minimum: number): ExploreBar[] {
  const usable = rows.filter(r => r.y != null && (r.eligible ?? 0) >= minimum);
  if (id === 'vote-ranking' || id === 'turnout-ranking') return [...usable].sort((a,b) => (b.y ?? 0) - (a.y ?? 0) || a.ibge_code.localeCompare(b.ibge_code)).slice(0,15).map(r => ({ key: r.ibge_code, label: `${r.name} · ${r.uf}`, value: r.y ?? 0, count: 1 }));
  const groups = new Map<string, { label: string; votes: number; valid: number; count: number }>();
  for (const r of usable) {
    if (r.votes == null || r.valid == null || (id === 'income-bands' && r.x == null)) continue;
    const key = id === 'states' ? r.uf : String((r.x ?? 0) < 500 ? 0 : (r.x ?? 0) < 1000 ? 1 : (r.x ?? 0) < 1500 ? 2 : (r.x ?? 0) < 2500 ? 3 : 4);
    const labels = ['Até R$ 500', 'R$ 500–1.000', 'R$ 1.000–1.500', 'R$ 1.500–2.500', 'R$ 2.500 ou mais'];
    const group = groups.get(key) ?? { label: id === 'states' ? key : labels[Number(key)] ?? key, votes: 0, valid: 0, count: 0 };
    group.votes += r.votes; group.valid += r.valid; group.count++; groups.set(key,group);
  }
  return [...groups].flatMap(([key,g]) => g.valid ? [{ key, label:g.label, value:100*g.votes/g.valid, count:g.count }] : []).sort((a,b) => id === 'states' ? b.value-a.value : a.key.localeCompare(b.key));
}
