import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { brazilMeshQuery } from '@/services/explore-queries';
import type { GeoFeature } from '@/services/queries';
import type { ExploreRow } from '@/lib/explore';
import { prefersReducedMotion } from '@/lib/motion';
import { Button } from '@/components/ui/button';

const rings = (f:GeoFeature):number[][][] => f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat();
export function mapPaths(features:GeoFeature[]) {
  const coords = features.flatMap(f => rings(f).flat());
  let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
  for(const [x=0,y=0] of coords){left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);}
  const scale = Math.min(330/((right-left)*0.92),380/(top-bottom));
  const offset = (360-(right-left)*0.92*scale)/2;
  return features.map(f => ({ code:f.properties.codarea, path:new Path2D(rings(f).map(r => r.map(([x=0,y=0],i) => `${i?'L':'M'}${offset+(x-left)*0.92*scale},${20+(top-y)*scale}`).join('')+'Z').join('')) }));
}
export function ExploreMap({rows,unit,replay}:{rows:ExploreRow[];unit:string;replay:number}) {
  const mesh = useQuery(brazilMeshQuery());
  const canvas = useRef<HTMLCanvasElement>(null);
  const shown = useRef(new Map<string,number>());
  const lastReplay = useRef(replay);
  const [selected,setSelected] = useState<ExploreRow | null>(null);
  const geometry = useMemo(() => mesh.data && typeof Path2D !== 'undefined' ? mapPaths(mesh.data.features) : [],[mesh.data]);
  const values = useMemo(() => new Map(rows.map(r => [r.ibge_code,r])),[rows]);
  const extent = useMemo(() => { const ys=rows.map(r=>r.y ?? 0);return [Math.min(0,...ys),Math.max(1,...ys)] as const; },[rows]);
  useEffect(() => {
    const cv=canvas.current, ctx=cv?.getContext('2d'); if(!cv || !ctx || !geometry.length) return;
    const dpr=Math.min(window.devicePixelRatio,2);cv.width=360*dpr;cv.height=420*dpr;
    const css=getComputedStyle(cv), primary=css.getPropertyValue('--primary'), negative=css.getPropertyValue('--negative'), muted=css.getPropertyValue('--secondary'), border=css.getPropertyValue('--background');
    const start=performance.now(), from=lastReplay.current===replay?new Map(shown.current):new Map<string,number>(); lastReplay.current=replay; let frame=0;
    const draw=(now:number) => {
      const t=prefersReducedMotion()?1:Math.min(1,(now-start)/1200), eased=1-(1-t)**3;
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,360,420);ctx.lineWidth=0.18;ctx.strokeStyle=border;
      for(const g of geometry){
        const value=values.get(g.code)?.y;const intensity=value==null?0:Math.min(1,Math.abs(value)/Math.max(1,value<0?Math.abs(extent[0]):extent[1]));
        const opacity=(from.get(g.code) ?? 0)+(intensity-(from.get(g.code) ?? 0))*eased;shown.current.set(g.code,opacity);
        ctx.globalAlpha=1;ctx.fillStyle=muted;ctx.fill(g.path);
        if(value!=null){ctx.globalAlpha=0.15+opacity*0.85;ctx.fillStyle=value<0?negative:primary;ctx.fill(g.path);}
        ctx.globalAlpha=1;ctx.stroke(g.path);
      }
      if(t<1)frame=requestAnimationFrame(draw);
    };frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
  },[geometry,values,extent,replay]);
  const selectAt=(clientX:number,clientY:number) => {
    const cv=canvas.current,ctx=cv?.getContext('2d');if(!cv||!ctx)return;
    const rect=cv.getBoundingClientRect(),x=(clientX-rect.left)*360/rect.width,y=(clientY-rect.top)*420/rect.height;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);const hit=geometry.find(g=>ctx.isPointInPath(g.path,x,y));ctx.restore();
    if(hit)setSelected(values.get(hit.code) ?? null);
  };
  if(mesh.isPending)return <div className="h-[420px] skeleton bg-muted rounded-lg" aria-label="Carregando mapa"/>;
  if(mesh.error)return <div role="alert" className="h-[420px] flex flex-col justify-center items-center gap-4"><p>Mapa IBGE indisponível.</p><Button onClick={()=>mesh.refetch()}>Tentar novamente</Button></div>;
  return <div className="relative"><canvas ref={canvas} role="img" aria-label="Mapa municipal interativo" className="w-full h-[420px] touch-pan-y" onPointerUp={e=>selectAt(e.clientX,e.clientY)} onMouseMove={e=>selectAt(e.clientX,e.clientY)}/>
    <div className="min-h-12 text-sm text-center" role="status">{selected ? <><strong>{selected.name} · {selected.uf}</strong><span className="block text-primary tabular-nums">{values.get(selected.ibge_code)?.y?.toLocaleString('pt-BR',{maximumFractionDigits:2}) ?? '—'} {unit}</span></> : <span className="text-muted-foreground">Municípios · malha IBGE 2022</span>}</div>
    <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>{extent[0].toLocaleString('pt-BR',{maximumFractionDigits:1})}</span><span className="h-2 flex-1 rounded-full explore-legend"/><span>{extent[1].toLocaleString('pt-BR',{maximumFractionDigits:1})} {unit}</span></div>
    <p className="mt-2 text-[11px] text-muted-foreground">Malha: 5.570 municípios. Boa Esperança do Norte não possui geometria nesta malha; não é desenhada por aproximação.</p>
  </div>;
}
