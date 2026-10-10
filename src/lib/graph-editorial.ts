import type { ReadingContext, ReadingSeries } from './graph-reading';
import type { ScatterGeometry } from './scatter-geometry';

export function cityTopic(id: string, label: string, high = true): string {
  if (id === 'renda') return `nas cidades de ${high ? 'maior' : 'menor'} renda`;
  if (id === 'superior') return `nas cidades onde ${high ? 'mais' : 'menos'} moradores têm ensino superior`;
  const more = high ? 'maior' : 'menor';
  const topics: Record<string, string> = {
    renda: `renda ${high ? 'mais alta' : 'mais baixa'}`, superior: `${more} presença de moradores com ensino superior`,
    evangelica: `${more} presença evangélica`, catolica: `${more} presença católica`, semreligiao: `${more} presença de moradores sem religião`,
    preta: `${more} presença de moradores de cor ou raça preta`, parda: `${more} presença de moradores de cor ou raça parda`,
    branca: `${more} presença de moradores de cor ou raça branca`, populacao: `população ${more}`,
    urbanizacao: `${more} presença de moradores em áreas urbanas`, alfabetizacao: `${more} presença de moradores alfabetizados`,
    idade: `idade ${high ? 'mais alta' : 'mais baixa'}`,
  };
  return `nas cidades com ${topics[id] ?? `${label.toLowerCase()} ${more}`}`;
}
const shortName = (name: string) => name.includes('Flávio Bolsonaro') ? 'Flávio' : name.includes('Jair Bolsonaro') ? 'Jair Bolsonaro' : name;
export function supportedCrossing(input: readonly ReadingSeries[], g: ScatterGeometry, directions: readonly number[]): boolean {
  return input.length === 2 && input.every(s => s.analysis.points.y.length >= 20) && g.crossing && (directions[0] ?? 0) * (directions[1] ?? 0) < 0;
}
export function editorialNews(c: ReadingContext, input: readonly ReadingSeries[], g: ScatterGeometry, directions: number[]) {
  const a = input[0], b = input[1], da = directions[0] ?? 0, db = directions[1] ?? 0;
  const high = cityTopic(c.x.id, c.x.label), low = cityTopic(c.x.id, c.x.label, false);
  const names = input.map(s => shortName(s.name));
  const uncertain = { title: `Sem padrão claro de ${c.metric.startsWith('share') ? 'votação' : 'participação'} por ${c.x.label.toLowerCase()}`, text: `Neste recorte, não aparece um padrão claro ${c.metric.startsWith('share') ? `no desempenho de ${names.join(' e ')}` : 'na participação eleitoral'} entre cidades de diferentes perfis. Os resultados não sustentam apontar um lado favorecido por essa característica.` };
  if (!a || input.some(s => s.analysis.points.y.length < 20)) return { title: `Poucas cidades para avaliar ${c.x.label.toLowerCase()}`, text: 'Faltam cidades com informações suficientes neste recorte. Não é possível contar uma história confiável sobre a disputa a partir dos resultados disponíveis.' };
  if (!da && !db) return uncertain;
  if (c.metric !== 'share' && c.metric !== 'share_delta') {
    const noun = { turnout: 'Comparecimento', abstention: 'Abstenção', blank_null: 'Votos brancos e nulos', turnout_delta: 'Mudança no comparecimento de 2022 a 2026' }[c.metric];
    return { title: `${noun} ${da > 0 ? 'maior' : 'menor'} ${high}`, text: `${noun} tende a ser ${da > 0 ? 'maior' : 'menor'} ${high} do que ${low}. Essa diferença descreve os resultados das cidades, não a decisão de cada morador.${c.metric === 'turnout_delta' ? ' O que está em comparação é a mudança entre eleições, não o nível atual de participação.' : ''}` };
  }
  if (c.metric === 'share_delta') return { title: `Mudança na votação de ${names.join(' e ')} difere por ${c.x.label.toLowerCase()}`, text: `A variação da votação de ${names[0]} entre 2022 e 2026 tende a ser ${da > 0 ? 'maior' : da < 0 ? 'menor' : 'menos definida'} ${high}${b ? `; para ${names[1]}, ${db > 0 ? 'maior' : db < 0 ? 'menor' : 'não aparece uma direção clara'}` : ''}. ${input.some(s => s.id === 'bolsonaro' || s.name.includes('Bolsonaro')) ? 'No campo Bolsonaro, a comparação é entre Jair em 2022 e Flávio em 2026.' : 'A comparação é entre eleições, não uma previsão.'} Isso não informa quem lidera hoje.` };
  if (b && supportedCrossing(input, g, directions)) {
    const winner = shortName(g.highLeader ?? ''), other = shortName(g.lowLeader ?? '');
    return { title: `${winner} ganha força ${high}`, text: `${winner} leva vantagem ${high}, enquanto ${other} se sai melhor ${low}.` };
  }
  if (b && da && da === db) return { title: `${names.join(' e ')} têm votação ${da > 0 ? 'maior' : 'menor'} ${high}`, text: `${names.join(' e ')} tendem a ter votação ${da > 0 ? 'maior' : 'menor'} ${high}. Os dois caminham na mesma direção nesse recorte; melhorar o desempenho não significa, por si só, estar à frente do adversário.` };
  const growing = da > 0 ? a : db > 0 ? b : da ? a : b;
  if (!growing) return uncertain;
  const d = growing === a ? da : db, name = shortName(growing.name);
  return { title: `${name} tem votação ${d > 0 ? 'maior' : 'menor'} ${high}`, text: `${name} tende a receber uma parcela ${d > 0 ? 'maior' : 'menor'} dos votos ${high}.${b && da * db < 0 ? ` ${shortName(growing === a ? b.name : a.name)} segue a direção contrária, mas as faixas disponíveis não mostram uma troca consistente de liderança.` : b ? ' Para o outro candidato, não aparece uma direção clara neste recorte.' : ' O desempenho varia conforme o perfil da cidade, sem que isso determine o resultado em cada uma delas.'}` };
}
function concentrationReason(x: ReadingContext['x']): string {
  const topics: Record<string, string> = {
    renda: 'poucas cidades alcançam rendas tão altas',
    evangelica: 'poucas cidades têm uma presença evangélica muito alta',
    catolica: 'poucas cidades têm uma presença católica muito alta',
    superior: 'poucas cidades têm uma proporção tão alta de moradores com ensino superior',
    semreligiao: 'poucas cidades têm uma proporção tão alta de moradores sem religião',
    preta: 'poucas cidades têm uma proporção tão alta de moradores de cor ou raça preta',
    parda: 'poucas cidades têm uma proporção tão alta de moradores de cor ou raça parda',
    branca: 'poucas cidades têm uma proporção tão alta de moradores de cor ou raça branca',
    populacao: 'poucas cidades têm populações tão grandes',
    urbanizacao: 'poucas cidades têm uma proporção tão alta de moradores em áreas urbanas',
    alfabetizacao: 'poucas cidades têm uma proporção tão alta de moradores alfabetizados',
  };
  return topics[x.id] ?? `poucas cidades chegam a valores tão altos de ${x.label.toLowerCase()}`;
}
export function editorialShape(g: ScatterGeometry, c: ReadingContext, crossingSupported: boolean): string {
  const metric = c.metric;
  const phrases: string[] = [];
  if (g.horizontal.concentration === 'left' && g.horizontal.tail === 'right') phrases.push(`Os pontos se juntam à esquerda porque ${concentrationReason(c.x)}.`);
  else if (crossingSupported && metric === 'share') phrases.push('O cruzamento das cores mostra onde a vantagem muda de lado.');
  else if (g.horizontal.concentration === 'right' && g.horizontal.tail === 'left') phrases.push('Os pontos se juntam à direita porque a maioria das cidades está na faixa mais alta; poucas ficam no extremo oposto.');
  if (g.vertical.some(v => v.width === 'wide' || v.width === 'moderate')) phrases.push(`Os pontos espalhados mostram que cidades parecidas podem ter ${metric === 'share' ? 'votações' : metric === 'share_delta' || metric === 'turnout_delta' ? 'mudanças' : 'participação eleitoral'} bem diferentes: esse fator não conta a história toda.`);
  else if (g.vertical.some(v => v.width === 'thin')) phrases.push('Os pontos mais próximos mostram um padrão relativamente regular, embora ele não determine o resultado de cada cidade.');
  return phrases.slice(0, 2).join(' ');
}