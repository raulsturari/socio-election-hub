import { queryOptions, keepPreviousData } from '@tanstack/react-query';
import { getExplore } from '@/lib/explore.functions';
import { exploreInputSchema } from '@/lib/explore';
import type { z } from 'zod';
import type { GeoCollection } from './queries';
export const exploreQuery = (input: z.infer<typeof exploreInputSchema>) => queryOptions({ queryKey:['explore',input], queryFn:() => getExplore({data:input}), staleTime:600000, placeholderData:keepPreviousData });
export const brazilMeshQuery = () => queryOptions({ queryKey:['mesh','BR'], staleTime:Infinity, queryFn:async ():Promise<GeoCollection> => {
  const res = await fetch('https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio');
  if (!res.ok) throw new Error('Mapa oficial IBGE indisponível.');
  return res.json();
} });
