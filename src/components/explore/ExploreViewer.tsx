import { useQuery } from '@tanstack/react-query';
import { type z } from 'zod';
import { type Preset, type ExploreData, exploreInputSchema, ALWAYS_DUEL } from '@/lib/explore';
import { buildBands, territoryAdvantage, sortByAdvantage } from '@/lib/duel-bands';
import { X_VARIABLES } from '@/lib/lab-variables';
import { LeaderBands } from '@/components/duel/LeaderBands';
import { AdvantageRanking } from '@/components/duel/AdvantageRanking';
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
import { useEffect, useMemo } from 'react';
import { useReadyRegistry } from './chart-ready';

export type ViewerStatus='loading'|'ready'|'error'|'empty';
type Input=z.infer<typeof exploreInputSchema>;
const integer=(n:number|null)=>n==null?'—':n.toLocaleString('pt-BR');
export interface DuelContext { mode:DuelMode; bNumber:number|null; lNumber:number|null; bName:string; year:number; outros:boolean }
const electoral=(p:Preset)=>p.metric==='share'||p.metric==='share_delta';

/** `onStatus(key,status)`: 'ready' only when every query this preset+mode needs is current and every drawing surface finished its first frame. */
export function ExploreViewer({preset,input,replay,duel,statusKey,onStatus}:{preset:Preset;input:Input;replay:number;duel:DuelContext;statusKey:string;onStatus:(key:string,status:ViewerStatus)=>void}) {
  const surfaces=useReadyRegistry();
  const compare=(duel.mode==='comparar'&&electoral(preset))||ALWAYS_DUEL.has(preset.id);
  const duelOnly=['vote-map','states','leader-bands','vote-ranking'].includes(preset.id);
  const query=useQuery(exploreQuery(input));
  const needsL=compare&&!duelOnly;
  const queryL=useQuery({...exploreQuery({...input,candidateNumber:duel.lNumber}),enabled:needsL&&duel.lNumber!=null});
  const needsDuel=compare||(electoral(preset)&&preset.metric==='share');
  const duelData=useQuery({...duelQuery(input.electionId,input.uf),enabled:needsDuel&&input.electionId>0});
  // Memoized: a new Map each render would restart the map animation and readiness forever.
  const muni=useMemo(()=>new Map((duelData.data?.rows??[]).map(r=>[r.ibge_code,duelMunicipality(r)])),[duelData.data]);
  const detail=duelData.data&&preset.metric==='share'?(c:string)=><DuelDetail m={muni.get(c)} year={duel.year}/>:undefined;
  const pending=query.isPending||(needsL&&queryL.isPending)||(compare&&duelOnly&&duelData.isPending);
  const error=query.error??(needsL?queryL.error:null)??(compare?duelData.error:null);
  const needed=[query,...(needsL&&duel.lNumber!=null?[queryL]:[]),...(needsDuel&&input.electionId>0?[duelData]:[])];
  const current=needed.every(q=>q.status==='success'&&!q.isPlaceholderData&&q.fetchStatus!=='fetching');
  const empty=!!query.data&&(!!query.data.unavailable||(preset.kind==='bars'&&!compare&&!query.data.bars.length));
  const status:ViewerStatus=error?'error':!current?'loading':empty?'empty':surfaces.allDone?'ready':'loading';
  useEffect(()=>{onStatus(statusKey,status);},[statusKey,status,onStatus]);
  if(pending)return <div className="h-[510px] skeleton rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground" role="status">Aguardando dados…</div>;
  if(error)return <div role="alert" className="min-h-[510px] flex flex-col justify-center items-center gap-4 text-center"><p>{error.message}</p><Button onClick={()=>{query.refetch();queryL.refetch();duelData.refetch();}}>Tentar novamente</Button></div>;
  const data=query.data;
  if(!data)return null;
  if(data.unavailable || (preset.kind==='bars'&&!compare&&!data.bars.length))return <div className="min-h-[510px] flex flex-col justify-center text-center text-muted-foreground"><p>{data.unavailable ?? 'Nenhum município atende ao mínimo de eleitores selecionado.'}</p></div>;
  const dataL=queryL.data;
  const coverage=compare&&preset.id==='vote-map'?muni.size:data.coverage;
  return <surfaces.Provider><div aria-busy={status==='loading'}><div className="flex justify-between items-baseline border-b pb-3 mb-3"><span className="text-xs text-muted-foreground">{query.isPlaceholderData?'ATUALIZANDO · SELEÇÃO ANTERIOR':compare?'OBSERVAÇÕES · DUAS SÉRIES':'OBSERVAÇÕES COMPLETAS'}</span><AnimatedNumber value={coverage} format={integer} className="text-2xl font-semibold"/></div>
    {compare?<CompareBody preset={preset} input={input} data={data} dataL={dataL} duel={duel} replay={replay} muni={muni} duelRows={duelData.data?.rows??[]} detail={detail}/>
      :preset.kind==='map'?<ExploreMap rows={data.rows} unit={preset.metric==='indicator'?data.unitX:preset.unit} replay={replay} detail={detail}/>:preset.kind==='scatter'?<ExploreScatter rows={data.rows} unitX={data.unitX} replay={replay}/>:<ExploreBars bars={data.bars} unit={preset.unit} replay={replay}/>}
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{data.source} · {data.missing.toLocaleString('pt-BR')} observações incompletas, excluídas sem imputação. {data.updated?`Registro eleitoral atualizado em ${new Date(data.updated).toLocaleDateString('pt-BR')}.`:''}</p>
  </div></surfaces.Provider>;
}

