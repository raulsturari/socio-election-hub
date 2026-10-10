import { useQuery } from '@tanstack/react-query';
import { type z } from 'zod';
import { type Preset, type ExploreData, exploreInputSchema } from '@/lib/explore';
import { exploreQuery } from '@/services/explore-queries';
import { duelQuery } from '@/services/queries';
import { aggregateDuel, duelMunicipality, type DuelMode } from '@/lib/duel';
import { ExploreMap } from './ExploreMap';
import { ExploreScatter } from './ExploreScatter';
import { ExploreBars } from './ExploreBars';
import { DuelScatter } from '@/components/duel/DuelScatter';
import { DuelBars, type DuelBar } from '@/components/duel/DuelBars';
import { DuelDetail } from '@/components/duel/DuelDetail';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
type Input=z.infer<typeof exploreInputSchema>;
const integer=(n:number|null)=>n==null?'—':n.toLocaleString('pt-BR');
export interface DuelContext { mode:DuelMode; bNumber:number|null; lNumber:number|null; bName:string; year:number; outros:boolean }
const electoral=(p:Preset)=>p.metric==='share'||p.metric==='share_delta';

export function ExploreViewer({preset,input,replay,duel}:{preset:Preset;input:Input;replay:number;duel:DuelContext}) {
  const compare=duel.mode==='comparar'&&electoral(preset);
  const query=useQuery(exploreQuery(input));
  const needsL=compare&&preset.id!=='vote-map'&&preset.id!=='states';
  const queryL=useQuery({...exploreQuery({...input,candidateNumber:duel.lNumber}),enabled:needsL&&duel.lNumber!=null});
  const needsDuel=compare||(electoral(preset)&&preset.metric==='share');
  const duelData=useQuery({...duelQuery(input.electionId,input.uf),enabled:needsDuel&&input.electionId>0});
  const muni=new Map((duelData.data?.rows??[]).map(r=>[r.ibge_code,duelMunicipality(r)]));
  const detail=duelData.data&&preset.metric==='share'?(c:string)=><DuelDetail m={muni.get(c)} year={duel.year}/>:undefined;
  const pending=query.isPending||(needsL&&queryL.isPending)||(compare&&(preset.id==='vote-map'||preset.id==='states')&&duelData.isPending);
  const error=query.error??(needsL?queryL.error:null)??(compare?duelData.error:null);
  if(pending)return <div className="h-[510px] skeleton rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground" role="status">Carregando observações oficiais…</div>;
  if(error)return <div role="alert" className="min-h-[510px] flex flex-col justify-center items-center gap-4 text-center"><p>{error.message}</p><Button onClick={()=>{query.refetch();queryL.refetch();duelData.refetch();}}>Tentar novamente</Button></div>;
  const data=query.data;
  if(!data)return null;
  if(data.unavailable || (preset.kind==='bars'&&!data.bars.length))return <div className="min-h-[510px] flex flex-col justify-center text-center text-muted-foreground"><p>{data.unavailable ?? 'Nenhum município atende ao mínimo de eleitores selecionado.'}</p></div>;
  const dataL=queryL.data;
  const coverage=compare&&preset.id==='vote-map'?muni.size:data.coverage;
  return <div aria-busy={query.isFetching}><div className="flex justify-between items-baseline border-b pb-3 mb-3"><span className="text-xs text-muted-foreground">{query.isPlaceholderData?'ATUALIZANDO · SELEÇÃO ANTERIOR':compare?'OBSERVAÇÕES · DUAS SÉRIES':'OBSERVAÇÕES COMPLETAS'}</span><AnimatedNumber value={coverage} format={integer} className="text-2xl font-semibold"/></div>
    {compare?<CompareBody preset={preset} data={data} dataL={dataL} duel={duel} replay={replay} muni={muni} duelRows={duelData.data?.rows??[]} detail={detail}/>
      :preset.kind==='map'?<ExploreMap rows={data.rows} unit={preset.unit} replay={replay} detail={detail}/>:preset.kind==='scatter'?<ExploreScatter rows={data.rows} unitX={data.unitX} replay={replay}/>:<ExploreBars bars={data.bars} unit={preset.unit} replay={replay}/>}
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{data.source} · {data.missing.toLocaleString('pt-BR')} observações incompletas, excluídas sem imputação. {data.updated?`Registro eleitoral atualizado em ${new Date(data.updated).toLocaleDateString('pt-BR')}.`:''}</p>
  </div>;
}

