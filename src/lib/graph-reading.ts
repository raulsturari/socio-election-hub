import type { LabAnalysis } from "./lab-analysis";
import type { XVariable, YMetric } from "./lab-variables";

export interface ReadingContext { x: XVariable; metric: YMetric; year: number; round: number; scope: string }
export interface ReadingSeries { name: string; id?: "bolsonaro" | "pt"; analysis: LabAnalysis; hasModelAnalysis?: boolean }
export interface GraphReading { title: string; introduction: string; series: { name: string; id?: "bolsonaro" | "pt" | undefined; text: string }[]; limitations: string[] }
export const MUNICIPAL_CAUTION = "São comparações entre municípios, não entre pessoas. O gráfico não prova causa e efeito.";
export const READING_CONVENTION = "Convenção descritiva: menos de 20 pares exige cautela; |r| abaixo de 0,1 não define direção linear; abaixo de 0,3 indica padrão disperso. Intervalo contendo zero ou amplitude maior que 1 e sinais divergentes entre Pearson/Spearman impedem uma direção segura. Esses limites não são leis universais nem testes de causalidade.";

function xDescription(x: XVariable): string {
  const descriptions: Record<string, string> = {
    preta: "uma parcela maior dos moradores se declara de cor ou raça preta (não inclui a categoria parda)",
    parda: "uma parcela maior dos moradores se declara de cor ou raça parda",
    branca: "uma parcela maior dos moradores se declara de cor ou raça branca",
    evangelica: "uma parcela maior dos moradores de 10 anos ou mais se declara evangélica",
    catolica: "uma parcela maior dos moradores de 10 anos ou mais se declara católica",
    semreligiao: "uma parcela maior dos moradores de 10 anos ou mais se declara sem religião",
    superior: "uma parcela maior dos moradores de 25 anos ou mais tem ensino superior completo",
    alfabetizacao: "uma parcela maior dos moradores de 15 anos ou mais é alfabetizada",
    urbanizacao: "uma parcela maior dos moradores vive em área urbana",
    renda: "a renda domiciliar por pessoa é maior",
    populacao: "a população é maior",
    idade: "a idade mediana dos moradores é maior",
  };
  return descriptions[x.id] ?? `o indicador ${x.label} é maior`;
}

function outcome(metric: YMetric, name: string): string {
  switch (metric) {
    case "share": return `percentual dos votos válidos de ${name}`;
    case "share_delta": return `variação do percentual dos votos válidos de ${name} entre 2022 e 2026`;
    case "turnout": return "percentual de comparecimento";
    case "abstention": return "percentual de abstenção";
    case "blank_null": return "percentual de votos brancos e nulos";
    case "turnout_delta": return "variação do comparecimento entre 2022 e 2026";
  }
}

function simpleReading(a: LabAnalysis, x: XVariable, target: string): string {
  const p = a.pearson, s = a.spearman;
  if (a.points.y.length < 20) return "Há poucos municípios com as duas informações; não é seguro destacar uma direção neste recorte.";
  if (!p || !Number.isFinite(p.r)) return "Os dados disponíveis não permitem estabelecer uma direção: há pouca informação ou uma das medidas não varia entre os municípios.";
  if (s && Math.abs(p.r) >= 0.1 && Math.abs(s.r) >= 0.1 && Math.sign(p.r) !== Math.sign(s.r)) return "O padrão muda conforme se observa a distância entre os valores ou a ordem dos municípios; as duas leituras apontam direções diferentes.";
  if (Math.abs(p.r) < 0.1) return `Não aparece uma relação linear clara entre ${x.label.toLowerCase()} e ${target}.`;
  if (p.ci[0] <= 0 && p.ci[1] >= 0 || p.ci[1] - p.ci[0] > 1) return "A incerteza é grande; os dados não sustentam uma direção clara para este recorte.";
  return `Municípios onde ${xDescription(x)} tendem a ter ${target} ${p.r > 0 ? "maior" : "menor"}.${Math.abs(p.r) < 0.3 ? " O padrão varia bastante." : " Isso não é uma regra para todas as cidades."}`;
}

