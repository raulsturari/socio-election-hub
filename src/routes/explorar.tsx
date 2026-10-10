import { SeriesScope } from "@/components/SeriesScope";
import { ModeSelector } from "@/components/duel/ModeSelector";
import { DuelLegend } from "@/components/duel/DuelResults";
import { displayName, duelTitle } from "@/lib/duel";
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TourClock, TOUR_SPEEDS, DEFAULT_TOUR_SPEED, TOUR_SPEED_STORAGE_KEY, parseTourSpeed, type TourSpeed } from '@/lib/tour-clock';
import { motion } from 'motion/react';
import { useAccessibleMotion } from '@/hooks/use-reduced-motion';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, LayoutGrid, Compass } from 'lucide-react';
import { filtersSchema } from '@/lib/filters';
import { PRESETS, SELECTABLE_X, ALWAYS_DUEL, defaultX, nextInGroup, exploreSearchSchema } from '@/lib/explore';
import { X_VARIABLES } from '@/lib/lab-variables';
import { BottomSheet } from '@/components/ui-kit';
import { IndicatorPicker } from '@/components/lab/IndicatorPicker';
import { useFilters } from '@/hooks/use-filters';
import { electionsQuery } from '@/services/queries';
import { exploreQuery } from '@/services/explore-queries';
import { ExploreViewer, type ViewerStatus } from '@/components/explore/ExploreViewer';
import { PresetGallery } from '@/components/explore/PresetGallery';
import { Button } from '@/components/ui/button';
import { UFS } from '@/lib/constants';
export const Route=createFileRoute('/explorar')({
  validateSearch:filtersSchema.merge(exploreSearchSchema),
  loader:({context})=>context.queryClient.ensureQueryData(electionsQuery()),
  head:()=>({meta:[{title:'Explorar — Brasil Data Lab'},{name:'description',content:'22 análises interativas, começando pela comparação direta entre os candidatos, de votação, participação e indicadores municipais oficiais.'},{property:'og:title',content:'Explorar — Brasil Data Lab'},{property:'og:description',content:'Mapas, dispersões e rankings com dados TSE e IBGE, sem inferências individuais.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
  component:ExplorePage,
});
function ExplorePage(){
  const ctx=useFilters(),search=Route.useSearch(),navigate=useNavigate(),cache=useQueryClient();
  const index=Math.max(0,PRESETS.findIndex(p=>p.id===search.preset)),preset=PRESETS[index] ?? PRESETS[0];
  const [picker,setPicker]=useState(false),[playing,setPlaying]=useState(false),[progress,setProgress]=useState(0),[replay,setReplay]=useState(0),[gallery,setGallery]=useState(false),[direction,setDirection]=useState(1);
  const reduced=useAccessibleMotion(),pointer=useRef<{x:number;y:number}|null>(null);
  const select=(id:string)=>{pause();setDirection(PRESETS.findIndex(p=>p.id===id)>index?1:-1);setProgress(0);navigate({to:'/explorar',search:prev=>({...prev,preset:id}),replace:true});};
  const step=(dir:number)=>select(PRESETS[(index+dir+PRESETS.length)%PRESETS.length]?.id??PRESETS[0].id);
  const base=ctx.elections.find(e=>e.year===2022&&e.round===ctx.f.turno);
  const retainedCandidate=useRef<number|null>(null);
  if(ctx.candidate)retainedCandidate.current=ctx.candidate.number;
  const effectiveElection=preset.metric.endsWith('_delta')?ctx.elections.find(e=>e.year===2026&&e.round===ctx.f.turno):ctx.election;
  const input={preset:preset.id,electionId:effectiveElection?.id??0,baseElectionId:base?.id??null,candidateNumber:ctx.candidate?.number??retainedCandidate.current,uf:ctx.f.uf,minimum:search.min??0,x:SELECTABLE_X.has(preset.id)?(search.ix??defaultX(preset.id)):null};
  const chosenX=SELECTABLE_X.has(preset.id)?X_VARIABLES.find(v=>v.id===(search.ix??defaultX(preset.id))):null;
  const queryKey=exploreQuery(input).queryKey;
  // Tour: the clock counts only after the viewer reports the whole current analysis ready (see TourClock).
  const statusKey=JSON.stringify([input,ctx.mode,ctx.duel.bolsonaro?.number??null,ctx.duel.lula?.number??null,ctx.f.outros,ctx.f.ano]);
  const keyRef=useRef(statusKey);keyRef.current=statusKey;
  const advanceRef=useRef(()=>{});
  advanceRef.current=()=>{const next=nextInGroup(preset.id);setDirection(1);navigate({to:'/explorar',search:prev=>({...prev,preset:next}),replace:true});};
  const clock=useRef<TourClock|null>(null);
  const [speed,setSpeed]=useState<TourSpeed>(DEFAULT_TOUR_SPEED),[reported,setReported]=useState<{key:string;status:ViewerStatus}>({key:'',status:'loading'});
  const viewerStatus:ViewerStatus=reported.key===statusKey?reported.status:'loading';
  useEffect(()=>{
    const c=new TourClock({now:()=>performance.now(),setTimeout:(fn,ms)=>window.setTimeout(fn,ms),clearTimeout:h=>window.clearTimeout(h as number)},()=>advanceRef.current());
    let saved:TourSpeed=DEFAULT_TOUR_SPEED;try{saved=parseTourSpeed(window.localStorage.getItem(TOUR_SPEED_STORAGE_KEY));}catch{/* storage blocked: keep default */}
    c.setSpeed(saved);setSpeed(saved);c.setKey(keyRef.current);clock.current=c;
    const onVisibility=()=>{if(document.hidden){c.setPlaying(false);setPlaying(false);}};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{document.removeEventListener('visibilitychange',onVisibility);c.dispose();clock.current=null;};
  },[]);
  useEffect(()=>{clock.current?.setKey(statusKey);},[statusKey]);
  const onStatus=useCallback((key:string,status:ViewerStatus)=>{
    if(key!==keyRef.current)return; // stale callback from a previous analysis
    setReported({key,status});const c=clock.current;if(!c)return;c.setKey(key);
    if(status==='ready')c.markReady(key);else c.markNotReady(key);
  },[]);
  const play=(on:boolean)=>{clock.current?.setPlaying(on);setPlaying(on);setProgress(0);};
  const pause=()=>{if(playing)play(false);};
  const changeSpeed=(v:TourSpeed)=>{setSpeed(v);clock.current?.setSpeed(v);setProgress(0);try{window.localStorage.setItem(TOUR_SPEED_STORAGE_KEY,String(v));}catch{/* storage blocked */}};
  useEffect(()=>{if(!playing)return;let raf=0;const tick=()=>{setProgress(clock.current?.progress()??0);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[playing]);
  useEffect(()=>{if(reduced&&playing)play(false);},[reduced]);
  // Fetch the next preset ahead of the tour without sending all datasets to the phone up front.
  useEffect(()=>{if(!ctx.election||!ctx.candidate)return;const next=PRESETS.find(p=>p.id===nextInGroup(preset.id));if(next)cache.prefetchQuery(exploreQuery({...input,preset:next.id}));},[index,ctx.election?.id,ctx.candidate?.number,ctx.f.uf]);
  const delta=preset.metric.endsWith('_delta');
  return <div className="px-4 pt-safe">
    <header className="flex justify-between items-center py-4"><div><p className="text-xs text-muted-foreground">BRASIL DATA LAB</p><h1 className="text-3xl font-semibold mt-1">Explorar</h1></div><Compass className="size-8 text-primary"/></header>
    <div onClickCapture={pause} onChangeCapture={pause}><div className="mb-3"><ModeSelector ctx={ctx} showOutrosToggle/></div>
    <div className="grid grid-cols-[1fr_96px] items-end gap-2 mb-3">
      <p className="text-xs text-muted-foreground pb-3">{ctx.mode==='comparar'?duelTitle(ctx.f.ano):ctx.mode==='lula'?'Lula':displayName('bolsonaro',ctx.f.ano,ctx.duel.bolsonaro)} · presidência</p>
      <label className="text-xs text-muted-foreground">Território<select aria-label="UF" value={ctx.f.uf??''} onChange={e=>ctx.set({uf:(e.target.value || undefined) as typeof search.uf,mun:undefined})} className="mt-1 h-12 w-full rounded-full bg-secondary text-foreground px-2 text-sm"><option value="">Brasil</option>{UFS.map(uf=><option key={uf} value={uf}>{uf}</option>)}</select></label>
    </div>
    <div className="flex items-center gap-4 mb-4"><label className="flex-1 text-xs text-muted-foreground">{delta?'Comparação fixa 2022 → 2026':preset.metric==='indicator'?'Indicador fixo: IBGE (ano da fonte)':`${ctx.f.ano} · ${ctx.f.turno}º turno`}<input aria-label="Ano eleitoral" type="range" min="0" max="1" step="1" value={ctx.f.ano===2026?1:0} onChange={e=>ctx.set({ano:Number(e.target.value)?2026:2022})} className="block w-full h-11 accent-primary" disabled={delta||preset.metric==='indicator'}/><span className="flex justify-between"><span>2022</span><span>2026</span></span></label><label className="text-xs text-muted-foreground">Turno<select aria-label="Turno" value={ctx.f.turno} onChange={e=>ctx.set({turno:e.target.value==='2'?2:1})} className="block h-11 rounded-full bg-secondary text-foreground px-3"><option value="1">1º</option><option value="2">2º</option></select></label></div></div>
    <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground tabular-nums">{String(index+1).padStart(2,'0')} / {PRESETS.length} · {preset.group==='compare'?'COMPARAR CANDIDATOS':'CONTEXTO DEMOGRÁFICO'}</span><div className="flex gap-1">
      <Button variant="ghost" className="size-11 rounded-full" aria-label={playing?'Pausar tour':'Iniciar tour'} title={reduced?'Movimento reduzido: tour automático desativado':'Tour automático'} disabled={!!reduced} onClick={()=>play(!playing)}>{playing?<Pause/>:<Play/>}</Button>
      <Button variant="ghost" className="size-11 rounded-full" aria-label="Repetir animação" title="Repetir animação" onClick={()=>setReplay(r=>r+1)}><RotateCcw/></Button>
      <Button variant="ghost" className="size-11 rounded-full" aria-label="Galeria de análises" aria-pressed={gallery} onClick={()=>{pause();setGallery(!gallery);}}><LayoutGrid/></Button>
    </div></div>
    <div className="flex items-center justify-between gap-2 mb-2"><label className="flex items-center gap-2 text-xs text-muted-foreground">Tempo por gráfico<select aria-label="Tempo por gráfico" value={speed} onChange={e=>changeSpeed(parseTourSpeed(e.target.value))} className="h-11 rounded-full bg-secondary text-foreground px-3 text-sm">{TOUR_SPEEDS.map(v=><option key={v} value={v}>{v} s por gráfico</option>)}</select></label><span className="text-xs text-muted-foreground" aria-live="polite" data-testid="tour-state">{viewerStatus==='ready'?(playing?'Exibindo':'Pronto'):viewerStatus==='error'?'Erro ao carregar':viewerStatus==='empty'?'Sem dados':'Carregando gráfico…'}</span></div>
    <div className="h-1 rounded-full bg-secondary mb-5 overflow-hidden" role="progressbar" aria-label="Progresso do tour" aria-valuenow={viewerStatus==='ready'?Math.round(progress*100):0} aria-valuemin={0} aria-valuemax={100}><motion.div animate={{scaleX:viewerStatus==='ready'?progress:0}} transition={{duration:0}} className="h-full w-full origin-left bg-primary"/></div>
    <section aria-roledescription="carrossel" aria-label="Análises oficiais" className="overflow-hidden touch-pan-y" onPointerDown={e=>{pause();pointer.current={x:e.clientX,y:e.clientY};}} onPointerUp={e=>{const p=pointer.current;pointer.current=null;if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1);}}>
      <motion.div key={preset.id} initial={{opacity:reduced?1:0,x:reduced?0:direction*70}} animate={{opacity:1,x:0}} transition={{duration:0.55,ease:[0.22,1,0.36,1]}}>
        <p className="text-xs text-muted-foreground mb-2">{chosenX?`${chosenX.label} · ${chosenX.sourceShort??''}`:preset.subtitle}</p><h2 className="text-2xl font-semibold leading-tight mb-4">{preset.title}</h2>
        {chosenX&&<Button variant="secondary" onClick={()=>{pause();setPicker(true);}} className="mb-4 min-h-11 w-full justify-between rounded-full px-4"><span className="truncate">Indicador: {chosenX.label}</span><span className="text-xs text-muted-foreground">trocar</span></Button>}
        {(preset.id==='vote-ranking'||preset.id==='turnout-ranking')&&<label className="block mb-4 text-xs text-muted-foreground">Mínimo de eleitores aptos<input aria-label="Mínimo de eleitores" type="number" min="0" max="10000000" value={search.min??0} onChange={e=>navigate({to:'/explorar',search:prev=>({...prev,min:Math.max(0,Math.min(10000000,Number(e.target.value)))}),replace:true})} className="block w-full h-11 rounded-full bg-secondary text-foreground px-4 mt-1"/></label>}
        {!effectiveElection?<div role="status" className="min-h-[510px] flex items-center text-center text-muted-foreground">Esta eleição não está disponível entre os dados validados. Selecione 2026 · 1º turno ou histórico de 2022.</div>:ctx.summary.isPending&&!retainedCandidate.current?<div className="h-[510px] skeleton"/>:ctx.summary.error?<div role="alert">Candidatos indisponíveis. <Button onClick={()=>ctx.summary.refetch()}>Tentar novamente</Button></div>:(()=>{const electoral=preset.metric==='share'||preset.metric==='share_delta';const viewer=<ExploreViewer preset={preset} input={input} replay={replay} statusKey={statusKey} onStatus={onStatus} duel={{mode:ctx.mode,bNumber:ctx.duel.bolsonaro?.number??null,lNumber:ctx.duel.lula?.number??null,bName:displayName('bolsonaro',ctx.f.ano,ctx.duel.bolsonaro),year:ctx.f.ano,outros:ctx.f.outros}}/>;return (electoral&&ctx.mode==='comparar')||ALWAYS_DUEL.has(preset.id)?<div><DuelLegend year={ctx.f.ano} outros={ctx.f.outros}/>{viewer}</div>:<SeriesScope candidate={ctx.candidate} electoral={electoral}>{viewer}</SeriesScope>;})()}
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{preset.note}</p>
      </motion.div>
    </section>
    <div className="flex justify-between items-center mt-5 gap-4"><Button variant="secondary" className="size-12 rounded-full" aria-label="Análise anterior" onClick={()=>step(-1)}><ArrowLeft/></Button><span className="text-xs text-muted-foreground">{index+1} de {PRESETS.length}</span><Button variant="secondary" className="size-12 rounded-full" aria-label="Próxima análise" onClick={()=>step(1)}><ArrowRight/></Button></div>
    <BottomSheet open={picker} onClose={()=>setPicker(false)} title="Escolher indicador">{picker&&<IndicatorPicker value={search.ix??defaultX(preset.id)} onSelect={id=>{setPicker(false);navigate({to:'/explorar',search:prev=>({...prev,ix:id}),replace:true});}}/>}</BottomSheet>
    {gallery&&<PresetGallery candidate={ctx.mode==='comparar'?null:ctx.candidate} input={input} active={preset.id} onSelect={id=>{select(id);window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});}}/>}
    <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">Somente resultados publicados e reconciliados. Transições são visuais entre observações discretas; não existem valores eleitorais para anos intermediários. Dados municipais não permitem inferir voto individual ou causalidade.</p>
  </div>;
}