function CompareBody({preset,data,dataL,duel,replay,muni,duelRows,detail}:{preset:Preset;data:ExploreData;dataL:ExploreData|undefined;duel:DuelContext;replay:number;muni:Map<string,ReturnType<typeof duelMunicipality>>;duelRows:Parameters<typeof aggregateDuel>[0];detail?:((c:string)=>React.ReactNode)|undefined}){
  if(preset.id==='vote-map'){
    const rows=[...muni.values()].map(m=>({ibge_code:m.ibge_code,name:m.name,uf:m.uf,x:null,y:m.advantage,eligible:null,votes:null,valid:m.valid}));
    return <ExploreMap rows={rows} unit="p.p." replay={replay} diverging detail={detail}/>;
  }
  if(preset.id==='states'){
    const bars:DuelBar[]=aggregateDuel(duelRows,r=>r.uf).sort((a,b)=>(b.b-b.l)-(a.b-a.l)).map(g=>({key:g.key,label:g.key,b:g.b,l:g.l,o:g.o,count:g.count}));
    return <DuelBars bars={bars} bName={duel.bName} outros={duel.outros} replay={replay}/>;
  }
  if(preset.kind==='scatter'){
    const pts=(d:ExploreData|undefined)=>(d?.rows??[]).flatMap(r=>r.x==null||r.y==null?[]:[{code:r.ibge_code,name:r.name,uf:r.uf,x:r.x,y:r.y}]);
    return <DuelScatter replay={replay} series={[{id:'bolsonaro',label:duel.bName,points:pts(data)},{id:'pt',label:'Lula',points:pts(dataL)}]} xLabel={preset.subtitle.split('×')[0]?.trim()??''} yLabel="% dos votos válidos" formatX={v=>`${v.toLocaleString('pt-BR',{maximumFractionDigits:1})} ${data.unitX}`} detail={c=><DuelDetail m={muni.get(c)} year={duel.year}/>}/>;
  }
  if(preset.id==='income-bands'){
    const lmap=new Map((dataL?.bars??[]).map(b=>[b.key,b]));
    // Every municipality carries rows for all candidates, so both series share the same valid-vote denominator per band.
    const bars:DuelBar[]=data.bars.map(b=>{const l=lmap.get(b.key)?.value??null;return {key:b.key,label:b.label,b:b.value,l,o:l==null?null:100-b.value-l,count:b.count};});
    return <DuelBars bars={bars} bName={duel.bName} outros={duel.outros} replay={replay}/>;
  }
  if(preset.id==='vote-change'){
    return <div className="space-y-5">{([['bolsonaro',`Bolsonaro: Jair (2022) → Flávio (2026)`,data],['pt','Lula (2022) → Lula (2026)',dataL]] as const).map(([s,t,d])=><div key={s} data-series={s}><p className="label-caps mb-1 text-series-label">{t}</p>{d?<ExploreMap rows={d.rows} unit="p.p." replay={replay}/>:<p className="text-sm text-muted-foreground">Sem dados.</p>}</div>)}
      <p className="text-[11px] text-muted-foreground">Mudança de candidato no campo Bolsonaro (Jair → Flávio): a variação compara candidaturas diferentes e não indica transferência de eleitores.</p></div>;
  }
  // vote-ranking: two separate rankings, each over its own series.
  return <div className="space-y-6">{([['bolsonaro',duel.bName,data],['pt','Lula',dataL]] as const).map(([s,t,d])=><div key={s} data-series={s}><p className="label-caps text-series-label">Maiores percentuais · {t}</p>{d?.bars.length?<ExploreBars bars={d.bars} unit="%" replay={replay}/>:<p className="text-sm text-muted-foreground">Sem dados.</p>}</div>)}</div>;
}
