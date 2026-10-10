import { candidateSeries, type CandidateIdentity } from "@/lib/series-identity";
import { BarChart3, Map, ScatterChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRESETS,exploreInputSchema } from '@/lib/explore';
import type { z } from 'zod';
import { PresetThumbnail } from './PresetThumbnail';
export function PresetGallery({active,onSelect,input,candidate}:{active:string;onSelect:(id:string)=>void;input:z.infer<typeof exploreInputSchema>;candidate:CandidateIdentity|null}) {
  return <section className="mt-8 pb-8">{([['compare','Comparar candidatos'],['context','Contexto demográfico']] as const).map(([g,title])=><div key={g} className="mb-6"><h2 className="mb-1 text-xl font-semibold">{title}</h2><p className="mb-4 text-xs text-muted-foreground">{g==='compare'?'Os dois candidatos na mesma visualização, com votos reais. O tour percorre esta sequência.':'Indicadores, participação e mapas sociais; não são votação.'}</p><div className="grid grid-cols-2 gap-3">{PRESETS.map((p,i)=>p.group!==g?null:(()=>{
    const Icon=p.kind==='map'?Map:p.kind==='scatter'?ScatterChart:BarChart3;
    return <Button data-series={p.metric==='share'||p.metric==='share_delta'?candidateSeries(candidate):'indicator'} key={p.id} variant="secondary" onClick={()=>onSelect(p.id)} aria-pressed={active===p.id} className={`relative h-44 min-w-0 flex-col items-start justify-between whitespace-normal rounded-lg p-3 text-left ${active===p.id?'ring-1 ring-primary':''}`}>
      <span className="flex w-full justify-between text-muted-foreground"><Icon className="size-6"/><span className="text-xs tabular-nums">{String(i+1).padStart(2,'0')}</span></span>
      <PresetThumbnail preset={p} input={input}/><span className="text-sm leading-tight">{p.subtitle}</span>
    </Button>;
  })())}</div></div>)}</section>;
}
