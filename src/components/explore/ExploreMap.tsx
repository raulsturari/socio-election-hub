import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
/** `diverging`: signed Bolsonaro − Lula advantage, blue/red, symmetric scale. */
export function ExploreMap({rows,unit,replay,diverging=false,detail}:{rows:ExploreRow[];unit:string;replay:number;diverging?:boolean;detail?:((code:string)=>ReactNode)|undefined}) {
  const mesh = useQuery(brazilMeshQuery());
  const canvas = useRef<HTMLCanvasElement>(null);
  const lastReplay = useRef(replay);
  const [selected,setSelected] = useState<ExploreRow | null>(null);
  const geometry = useMemo(() => mesh.data && typeof Path2D !== 'undefined' ? mapPaths(mesh.data.features) : [],[mesh.data]);
  const values = useMemo(() => new Map(rows.map(r => [r.ibge_code,r])),[rows]);
  const extent = useMemo(() => { const ys=rows.map(r=>r.y ?? 0);if(diverging){const m=Math.max(1,...ys.map(Math.abs));return [-m,m] as const;}return [Math.min(0,...ys),Math.max(1,...ys)] as const; },[rows,diverging]);
  useEffect(() => {
    const cv=canvas.current, ctx=cv?.getContext('2d'); if(!cv || !ctx || !geometry.length) return;
    const dpr=Math.min(window.devicePixelRatio,2);cv.width=360*dpr;cv.height=420*dpr;
    const css=getComputedStyle(cv), primary=css.getPropertyValue('--series-color'), negative=css.getPropertyValue('--series-negative'), muted=css.getPropertyValue('--data-missing'), border=css.getPropertyValue('--background');
    const previous=document.createElement('canvas');previous.width=cv.width;previous.height=cv.height;
    if(lastReplay.current===replay)previous.getContext('2d')?.drawImage(cv,0,0);
    lastReplay.current=replay;
    const target=document.createElement('canvas');target.width=cv.width;target.height=cv.height;
    const layer=target.getContext('2d');if(!layer)return;
    layer.setTransform(dpr,0,0,dpr,0,0);layer.lineWidth=0.18;layer.strokeStyle=border;
    // Rasterize municipalities once; the animation composites two images, not 5,570 paths each frame.
    for(const g of geometry){
      const value=values.get(g.code)?.y;
      layer.globalAlpha=1;layer.fillStyle=muted;layer.fill(g.path);
      if(value!=null){layer.globalAlpha=0.15+0.85*Math.min(1,Math.abs(value)/Math.max(1,value<0?Math.abs(extent[0]):extent[1]));layer.fillStyle=value<0?negative:primary;layer.fill(g.path);}
      layer.globalAlpha=1;layer.stroke(g.path);
    }
    const start=performance.now();let frame=0;
    const draw=(now:number) => {
      const t=prefersReducedMotion()?1:Math.min(1,(now-start)/1200), eased=1-(1-t)**3;
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
      ctx.globalAlpha=1-eased;ctx.drawImage(previous,0,0);ctx.globalAlpha=eased;ctx.drawImage(target,0,0);ctx.globalAlpha=1;
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
  const duelVars = diverging ? ({'--series-color':'var(--candidate-bolsonaro)','--series-negative':'var(--candidate-pt)'} as CSSProperties) : undefined;
  return <div className="relative" style={duelVars}><canvas ref={canvas} role="img" aria-label="Mapa municipal interativo" className="w-full h-[420px] touch-pan-y" onPointerUp={e=>selectAt(e.clientX,e.clientY)} onMouseMove={e=>selectAt(e.clientX,e.clientY)}/>
    <div className="min-h-12 text-sm text-center" role="status">{selected && detail ? <div className="text-left text-xs">{detail(selected.ibge_code)}</div> : selected ? <><strong>{selected.name} · {selected.uf}</strong><span className="block text-series-label tabular-nums">{values.get(selected.ibge_code)?.y?.toLocaleString('pt-BR',{maximumFractionDigits:2}) ?? '—'} {unit}</span></> : <span className="text-muted-foreground">Municípios · malha IBGE 2022</span>}</div>
    <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>{extent[0].toLocaleString('pt-BR',{maximumFractionDigits:1})}</span><span className={`h-2 flex-1 rounded-full ${diverging?'duel-legend':extent[0]<0?'explore-legend-signed':'explore-legend'}`}/><span>{extent[1].toLocaleString('pt-BR',{maximumFractionDigits:1})} {unit}</span></div>
    {diverging&&<p className="mt-1 text-[11px] text-muted-foreground">Vantagem entre os dois: vermelho = Lula à frente de Bolsonaro, azul = Bolsonaro à frente de Lula. Não declara vencedor entre todas as candidaturas.</p>}
    <p className="mt-2 text-[11px] text-muted-foreground">Malha: 5.570 municípios. Boa Esperança do Norte não possui geometria nesta malha; não é desenhada por aproximação.</p>
  </div>;
}
