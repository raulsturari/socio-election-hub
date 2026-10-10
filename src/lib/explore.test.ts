import { describe,it,expect } from 'vitest';
import { aggregateBars,PRESETS,nextInGroup,type ExploreRow } from './explore';
import { resolveFilters,filtersSchema } from './filters';
const row=(code:string,y:number,votes:number,valid:number,x=600):ExploreRow=>({ibge_code:code,name:code,uf:'SP',y,x,votes,valid,eligible:valid});
describe('exploration real-data calculations',()=>{
 it('keeps all presets, opens with comparison and separates demographic context',()=>{expect(PRESETS).toHaveLength(22);expect(PRESETS.slice(0,3).map(p=>p.id)).toEqual(['leader-bands','vote-map','states']);expect(PRESETS.filter(p=>p.group==='compare').every(p=>p.metric==='share'||p.metric==='share_delta')).toBe(true);expect(nextInGroup('vote-ranking')).toBe('leader-bands');expect(nextInGroup('indicator-map')).toBe('abstention-map');});
 it('weights state vote share by exact votes, not municipal percentages',()=>{const bars=aggregateBars([row('1',10,10,100),row('2',90,900,1000)],'states',0);expect(bars[0]?.value).toBeCloseTo(910/1100*100,10);});
 it('applies electorate cut and stable ranking',()=>{const bars=aggregateBars([row('1',99,99,100),row('2',60,600,1000)],'vote-ranking',500);expect(bars.map(b=>b.key)).toEqual(['2']);});
 it('excludes missing income instead of assigning a band',()=>{const missing={...row('1',50,50,100),x:null};expect(aggregateBars([missing],'income-bands',0)).toEqual([]);});
 it('uses 2026 first round only when URL is unspecified',()=>{expect(resolveFilters({})).toMatchObject({ano:2026,turno:1});expect(resolveFilters(filtersSchema.parse({ano:'2022',turno:'2'}))).toMatchObject({ano:2022,turno:2});});
});
