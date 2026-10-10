import { z } from 'zod';
import { X_VARIABLES } from './lab-variables';
export const PRESETS = [
  { id: 'leader-bands', title: 'Quem lidera em cada faixa?', subtitle: 'Bolsonaro × Lula por faixa do indicador', kind: 'bars', x: 'renda', metric: 'share', unit: '%', group: 'compare', note: 'Municípios agrupados pelo indicador escolhido; percentuais somam os votos de todas as cidades da faixa sobre todos os votos válidos. Comparação entre municípios; não identifica o voto de cada pessoa.' },
  { id: 'vote-map', title: 'Quem está na frente, e por quanto?', subtitle: 'Vantagem por município', kind: 'map', x: 'renda', metric: 'share', unit: '%', group: 'compare', note: 'Percentual sobre votos válidos em cada município. Área geográfica não representa número de eleitores.' },
  { id: 'states', title: 'Vantagem por estado', subtitle: 'Ranking único das 27 UFs', kind: 'bars', x: 'renda', metric: 'share', unit: '%', group: 'compare', note: 'Votos do candidato divididos pelos votos válidos em cada UF, ponderados por votos válidos. Exterior excluído.' },
  { id: 'income-scatter', title: 'Renda e votação', subtitle: 'Renda × percentual de votos', kind: 'scatter', x: 'renda', metric: 'share', unit: '%', group: 'compare', note: 'Cada ponto é um município, sem ponderação. Associação agregada não implica causalidade ou voto individual.' },
  { id: 'education-scatter', title: 'Escolaridade e votação', subtitle: 'Superior completo × percentual de votos', kind: 'scatter', x: 'superior', metric: 'share', unit: '%', group: 'compare', note: 'A escolaridade é municipal (Censo 2022). A correlação não permite deduzir o voto de uma pessoa.' },
  { id: 'religion-scatter', title: 'Religião e votação', subtitle: 'Evangélicos × percentual de votos', kind: 'scatter', x: 'evangelica', metric: 'share', unit: '%', group: 'compare', note: 'Associação entre composição religiosa e votação municipal. Nunca inferir comportamento religioso individual.' },
  { id: 'urban-scatter', title: 'Urbanização e votação', subtitle: 'População urbana × percentual de votos', kind: 'scatter', x: 'urbanizacao', metric: 'share', unit: '%', group: 'compare', note: 'Urbanização do Censo 2022. Municípios são observações, não eleitores individuais.' },
  { id: 'lowincome-scatter', title: 'Renda baixa e votação', subtitle: 'Renda per capita de até ½ salário mínimo × votos', kind: 'scatter', x: 'rendabaixa', metric: 'share', unit: '%', group: 'compare', note: 'Faixa de salário mínimo do Censo 2022, não linha oficial de pobreza. Cada ponto é um município.' },
  { id: 'formal-work-scatter', title: 'Carteira assinada e votação', subtitle: 'Empregados com carteira × votos', kind: 'scatter', x: 'carteira', metric: 'share', unit: '%', group: 'compare', note: 'Percentual dos ocupados de 14+ (SIDRA 10261). Não identifica o voto de trabalhadores formais.' },
  { id: 'indicator-scatter', title: 'Explorar indicador · votação', subtitle: 'Indicador escolhido × votos', kind: 'scatter', x: 'idosos60', metric: 'share', unit: '%', group: 'compare', note: 'Cada ponto é um município. Comparação entre municípios; não identifica o voto de cada pessoa.' },
  { id: 'vote-change', title: 'O voto entre duas eleições', subtitle: '2022 → 2026 · mesmo número de urna', kind: 'map', x: 'renda', metric: 'share_delta', unit: 'p.p.', group: 'compare', note: 'Diferença de share pelo mesmo número de urna e turno. Candidaturas e eleitorado podem mudar; não indica transferência individual.' },
  { id: 'income-bands', title: 'Renda em faixas, votos em contexto', subtitle: 'Votação por faixa de renda municipal', kind: 'bars', x: 'renda', metric: 'share', unit: '%', group: 'compare', note: 'Share ponderado pelos votos válidos, agrupando municípios pela renda média. Não é distribuição de renda dos eleitores.' },
  { id: 'vote-ranking', title: 'Onde o candidato lidera', subtitle: 'Ranking por percentual de votos', kind: 'bars', x: 'renda', metric: 'share', unit: '%', group: 'compare', note: 'Os 15 maiores percentuais municipais, após o corte de eleitores aptos. Não é ranking de votos absolutos.' },
  { id: 'abstention-map', title: 'Quem não compareceu', subtitle: 'Abstenção municipal', kind: 'map', x: 'renda', metric: 'abstention', unit: '%', group: 'context', note: 'Abstenções divididas pelo eleitorado apto. Não mede preferência partidária.' },
  { id: 'turnout-ranking', title: 'Mudança na participação', subtitle: 'Ranking de comparecimento · 2022 → 2026', kind: 'bars', x: 'renda', metric: 'turnout_delta', unit: 'p.p.', group: 'context', note: 'Os 15 maiores aumentos em pontos percentuais; apenas municípios com dados nos dois anos, no mesmo turno.' },
  { id: 'income-map', title: 'A geografia da renda', subtitle: 'Renda per capita · Censo 2022', kind: 'map', x: 'renda', metric: 'indicator', unit: 'R$', group: 'context', note: 'Média domiciliar per capita do Censo 2022; não é renda de 2026 nem de cada eleitor.' },
  { id: 'education-map', title: 'Ensino superior no território', subtitle: 'Superior completo · 25 anos ou mais', kind: 'map', x: 'superior', metric: 'indicator', unit: '%', group: 'context', note: 'Proporção de pessoas de 25 anos ou mais com superior completo, Censo 2022.' },
  { id: 'religion-map', title: 'Religião no território', subtitle: 'Evangélicos · 10 anos ou mais', kind: 'map', x: 'evangelica', metric: 'indicator', unit: '%', group: 'context', note: 'Composição religiosa municipal de 2022, não identificação religiosa dos votantes.' },
  { id: 'elderly-map', title: 'Onde vivem mais idosos', subtitle: 'Pessoas de 60 anos ou mais · Censo 2022', kind: 'map', x: 'idosos60', metric: 'indicator', unit: '%', group: 'context', note: 'Soma dos grupos quinquenais de 60+ dividida pela população residente (SIDRA 9514). Não é perfil do eleitorado.' },
  { id: 'sewage-map', title: 'O mapa do esgoto', subtitle: 'Rede geral, pluvial ou fossa ligada · domicílios', kind: 'map', x: 'esgoto', metric: 'indicator', unit: '%', group: 'context', note: 'Percentual de domicílios particulares permanentes ocupados (SIDRA 6805). Unidade é o domicílio, não o morador.' },
  { id: 'internet-map', title: 'Conexão em casa', subtitle: 'Domicílios com internet · Censo 2022', kind: 'map', x: 'internet', metric: 'indicator', unit: '%', group: 'context', note: 'Percentual de domicílios particulares permanentes ocupados com conexão domiciliar (SIDRA 9936).' },
  { id: 'indicator-map', title: 'Explorar indicador · mapa', subtitle: 'Escolha qualquer indicador importado', kind: 'map', x: 'idosos60', metric: 'indicator', unit: '', group: 'context', note: 'Indicador escolhido no catálogo, com fonte, ano e universo próprios. Ausências ficam em cinza, sem estimativa.' },
] as const;
export type Preset = typeof PRESETS[number];
/** Presets whose X comes from the `ix` URL param (any imported indicator). */
export const SELECTABLE_X: ReadonlySet<string> = new Set(['indicator-map', 'indicator-scatter', 'leader-bands'])
/** Presets that are a Bolsonaro × Lula comparison by definition (shown in comparison even in single mode). */
export const ALWAYS_DUEL: ReadonlySet<string> = new Set(['leader-bands'])
/** Default X when the URL has no `ix`. */
export const defaultX = (presetId: string) => (presetId === 'leader-bands' ? 'renda' : 'idosos60');
/** Tour stays inside the group of the current preset. */
export function nextInGroup(id: string, dir = 1): string {
  const cur = PRESETS.find((p) => p.id === id) ?? PRESETS[0];
  const list = PRESETS.filter((p) => p.group === cur.group);
  const i = list.findIndex((p) => p.id === cur.id);
  return list[(i + dir + list.length) % list.length]?.id ?? PRESETS[0].id;
};
const xIds = X_VARIABLES.filter(v => v.indicatorId).map(v => v.id) as [string, ...string[]];
export const exploreSearchSchema = z.object({ preset: z.enum(PRESETS.map(p => p.id) as [string, ...string[]]).optional().catch(undefined), min: z.coerce.number().int().min(0).max(10000000).optional().catch(undefined), ix: z.enum(xIds).optional().catch(undefined) });
export const exploreInputSchema = z.object({ preset: z.enum(PRESETS.map(p => p.id) as [string, ...string[]]), electionId: z.number().int().positive(), baseElectionId: z.number().int().positive().nullable(), candidateNumber: z.number().int().nullable(), uf: z.string().length(2).nullable(), minimum: z.number().int().min(0).max(10000000), x: z.enum(xIds).nullable() });
export const exploreRowSchema = z.object({ ibge_code: z.string(), name: z.string(), uf: z.string(), x: z.coerce.number().nullable(), y: z.coerce.number().nullable(), eligible: z.number().nullable(), votes: z.number().nullable(), valid: z.number().nullable() });
export type ExploreRow = z.infer<typeof exploreRowSchema>;
export interface ExploreBar { key: string; label: string; value: number; count: number }
export interface ExploreData { rows: ExploreRow[]; bars: ExploreBar[]; coverage: number; missing: number; source: string; unitX: string; labelX: string; min: number | null; max: number | null; unavailable: string | null; updated: string | null }
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
