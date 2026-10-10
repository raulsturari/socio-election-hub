import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import type { ExploreBar } from '@/lib/explore';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { Button } from '@/components/ui/button';
const format=(n:number|null)=>n==null?'—':n.toLocaleString('pt-BR',{maximumFractionDigits:2});
export function ExploreBars({bars,unit,replay}:{bars:ExploreBar[];unit:string;replay:number}) {
  const [selected,setSelected]=useState<string|null>(null);const reduce=useReducedMotion();const max=Math.max(1,...bars.map(b=>Math.abs(b.value)));
  return <div className="min-h-[420px] space-y-3 py-4" role="img" aria-label="Ranking em barras animadas">{bars.map(b=><motion.div layout="position" key={b.key} transition={{duration:reduce?0:0.85}}>
    <Button variant="ghost" className="w-full min-h-12 h-auto flex-col items-stretch gap-1 px-0 hover:bg-transparent" onClick={()=>setSelected(selected===b.key?null:b.key)} aria-label={`${b.label}: ${format(b.value)} ${unit}`}>
      <span className="flex justify-between gap-3 text-xs"><span className="truncate">{b.label}</span><span className="shrink-0 tabular-nums"><AnimatedNumber value={b.value} format={format}/> {unit}</span></span>
      <span className="h-3 overflow-hidden rounded-full bg-secondary"><motion.span key={replay} initial={{scaleX:reduce?1:0}} animate={{scaleX:1,width:`${Math.abs(b.value)/max*100}%`}} transition={{duration:reduce?0:1.1}} className={`block h-full origin-left rounded-full ${'bg-series'}`}/></span>
    </Button>{selected===b.key&&<p role="status" className="text-xs text-muted-foreground">{b.label} · {b.count.toLocaleString('pt-BR')} município(s) · {format(b.value)} {unit}</p>}
  </motion.div>)}</div>;
}
