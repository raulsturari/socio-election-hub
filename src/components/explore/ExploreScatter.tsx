import { useMemo, useState } from 'react';
import { PointsCanvas } from '@/components/motion/PointsCanvas';
import type { ExploreRow } from '@/lib/explore';
export function ExploreScatter({rows,unitX,replay}:{rows:ExploreRow[];unitX:string;replay:number}) {
  const [selected,setSelected]=useState<ExploreRow|null>(null);
  const currentSelected=selected?rows.find(r=>r.ibge_code===selected.ibge_code):undefined;
  const scaled=useMemo(()=>{
    const maxX=Math.max(1,...rows.map(r=>r.x??0)),maxY=Math.max(100,...rows.map(r=>r.y??0));
    return {maxX,maxY,points:rows.map(r=>({key:r.ibge_code,x:24+((r.x??0)/maxX)*306,y:360-((r.y??0)/maxY)*330}))};
  },[rows]);
  return <div><div className="relative h-[390px] w-full touch-pan-y" role="img" aria-label="Dispersão municipal interativa" onPointerUp={e=>{
    const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)*360/rect.width,y=(e.clientY-rect.top);
    let closest=Infinity,index=-1;scaled.points.forEach((p,i)=>{const d=Math.hypot(p.x-x,p.y-y);if(d<closest){closest=d;index=i;}});setSelected(rows[index]??null);
  }}>
    <PointsCanvas key={replay} points={scaled.points} width={360} height={390} alpha={0.6} radius={2} duration={1.2}/>
    <span className="absolute top-0 left-0 text-xs text-muted-foreground">Votos (%)</span><span className="absolute bottom-0 left-6 text-xs text-muted-foreground">0</span><span className="absolute bottom-0 right-4 text-xs text-muted-foreground">{scaled.maxX.toLocaleString('pt-BR',{maximumFractionDigits:0})} {unitX}</span>
  </div><div role="status" className="min-h-14 mt-2 text-center text-sm">{currentSelected?<><strong>{currentSelected.name} · {currentSelected.uf}</strong><span className="block text-primary tabular-nums">{currentSelected.x?.toLocaleString('pt-BR',{maximumFractionDigits:2})} {unitX} · {currentSelected.y?.toLocaleString('pt-BR',{maximumFractionDigits:2})}% dos votos</span></>:<span className="text-muted-foreground">Um ponto por município · sem ponderação</span>}</div></div>;
}
