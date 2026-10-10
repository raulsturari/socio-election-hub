import { useQuery } from '@tanstack/react-query';
import { type z } from 'zod';
import { type Preset, exploreInputSchema } from '@/lib/explore';
import { exploreQuery } from '@/services/explore-queries';
import { ExploreMap } from './ExploreMap';
import { ExploreScatter } from './ExploreScatter';
import { ExploreBars } from './ExploreBars';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
const integer=(n:number|null)=>n==null?'—':n.toLocaleString('pt-BR');
export function ExploreViewer({preset,input,replay}:{preset:Preset;input:z.infer<typeof exploreInputSchema>;replay:number}) {
  const query=useQuery(exploreQuery(input));
  if(query.isPending)return <div className="h-[510px] skeleton rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground" role="status">Carregando observações oficiais…</div>;
  if(query.error)return <div role="alert" className="min-h-[510px] flex flex-col justify-center items-center gap-4 text-center"><p>{query.error.message}</p><Button onClick={()=>query.refetch()}>Tentar novamente</Button></div>;
  const data=query.data;
  if(data.unavailable || (preset.kind==='bars'&&!data.bars.length))return <div className="min-h-[510px] flex flex-col justify-center text-center text-muted-foreground"><p>{data.unavailable ?? 'Nenhum município atende ao mínimo de eleitores selecionado.'}</p></div>;
  return <div aria-busy={query.isFetching}><div className="flex justify-between items-baseline border-b pb-3 mb-3"><span className="text-xs text-muted-foreground">{query.isPlaceholderData?'ATUALIZANDO · SELEÇÃO ANTERIOR':'OBSERVAÇÕES COMPLETAS'}</span><AnimatedNumber value={data.coverage} format={integer} className="text-2xl font-semibold"/></div>
    {preset.kind==='map'?<ExploreMap rows={data.rows} unit={preset.unit} replay={replay}/>:preset.kind==='scatter'?<ExploreScatter rows={data.rows} unitX={data.unitX} replay={replay}/>:<ExploreBars bars={data.bars} unit={preset.unit} replay={replay}/>}
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{data.source} · {data.missing.toLocaleString('pt-BR')} observações incompletas, excluídas sem imputação. {data.updated?`Registro eleitoral atualizado em ${new Date(data.updated).toLocaleDateString('pt-BR')}.`:''}</p>
  </div>;
}
