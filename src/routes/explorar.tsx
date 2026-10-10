import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, LayoutGrid, Compass } from 'lucide-react';
import { filtersSchema } from '@/lib/filters';
import { PRESETS, exploreSearchSchema } from '@/lib/explore';
import { useFilters } from '@/hooks/use-filters';
import { electionsQuery } from '@/services/queries';
import { exploreQuery } from '@/services/explore-queries';
import { ExploreViewer } from '@/components/explore/ExploreViewer';
import { PresetGallery } from '@/components/explore/PresetGallery';
import { Button } from '@/components/ui/button';
import { UFS } from '@/lib/constants';
export const Route=createFileRoute('/explorar')({
  validateSearch:filtersSchema.merge(exploreSearchSchema),
  loader:({context})=>context.queryClient.ensureQueryData(electionsQuery()),
  head:()=>({meta:[{title:'Explorar — Brasil Data Lab'},{name:'description',content:'14 análises interativas de votação, participação e indicadores municipais oficiais.'},{property:'og:title',content:'Explorar — Brasil Data Lab'},{property:'og:description',content:'Mapas, dispersões e rankings com dados TSE e IBGE, sem inferências individuais.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
  component:ExplorePage,
});
function ExplorePage(){
  const ctx=useFilters(),search=Route.useSearch(),navigate=useNavigate(),cache=useQueryClient();
  const index=Math.max(0,PRESETS.findIndex(p=>p.id===search.preset)),preset=PRESETS[index] ?? PRESETS[0];
  const [playing,setPlaying]=useState(false),[progress,setProgress]=useState(0),[replay,setReplay]=useState(0),[gallery,setGallery]=useState(false),[direction,setDirection]=useState(1);
  const reduced=useReducedMotion(),pointer=useRef<{x:number;y:number}|null>(null);
  const select=(id:string)=>{setDirection(PRESETS.findIndex(p=>p.id===id)>index?1:-1);setProgress(0);navigate({to:'/explorar',search:prev=>({...prev,preset:id}),replace:true});};
  const step=(dir:number)=>select(PRESETS[(index+dir+PRESETS.length)%PRESETS.length]?.id??PRESETS[0].id);
  const base=ctx.elections.find(e=>e.year===2022&&e.round===ctx.f.turno);
  const retainedCandidate=useRef<number|null>(null);
  if(ctx.candidate)retainedCandidate.current=ctx.candidate.number;
  const effectiveElection=preset.metric.endsWith('_delta')?ctx.elections.find(e=>e.year===2026&&e.round===ctx.f.turno):ctx.election;
  const input={preset:preset.id,electionId:effectiveElection?.id??0,baseElectionId:base?.id??null,candidateNumber:ctx.f.cand??ctx.candidate?.number??retainedCandidate.current,uf:ctx.f.uf,minimum:search.min??0};
  const queryKey=exploreQuery(input).queryKey;
  // Tour clock advances only while the current real dataset is successfully loaded.
  useEffect(()=>{
    if(!playing || reduced)return;
    let elapsed=0;const interval=window.setInterval(()=>{
      const state=cache.getQueryState(queryKey);
      if(state?.status!=='success'||state.fetchStatus==='fetching')return;
      elapsed+=100;setProgress(elapsed/5000);
      if(elapsed>=5000){elapsed=0;step(1);}
    },100);return()=>clearInterval(interval);
  },[playing,reduced,index,ctx.election?.id,ctx.candidate?.number,ctx.f.uf,search.min]);
  // Fetch the next preset ahead of the tour without sending all datasets to the phone up front.
  useEffect(()=>{if(!ctx.election||!ctx.candidate)return;const next=PRESETS[(index+1)%PRESETS.length];if(next)cache.prefetchQuery(exploreQuery({...input,preset:next.id}));},[index,ctx.election?.id,ctx.candidate?.number,ctx.f.uf]);
  const delta=preset.metric.endsWith('_delta');
  return <div className="px-4 pt-safe">
    <header className="flex justify-between items-center py-4"><div><p className="text-xs text-muted-foreground">BRASIL DATA LAB</p><h1 className="text-3xl font-semibold mt-1">Explorar</h1></div><Compass className="size-8 text-primary"/></header>
    <div className="grid grid-cols-[1fr_80px] gap-2 mb-3">
      <label className="text-xs text-muted-foreground">Candidato<select aria-label="Candidato" value={ctx.candidate?.number??''} onChange={e=>ctx.set({cand:Number(e.target.value)})} className="mt-1 h-12 w-full rounded-full bg-secondary text-foreground px-3 text-sm">{ctx.candidates.map(c=><option key={c.number} value={c.number}>{c.ballot_name} · {c.number}</option>)}</select></label>
      <label className="text-xs text-muted-foreground">Território<select aria-label="UF" value={ctx.f.uf??''} onChange={e=>ctx.set({uf:(e.target.value || undefined) as typeof search.uf,mun:undefined})} className="mt-1 h-12 w-full rounded-full bg-secondary text-foreground px-2 text-sm"><option value="">Brasil</option>{UFS.map(uf=><option key={uf} value={uf}>{uf}</option>)}</select></label>
    </div>
    <div className="flex items-center gap-4 mb-4"><label className="flex-1 text-xs text-muted-foreground">{delta?'Comparação fixa 2022 → 2026':preset.metric==='indicator'?'Indicador fixo: Censo 2022':`${ctx.f.ano} · ${ctx.f.turno}º turno`}<input aria-label="Ano eleitoral" type="range" min="0" max="1" step="1" value={ctx.f.ano===2026?1:0} onChange={e=>ctx.set({ano:Number(e.target.value)?2026:2022})} className="block w-full h-11 accent-primary" disabled={delta||preset.metric==='indicator'}/><span className="flex justify-between"><span>2022</span><span>2026</span></span></label><label className="text-xs text-muted-foreground">Turno<select aria-label="Turno" value={ctx.f.turno} onChange={e=>ctx.set({turno:e.target.value==='2'?2:1})} className="block h-11 rounded-full bg-secondary text-foreground px-3"><option value="1">1º</option><option value="2">2º</option></select></label></div>
    <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground tabular-nums">{String(index+1).padStart(2,'0')} / {PRESETS.length} · {preset.kind==='map'?'ATLAS':preset.kind==='scatter'?'RELAÇÕES':'COMPARAÇÕES'}</span><div className="flex gap-1">
      <Button variant="ghost" className="size-11 rounded-full" aria-label={playing?'Pausar tour':'Iniciar tour'} title={reduced?'Movimento reduzido: tour automático desativado':'Tour automático'} disabled={!!reduced} onClick={()=>{setPlaying(!playing);setProgress(0);}}>{playing?<Pause/>:<Play/>}</Button>
      <Button variant="ghost" className="size-11 rounded-full" aria-label="Repetir animação" title="Repetir animação" onClick={()=>setReplay(r=>r+1)}><RotateCcw/></Button>
      <Button variant="ghost" className="size-11 rounded-full" aria-label="Galeria de análises" aria-pressed={gallery} onClick={()=>setGallery(!gallery)}><LayoutGrid/></Button>
    </div></div>
    <div className="h-1 rounded-full bg-secondary mb-5 overflow-hidden" role="progressbar" aria-label="Progresso do tour" aria-valuenow={Math.round(progress*100)} aria-valuemin={0} aria-valuemax={100}><motion.div animate={{scaleX:progress}} transition={{duration:0.12}} className="h-full w-full origin-left bg-primary"/></div>
    <section aria-roledescription="carrossel" aria-label="Análises oficiais" className="overflow-hidden touch-pan-y" onPointerDown={e=>{pointer.current={x:e.clientX,y:e.clientY};}} onPointerUp={e=>{const p=pointer.current;pointer.current=null;if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1);}}>
      <motion.div key={preset.id} initial={{opacity:reduced?1:0,x:reduced?0:direction*70}} animate={{opacity:1,x:0}} transition={{duration:0.55,ease:[0.22,1,0.36,1]}}>
        <p className="text-xs text-muted-foreground mb-2">{preset.subtitle}</p><h2 className="text-2xl font-semibold leading-tight mb-4">{preset.title}</h2>
        {(preset.id==='vote-ranking'||preset.id==='turnout-ranking')&&<label className="block mb-4 text-xs text-muted-foreground">Mínimo de eleitores aptos<input aria-label="Mínimo de eleitores" type="number" min="0" max="10000000" value={search.min??0} onChange={e=>navigate({to:'/explorar',search:prev=>({...prev,min:Math.max(0,Math.min(10000000,Number(e.target.value)))}),replace:true})} className="block w-full h-11 rounded-full bg-secondary text-foreground px-4 mt-1"/></label>}
        {!effectiveElection?<div role="status" className="min-h-[510px] flex items-center text-center text-muted-foreground">Esta eleição não está disponível entre os dados validados. Selecione 2026 · 1º turno ou histórico de 2022.</div>:ctx.summary.isPending&&!retainedCandidate.current?<div className="h-[510px] skeleton"/>:ctx.summary.error?<div role="alert">Candidatos indisponíveis. <Button onClick={()=>ctx.summary.refetch()}>Tentar novamente</Button></div>:<ExploreViewer preset={preset} input={input} replay={replay}/>}
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{preset.note}</p>
      </motion.div>
    </section>
    <div className="flex justify-between items-center mt-5 gap-4"><Button variant="secondary" className="size-12 rounded-full" aria-label="Análise anterior" onClick={()=>step(-1)}><ArrowLeft/></Button><span className="text-xs text-muted-foreground">{index+1} de {PRESETS.length}</span><Button variant="secondary" className="size-12 rounded-full" aria-label="Próxima análise" onClick={()=>step(1)}><ArrowRight/></Button></div>
    {gallery&&<PresetGallery input={input} active={preset.id} onSelect={id=>{select(id);window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});}}/>}
    <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">Somente resultados publicados e reconciliados. Transições são visuais entre observações discretas; não existem valores eleitorais para anos intermediários. Dados municipais não permitem inferir voto individual ou causalidade.</p>
  </div>;
}
