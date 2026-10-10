import type { LabAnalysis } from './lab-analysis';
import type { XVariable, YMetric } from './lab-variables';
import { scatterDomain, type ScatterDomain } from './scatter-domain';
import { analyzeScatterGeometry, type ScatterGeometry } from './scatter-geometry';

export interface ReadingContext { x: XVariable; metric: YMetric; year: number; round: number; scope: string; domain?: ScatterDomain }
export interface ReadingSeries { name: string; id?: 'bolsonaro' | 'pt'; analysis: LabAnalysis; hasModelAnalysis?: boolean }
export interface GraphReading { title: string; paragraphs: string[]; limitations: string[]; geometry: ScatterGeometry }
export const MUNICIPAL_CAUTION = 'São comparações entre municípios, não entre pessoas. O gráfico não prova causa e efeito.';
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
function indicator(x: XVariable): string {
  const labels: Record<string, string> = {
    preta: 'a parcela de moradores de cor ou raça preta (sem incluir a categoria parda)',
    parda: 'a parcela de moradores de cor ou raça parda', branca: 'a parcela de moradores de cor ou raça branca',
    superior: 'a parcela de moradores de 25 anos ou mais com superior completo',
    evangelica: 'a parcela de moradores de 10 anos ou mais que se declaram evangélicos',
    catolica: 'a parcela de moradores de 10 anos ou mais que se declaram católicos',
    semreligiao: 'a parcela de moradores de 10 anos ou mais sem religião',
    alfabetizacao: 'a parcela de moradores de 15 anos ou mais alfabetizados',
    renda: 'a renda domiciliar por pessoa', populacao: 'a população municipal',
    urbanizacao: 'a parcela de moradores em área urbana', idade: 'a idade mediana',
  };
  return labels[x.id] ?? x.label.toLowerCase();
}
function outcome(metric: YMetric) {
  return ({ share: 'percentuais dos votos válidos', share_delta: 'variações do percentual de votos entre 2022 e 2026', turnout: 'percentual de comparecimento', abstention: 'percentual de abstenção', blank_null: 'percentual de votos brancos e nulos', turnout_delta: 'variação do comparecimento entre 2022 e 2026' })[metric];
}
function conclusion(c: ReadingContext, series: readonly ReadingSeries[], g: ScatterGeometry): string {
  const a = series[0], b = series[1];
  if (!a) return 'Não há municípios com informações suficientes para interpretar este gráfico.';
  const da = direction(a.analysis), db = b ? direction(b.analysis) : 0;
  if (a.analysis.points.y.length < 20 || b && b.analysis.points.y.length < 20) return 'Há poucos municípios com as informações necessárias; este recorte não sustenta uma conclusão sobre o desenho.';
  const subject = `À medida que ${indicator(c.x)} aumenta entre municípios`;
  if (b && g.crossing && da * db < 0) return `Conforme ${indicator(c.x)} aumenta, a vantagem passa de ${g.lowLeader} para ${g.highLeader} nas faixas observadas. As duas nuvens se cruzam pela sobreposição de tendências opostas nos ${outcome(c.metric)}, não por uma divisão em grupos de pessoas.`;
  if (b && da * db < 0) return `${subject}, ${a.name} e ${b.name} seguem tendências opostas: os ${outcome(c.metric)} do primeiro tendem a ser ${da > 0 ? 'maiores' : 'menores'}, e os do segundo, ${db > 0 ? 'maiores' : 'menores'}. Isso, por si só, não configura um X: as faixas observadas não sustentam um cruzamento consistente.`;
  if (b && da && da === db) return `${subject}, ${a.name} e ${b.name} apresentam ${outcome(c.metric)} tendencialmente ${da > 0 ? 'maiores' : 'menores'}. As séries seguem a mesma direção, em vez de formar duas tendências cruzadas.`;
  if (b && (da || db)) return `${subject}, aparece uma direção mais definida para ${da ? a.name : b.name}, com ${outcome(c.metric)} ${(da || db) > 0 ? 'maiores' : 'menores'}; para ${da ? b.name : a.name}, a direção não fica clara neste recorte. As duas nuvens não devem ser tratadas como inversos automáticos.`;
  if (b) return `Não aparece uma relação linear clara e consistente entre ${indicator(c.x)} e os ${outcome(c.metric)} de ${a.name} e ${b.name}. A posição ou a concentração dos pontos, isoladamente, não indica uma associação forte.`;
  if (!da) return `Não aparece uma relação linear clara entre ${indicator(c.x)} e ${outcome(c.metric)}${c.metric.startsWith('share') ? ` de ${a.name}` : ''}. A incerteza, sinais divergentes ou pouca variação impedem destacar uma direção segura.`;
  const target = outcome(c.metric).replace('percentuais', 'percentual').replace('variações', 'variação');
  return `${subject}, ${target}${c.metric.startsWith('share') ? ` de ${a.name}` : ''} tende a ser ${da > 0 ? 'maior' : 'menor'}. Esse padrão municipal não é uma regra para todas as cidades.`;
}
function geometryText(c: ReadingContext, g: ScatterGeometry): string {
  const h = g.horizontal, text: string[] = [];
  if (h.concentration !== 'none') text.push(`${fmtReading((h.concentration === 'left' ? h.left : h.right) * 100)}% dos municípios ficam no terço ${h.concentration === 'left' ? 'esquerdo' : 'direito'} do eixo${h.tail !== 'none' ? ': poucos extremos alongam a escala e comprimem o miolo' : ''}. A mediana é ${fmtReading(h.median)}${c.x.unit === '%' ? '%' : ` ${c.x.unit}`}; concentração não significa valor zero nem relação forte.`);
  else if (c.x.log) text.push('A escala logarítmica reduz a compressão pelos valores altos e abre o miolo da nuvem: distâncias iguais representam diferenças proporcionais, não valores absolutos iguais.');
  const wide = g.vertical.filter(v => v.width === 'wide'), thin = g.vertical.filter(v => v.width === 'thin');
  if (wide.length) text.push(`Dentro ${wide.length > 1 ? 'de cada série' : `da série de ${wide[0]?.name}`}, municípios com indicador parecido têm resultados muito diferentes. Essa abertura vertical limita quanto a variável isolada distingue os resultados.`);
  else if (thin.length) text.push(`A abertura dentro ${thin.length > 1 ? 'das duas séries' : `da série de ${thin[0]?.name}`} é pequena nas faixas comparáveis do indicador: há maior regularidade observada, não certeza sobre cidades individuais.`);
  else if (g.vertical.some(v => v.width === 'moderate')) text.push('Mesmo nas faixas de indicador semelhante, os pontos não seguem uma linha fina: há variação dentro das séries, além da distância entre elas.');
  else text.push('As faixas disponíveis não têm informação suficiente para classificar a abertura da nuvem com segurança.');
  const concentrated = g.vertical.filter(v => v.concentration !== 'none');
  if (concentrated.length) text.push(`${concentrated.map(v => `${v.name} concentra pontos ${v.concentration === 'base' ? 'na base' : 'no topo'}`).join(' e ')} do eixo; ${g.domain.y[0] !== 0 ? 'a base é uma faixa truncada, não votação zero' : 'a posição corresponde aos valores percentuais exibidos'}.`);
  return text.join(' ');
}
function adjustment(c: ReadingContext, series: readonly ReadingSeries[]): string {
  const xName = c.x.log ? `log10 ${c.x.label.toLowerCase()}` : c.x.label;
  const states = series.map(s => {
    const model = s.analysis.model, beta = model?.coefficients.find(v => v.name === xName);
    if (!beta || !beta.ci.every(Number.isFinite) || !Number.isFinite(beta.estimate)) return { name: s.name, state: 'indisponível', controls: [] as string[] };
    const names = model?.coefficients.map(v => v.name) ?? [];
    const controls = [names.includes('log10 renda') && c.x.id !== 'renda' && 'renda', names.includes('superior completo (%)') && c.x.id !== 'superior' && 'escolaridade', names.includes('log10 população') && c.x.id !== 'populacao' && 'porte municipal', (model?.fixedEffects ?? 0) > 0 && 'UF'].filter((v): v is string => !!v);
    const d = direction(s.analysis);
    return { name: s.name, controls, state: beta.ci[0] <= 0 && beta.ci[1] >= 0 ? 'sem direção clara' : d && d !== Math.sign(beta.estimate) ? 'muda de direção' : d ? 'permanece' : 'ganha uma direção antes não clara' };
  });
  if (states.every(s => s.state === 'indisponível')) return '';
  const controls = states[0]?.controls.filter(v => states.every(s => s.controls.includes(v))) ?? [];
  const prefix = `Ao comparar municípios semelhantes${controls.length ? ` em ${controls.join(', ')}` : ' nos controles disponíveis'}`;
  const describe = (state: string) => state === 'sem direção clara' || state === 'indisponível' ? `fica ${state}` : state;
  return states.length === 2 && states[0]?.state === states[1]?.state ? `${prefix}, a leitura de ambas ${describe(states[0]?.state ?? 'indisponível')}.` : `${prefix}, ${states.map(s => `a leitura de ${s.name} ${describe(s.state)}`).join(', enquanto ')}.`;
}
/** One synthesis; calculations remain per series and geometry shares the exact render domain. */
export function interpretGraph(context: ReadingContext, input: readonly ReadingSeries[]): GraphReading {
  const points = input.map(s => ({ name: s.name, points: readingPoints(s.analysis) }));
  const domain = context.domain ?? scatterDomain(points.flatMap(s => s.points), context.x.log, input.length > 1);
  const geometry = analyzeScatterGeometry(points, domain, context.metric === 'share');
  const text = conclusion(context, input, geometry);
  const closing: string[] = [];
  if (geometry.composition) {
    const kind = geometry.composition.kind;
    closing.push(kind === 'zero'
      ? 'Os dois percentuais somam 100% nos pares observados; parte do espelhamento é matemática.'
      : kind === 'constant'
        ? 'A soma dos dois percentuais é constante nos pares observados, e o restante é Outros; isso também permite espelhamento matemático.'
        : 'A participação de Outros varia nos pares observados: os dois percentuais não são complementos exatos, embora o total compartilhado contribua para o espelhamento.');
  }
  if (context.metric === 'share_delta' && input.some(s => s.id === 'bolsonaro' || s.name.includes('Bolsonaro'))) closing.push('A variação em pontos percentuais compara Jair em 2022 com Flávio em 2026, não o nível atual nem transferência de eleitores.');
  const adjusted = adjustment(context, input);
  if (adjusted) closing.push(adjusted);
  const limitations: string[] = [];
  // Missing X/Y is already reported once in the chart coverage; do not duplicate it here.
  const modelMissing = input.filter(s => !s.analysis.model && s.hasModelAnalysis !== false);
  if (modelMissing.length) limitations.push(modelMissing.some(s => s.analysis.modelNote?.includes('Colinearidade')) ? 'Características que se sobrepõem impedem uma comparação ajustada confiável.' : 'A comparação ajustada está indisponível para parte ou toda a amostra.');
  const missingCovariates = Math.max(0, ...input.map(s => s.analysis.missing.covariates));
  if (missingCovariates) limitations.push('A comparação ajustada usa apenas municípios com todas as informações adicionais.');
  if (input.some(s => s.analysis.pearson && s.analysis.spearman && Math.sign(s.analysis.pearson.r) !== Math.sign(s.analysis.spearman.r))) limitations.push('A direção varia entre distância dos valores e ordem dos municípios.');
  const a = input[0], b = input[1], opposite = a && b && direction(a.analysis) * direction(b.analysis) < 0;
  const title = geometry.crossing && opposite ? 'A vantagem muda ao longo do indicador' : geometry.horizontal.concentration !== 'none' ? 'Concentração não elimina a diversidade dos resultados' : opposite ? 'Tendências opostas, com diferenças entre municípios' : 'Um padrão municipal, não uma regra individual';
  return { title, paragraphs: [text, geometryText(context, geometry), closing.join(' ')].filter(Boolean), limitations, geometry };
}
