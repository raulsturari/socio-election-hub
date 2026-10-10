import { BarChart3, Map, ScatterChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRESETS,exploreInputSchema } from '@/lib/explore';
import type { z } from 'zod';
import { PresetThumbnail } from './PresetThumbnail';
export function PresetGallery({active,onSelect,input}:{active:string;onSelect:(id:string)=>void;input:z.infer<typeof exploreInputSchema>}) {
  return <section className="mt-8 pb-8"><h2 className="mb-4 text-xl font-semibold">Todas as análises</h2><div className="grid grid-cols-2 gap-3">{PRESETS.map((p,i)=>{
    const Icon=p.kind==='map'?Map:p.kind==='scatter'?ScatterChart:BarChart3;
    return <Button key={p.id} variant="secondary" onClick={()=>onSelect(p.id)} aria-pressed={active===p.id} className={`relative h-44 min-w-0 flex-col items-start justify-between whitespace-normal rounded-lg p-3 text-left ${active===p.id?'ring-1 ring-primary':''}`}>
      <span className="flex w-full justify-between text-muted-foreground"><Icon className="size-6"/><span className="text-xs tabular-nums">{String(i+1).padStart(2,'0')}</span></span>
      <PresetThumbnail preset={p} input={input}/><span className="text-sm leading-tight">{p.subtitle}</span>
    </Button>;
  })}</div></section>;
}