function adjustedReading(a: LabAnalysis, x: XVariable, target: string): string {
  if (!a.model) return "";
  const xName = x.log ? `log10 ${x.label.toLowerCase()}` : x.label;
  const coefficient = a.model.coefficients.find((c) => c.name === xName);
  if (!coefficient || !Number.isFinite(coefficient.estimate) || !coefficient.ci.every(Number.isFinite)) return "O ajuste disponível não permite uma leitura segura deste indicador.";
  const names = a.model.coefficients.map((c) => c.name);
  const controls = [names.includes("log10 renda") && "renda", names.includes("superior completo (%)") && "escolaridade", names.includes("log10 população") && "porte da população", a.model.fixedEffects > 0 && "UF"].filter((v): v is string => !!v);
  const prefix = controls.length ? `Ao comparar municípios com características semelhantes em ${controls.join(", ")},` : "Na comparação ajustada disponível,";
  if (coefficient.ci[0] <= 0 && coefficient.ci[1] >= 0) return `${prefix} a direção não fica clara. Isso não prova ausência de relação.`;
  const r = a.pearson?.r;
  const reversed = r != null && Math.abs(r) >= 0.1 && Math.sign(r) !== Math.sign(coefficient.estimate);
  const direction = reversed ? "o padrão geral muda de direção quando essas diferenças são levadas em conta" : r != null && Math.abs(r) >= 0.1 ? "a direção permanece na leitura ajustada" : "a leitura ajustada aponta uma direção que não era clara no padrão geral";
  return `${prefix} ${direction}: onde ${xDescription(x)}, o ${target} tende a ser ${coefficient.estimate > 0 ? "maior" : "menor"}.`;
}

function limitations(s: ReadingSeries): string[] {
  const a = s.analysis, notes: string[] = [];
  const dropped = a.missing.x + a.missing.y;
  if (dropped) notes.push(`${s.name}: ${dropped.toLocaleString("pt-BR")} ${dropped === 1 ? "município sem uma das informações não entra" : "municípios sem uma das informações não entram"} no gráfico; ausência não é zero.`);
  if (a.missing.covariates) notes.push(`${s.name}: ${a.missing.covariates.toLocaleString("pt-BR")} municípios ficam fora da comparação ajustada por falta de informações adicionais.`);
  if (!a.model && s.hasModelAnalysis !== false) notes.push(`${s.name}: ${a.modelNote?.includes("Colinearidade") ? "algumas características se sobrepõem, impedindo uma comparação ajustada confiável" : "a comparação ajustada está indisponível; os dados podem ser insuficientes"}.`);
  return notes;
}

/** Uses the exact chart analyses; never generates numbers, pools candidates or calls an API. */
export function interpretGraph(context: ReadingContext, input: readonly ReadingSeries[]): GraphReading {
  const { x, metric, year, round, scope } = context;
  const delta = metric === "share_delta" || metric === "turnout_delta";
  const axis = metric === "share" ? "Y mostra o percentual de todos os votos válidos, não o número de votos." : delta ? "Y mostra a mudança de 2022 para 2026 em pontos percentuais, não o nível atual nem um ganho garantido." : "Y mostra uma proporção municipal: comparecimento e abstenção sobre eleitores aptos; brancos e nulos sobre quem compareceu.";
  return {
    title: `${x.label} e ${delta ? "mudança entre eleições" : "resultado municipal"}`,
    introduction: `Cada ponto é um município de ${scope}, em ${year}, ${round}º turno. X mostra ${x.label.toLowerCase()} do Censo 2022: referência dos moradores, não dos eleitores individuais nem uma composição medida em 2026. ${axis}${metric === "share_delta" && input.some((s) => s.id === "bolsonaro" || s.name.includes("Bolsonaro")) ? " A série Bolsonaro compara Jair em 2022 com Flávio em 2026; não representa transferência individual de votos." : ""}`,
    series: input.map((s) => {
      const target = outcome(metric, s.name);
      return { name: s.name, id: s.id, text: [simpleReading(s.analysis, x, target), adjustedReading(s.analysis, x, target)].filter(Boolean).join(" ") };
    }),
    limitations: input.flatMap(limitations),
  };
}
