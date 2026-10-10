import { useQuery } from '@tanstack/react-query';
import { useEffect,useRef,useMemo } from 'react';
import { exploreQuery,brazilMeshQuery } from '@/services/explore-queries';
import { mapPaths } from './ExploreMap';
import type { z } from 'zod';
import { exploreInputSchema,type Preset } from '@/lib/explore';
export function PresetThumbnail({preset,input}:{preset:Preset;input:z.infer<typeof exploreInputSchema>}){
 const data=useQuery(exploreQuery({...input,preset:preset.id}));const mesh=useQuery({...brazilMeshQuery(),enabled:preset.kind==='map'});const canvas=useRef<HTMLCanvasElement>(null);
 const geometry=useMemo(()=>mesh.data&&typeof Path2D!=='undefined'?mapPaths(mesh.data.features):[],[mesh.data]);
 useEffect(()=>{
  const cv=canvas.current,ctx=cv?.getContext('2d');if(!cv||!ctx||!data.data)return;
  ctx.clearRect(0,0,160,72);ctx.fillStyle=getComputedStyle(cv).getPropertyValue('--primary');const d=data.data;
  if(preset.kind==='map'){
   const values=new Map(d.rows.map(r=>[r.ibge_code,r.y]));const max=Math.max(1,...d.rows.map(r=>Math.abs(r.y??0)));ctx.save();ctx.translate(45,0);ctx.scale(0.17,0.17);
   for(const g of geometry){ctx.globalAlpha=0.12+Math.abs(values.get(g.code)??0)/max*0.88;ctx.fill(g.path);}ctx.restore();
  }else if(preset.kind==='scatter'){
   const maxX=Math.max(1,...d.rows.map(r=>r.x??0));ctx.globalAlpha=0.4;
   for(const r of d.rows){ctx.beginPath();ctx.arc(5+(r.x??0)/maxX*150,68-(r.y??0)/100*60,0.65,0,Math.PI*2);ctx.fill();}
  }else{const max=Math.max(1,...d.bars.map(b=>Math.abs(b.value)));d.bars.slice(0,8).forEach((b,i)=>ctx.fillRect(0,i*9,Math.abs(b.value)/max*155,5));}
 },[data.data,geometry,preset.kind]);
 return data.error?<span className="text-xs text-muted-foreground">Indisponível</span>:<canvas ref={canvas} width={160} height={72} className={`w-full h-[72px] ${data.isPending?'skeleton':''}`} aria-hidden/>;
}