function CompareBody({preset,input,data,dataL,duel,replay,muni,duelRows,detail}:{preset:Preset;input:Input;data:ExploreData;dataL:ExploreData|undefined;duel:DuelContext;replay:number;muni:Map<string,ReturnType<typeof duelMunicipality>>;duelRows:Parameters<typeof aggregateDuel>[0];detail?:((c:string)=>React.ReactNode)|undefined}){
  const advantageRows=useMemo(()=>[...muni.values()].map(m=>({ibge_code:m.ibge_code,name:m.name,uf:m.uf,x:null,y:m.advantage,eligible:null,votes:null,valid:m.valid})),[muni]);
  const territories=useMemo(()=>territoryAdvantage(duelRows,r=>r.uf),[duelRows]);
  const bands=useMemo(()=>{const xs=new Map(data.rows.map(r=>[r.ibge_code,r.x]));return buildBands(duelRows.map(r=>({ibge_code:r.ibge_code,x:xs.get(r.ibge_code)??null,b:r.b_votes,l:r.l_votes,valid:r.valid_votes})),data.unitX);},[duelRows,data]);
  const muniRanking=useMemo(()=>{const all=sortByAdvantage(territoryAdvantage(duelRows.filter(r=>(r.valid_votes??0)>=input.minimum),r=>r.ibge_code),'pp');return [...all.slice(0,10),...all.slice(-10).filter(t=>!all.slice(0,10).includes(t))];},[duelRows,input.minimum]);
  const series=useMemo(()=>{const pts=(d:ExploreData|undefined)=>(d?.rows??[]).flatMap(r=>r.x==null||r.y==null?[]:[{code:r.ibge_code,name:r.name,uf:r.uf,x:r.x,y:r.y}]);return [{id:'bolsonaro' as const,label:duel.bName,points:pts(data)},{id:'pt' as const,label:'Lula',points:pts(dataL)}];},[data,dataL,duel.bName]);
  // Every municipality carries rows for all candidates, so both series share the same valid-vote denominator per band.
  const bandBars=useMemo<DuelBar[]>(()=>{const lmap=new Map((dataL?.bars??[]).map(b=>[b.key,b]));return data.bars.map(b=>{const l=lmap.get(b.key)?.value??null;return {key:b.key,label:b.label,b:b.value,l,o:l==null?null:100-b.value-l,count:b.count};});},[data,dataL]);
  if(preset.id==='vote-map'){
    const rows=advantageRows;
    return <ExploreMap rows={rows} unit="p.p." replay={replay} diverging detail={detail}/>;
  }
  if(preset.id==='states'){
    return <AdvantageRanking items={territories} bName={duel.bName} label={k=>k} replay={replay} csvName="vantagem-por-estado.csv" source={data.source}/>;
  }
  if(preset.id==='leader-bands'){
    const v=X_VARIABLES.find(x=>x.id===input.x)??X_VARIABLES[0];
    return <LeaderBands result={bands} bName={duel.bName} outros={duel.outros} xLabel={data.labelX} unit={data.unitX} topic={v?.topic??data.labelX.toLowerCase()} source={data.source} replay={replay}/>;
  }
  if(preset.kind==='scatter'){
    return <DuelScatter replay={replay} series={series} xLabel={data.labelX??preset.subtitle.split('×')[0]?.trim()??''} yLabel="% dos votos válidos" formatX={v=>`${v.toLocaleString('pt-BR',{maximumFractionDigits:1})} ${data.unitX}`} detail={c=><DuelDetail m={muni.get(c)} year={duel.year}/>}/>;
  }
  if(preset.id==='income-bands'){
    return <DuelBars bars={bandBars} bName={duel.bName} outros={duel.outros} replay={replay}/>;
  }
  if(preset.id==='vote-change'){
    return <div className="space-y-5">{([['bolsonaro',`Bolsonaro: Jair (2022) → Flávio (2026)`,data],['pt','Lula (2022) → Lula (2026)',dataL]] as const).map(([s,t,d])=><div key={s} data-series={s}><p className="label-caps mb-1 text-series-label">{t}</p>{d?<ExploreMap rows={d.rows} unit="p.p." replay={replay}/>:<p className="text-sm text-muted-foreground">Sem dados.</p>}</div>)}
      <p className="text-[11px] text-muted-foreground">Mudança de candidato no campo Bolsonaro (Jair → Flávio): a variação compara candidaturas diferentes e não indica transferência de eleitores.</p></div>;
  }
  // vote-ranking: one diverging list — the strongest advantages for each side, same municipalities scale.
  return <div className="space-y-2"><p className="text-xs text-muted-foreground">As 10 maiores vantagens de cada lado entre municípios com pelo menos {input.minimum.toLocaleString('pt-BR')} votos válidos.</p><AdvantageRanking items={muniRanking} bName={duel.bName} label={k=>{const m=muni.get(k);return m?`${m.name} · ${m.uf}`:k;}} replay={replay} csvName="vantagem-por-municipio.csv" source={data.source}/></div>;
}
