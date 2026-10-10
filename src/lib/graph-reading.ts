import type { LabAnalysis } from './lab-analysis';
import type { XVariable, YMetric } from './lab-variables';
import { scatterDomain, type ScatterDomain } from './scatter-domain';
import { analyzeScatterGeometry, type ScatterGeometry } from './scatter-geometry';
import { editorialNews, editorialShape, supportedCrossing } from './graph-editorial';

export interface ReadingContext { x: XVariable; metric: YMetric; year: number; round: number; scope: string; domain?: ScatterDomain }
export interface ReadingSeries { name: string; id?: 'bolsonaro' | 'pt'; analysis: LabAnalysis; hasModelAnalysis?: boolean }
export interface GraphReading { title: string; paragraphs: string[]; limitations: string[]; geometry: ScatterGeometry }
export const MUNICIPAL_CAUTION = 'Comparação entre municípios; não identifica o voto de cada pessoa.';
export const READING_CONVENTION = 'Convenção descritiva: menos de 20 pares exige cautela; |r| abaixo de 0,1 não define direção linear. Intervalo contendo zero, amplitude maior que 1 ou sinais divergentes entre Pearson/Spearman impedem uma direção segura. Não se compara correlação com coeficiente ajustado para classificar enfraquecimento.';
export const fmtReading = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export function readingPoints(a: LabAnalysis) {
  return a.points.y.flatMap((y, i) => {
    const x = a.points.x[i], code = a.points.c[i];
    return x != null && code != null ? [{ code, x, y }] : [];
  });
}
function direction(a: LabAnalysis): number {
  const p = a.pearson, s = a.spearman;
  if (a.points.y.length < 20 || !p || !Number.isFinite(p.r) || Math.abs(p.r) < .1 || p.ci[0] <= 0 && p.ci[1] >= 0 || p.ci[1] - p.ci[0] > 1) return 0;
  if (s && Math.abs(s.r) >= .1 && Math.sign(s.r) !== Math.sign(p.r)) return 0;
  return Math.sign(p.r);
}
function adjustment(c: ReadingContext, series: readonly ReadingSeries[]): string {
  const xName = c.x.log ? `log10 ${c.x.label.toLowerCase()}` : c.x.label;
  const states = series.map(s => {
    const model = s.analysis.model, beta = model?.coefficients.find(v => v.name === xName);
    if (!beta || !beta.ci.every(Number.isFinite) || !Number.isFinite(beta.estimate)) return { name: s.name, state: 'indisponível', controls: [] as string[] };
    const names = model?.coefficients.map(v => v.name) ?? [];
    const controls = [names.includes('log10 renda') && c.x.id !== 'renda' && 'renda', names.includes('superior completo (%)') && c.x.id !== 'superior' && 'escolaridade', names.includes('log10 população') && c.x.id !== 'populacao' && 'porte municipal', (model?.fixedEffects ?? 0) > 0 && 'estado'].filter((v): v is string => !!v);
    const d = direction(s.analysis);
    return { name: s.name, controls, state: beta.ci[0] <= 0 && beta.ci[1] >= 0 ? 'sem direção clara' : d && d !== Math.sign(beta.estimate) ? 'muda de direção' : d ? 'permanece' : 'ganha uma direção antes não clara' };
  });
  if (states.every(s => s.state === 'indisponível')) return '';
  const changed = states.filter(s => s.state === 'muda de direção');
  const unclear = states.filter(s => s.state === 'sem direção clara');
  if (changed.length) return `Mas o sentido dessa diferença se inverte para ${changed.map(s => s.name).join(' e ')} quando comparamos cidades de condições semelhantes${unclear.length ? `; para ${unclear.map(s => s.name).join(' e ')}, o resultado não fica claro` : ''}.`;
  if (unclear.length) return `Mas, entre cidades de condições semelhantes, não aparece um padrão claro para ${unclear.map(s => s.name).join(' e ')}.`;
  if (states.some(s => s.state === 'ganha uma direção antes não clara')) return 'Entre cidades de condições semelhantes, aparece uma diferença que não estava clara na comparação geral.';
  if (states.some(s => s.state === 'indisponível')) return '';
  const controls = states[0]?.controls.filter(v => states.every(s => s.controls.includes(v))) ?? [];
  return `Essa diferença também aparece entre cidades semelhantes${controls.length ? ` em ${controls.slice(0, 2).join(' e ')}` : ''}.`;
}
/** One synthesis; calculations remain per series and geometry shares the exact render domain. */
export function interpretGraph(context: ReadingContext, input: readonly ReadingSeries[]): GraphReading {
  const points = input.map(s => ({ name: s.name, points: readingPoints(s.analysis) }));
  const domain = context.domain ?? scatterDomain(points.flatMap(s => s.points), context.x.log, input.length > 1);
  const geometry = analyzeScatterGeometry(points, domain, context.metric === 'share');
  const directions = input.map(s => direction(s.analysis));
  const news = editorialNews(context, input, geometry, directions);
  const adjusted = adjustment(context, input);
  const limitations: string[] = [];
  // Missing X/Y is already reported once in the chart coverage; do not duplicate it here.
  const modelMissing = input.filter(s => !s.analysis.model && s.hasModelAnalysis !== false);
  if (modelMissing.length) limitations.push(modelMissing.some(s => s.analysis.modelNote?.includes('Colinearidade')) ? 'As informações disponíveis não permitem separar com segurança as diferenças entre cidades.' : 'Faltam informações para comparar cidades de condições semelhantes.');
  const missingCovariates = Math.max(0, ...input.map(s => s.analysis.missing.covariates));
  if (missingCovariates) limitations.push('A comparação entre cidades semelhantes abrange menos municípios por falta de informações.');
  if (input.some(s => s.analysis.pearson && s.analysis.spearman && Math.sign(s.analysis.pearson.r) !== Math.sign(s.analysis.spearman.r))) limitations.push('O padrão muda conforme a maneira de comparar as cidades; não há uma direção segura.');
  const crossingSupported = supportedCrossing(input, geometry, directions);
  const detail = [editorialShape(geometry, context, crossingSupported), adjusted].filter(Boolean).join(' ');
  const reversal = adjusted.startsWith('Mas o sentido');
  const outcome = context.metric.startsWith('share') ? 'votação' : context.metric === 'abstention' ? 'abstenção' : context.metric === 'blank_null' ? 'votos brancos e nulos' : 'comparecimento';
  return { title: reversal ? `Diferença em ${outcome} por ${context.x.label.toLowerCase()} muda entre cidades semelhantes` : news.title, paragraphs: [news.text, detail || 'As informações deste recorte não permitem descrever um desenho consistente entre as cidades.'], limitations, geometry };
}
