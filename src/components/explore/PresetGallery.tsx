import { BarChart3, Map, ScatterChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRESETS } from '@/lib/explore';
export function PresetGallery({active,onSelect}:{active:string;onSelect:(id:string)=>void}) {
  return <section className="mt-8 pb-8"><h2 className="mb-4 text-xl font-semibold">Todas as análises</h2><div className="grid grid-cols-2 gap-3">{PRESETS.map((p,i)=>{
    const Icon=p.kind==='map'?Map:p.kind==='scatter'?ScatterChart:BarChart3;
    return <Button key={p.id} variant="secondary" onClick={()=>onSelect(p.id)} aria-pressed={active===p.id} className={`relative h-32 min-w-0 flex-col items-start justify-between whitespace-normal rounded-lg p-3 text-left ${active===p.id?'ring-1 ring-primary':''}`}>
      <span className="flex w-full justify-between text-muted-foreground"><Icon className="size-6"/><span className="text-xs tabular-nums">{String(i+1).padStart(2,'0')}</span></span>
      <span className="text-sm leading-tight">{p.subtitle}</span>
    </Button>;
  })}</div></section>;
}
