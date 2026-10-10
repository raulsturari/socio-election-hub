import { describe, expect, it } from 'vitest';
import { candidateSeries } from './series-identity';
describe('explicit series identity',()=>{
  it('recognizes Bolsonaro names across years',()=>{
    expect(candidateSeries({ballot_name:'FLÁVIO BOLSONARO',party:'PL'})).toBe('bolsonaro');
    expect(candidateSeries({ballot_name:'JAIR BOLSONARO',party:'PL'})).toBe('bolsonaro');
  });
  it('recognizes Lula and PT only',()=>{
    expect(candidateSeries({ballot_name:'LULA'})).toBe('pt');
    expect(candidateSeries({ballot_name:'Outro nome',party:'PT'})).toBe('pt');
  });
  it('does not infer political positioning or party alliances',()=>{
    expect(candidateSeries({ballot_name:'Outro candidato',party:'PL'})).toBe('outros');
    expect(candidateSeries({ballot_name:'Outro candidato',party:'PSOL'})).toBe('outros');
    expect(candidateSeries(null)).toBe('missing');
  });
});