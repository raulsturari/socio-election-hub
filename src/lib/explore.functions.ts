import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { PRESETS, SELECTABLE_X, exploreInputSchema, exploreRowSchema, aggregateBars, type ExploreData } from './explore';
import { X_VARIABLES } from './lab-variables';

export const getExplore = createServerFn({ method: 'GET' }).inputValidator((input: unknown) => exploreInputSchema.parse(input)).handler(async ({ data }): Promise<ExploreData> => {
  const { publicClient, selectAllPages } = await import('./supabase-public.server');
  const sb = publicClient();
  const preset = PRESETS.find(p => p.id === data.preset);
  const variable = X_VARIABLES.find(v => v.id === (preset && SELECTABLE_X.has(preset.id) && data.x ? data.x : preset?.x));
  if (!preset || !variable?.indicatorId) throw new Error('Indicador indisponível.');
  const { data: election, error } = await sb.from('elections').select('validated, year, round, updated_at').eq('id',data.electionId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!election?.validated) throw new Error('Eleição indisponível ou não validada.');
  const delta = preset.metric.endsWith('_delta');
  if (delta) {
    const base = await sb.from('elections').select('validated, year, round').eq('id',data.baseElectionId ?? 0).maybeSingle();
    if (base.error) throw new Error(base.error.message);
    if (election.year !== 2026 || !base.data?.validated || base.data.year !== 2022 || base.data.round !== election.round) throw new Error('Comparação exige 2026 e 2022 validados, no mesmo turno.');
  }
  const raw = await selectAllPages((from,to) => sb.rpc('lab_dataset', { _election_id:data.electionId, _x:variable.indicatorId ?? '', _metric:preset.metric === 'indicator' ? 'share' : preset.metric, ...(data.candidateNumber != null ? { _candidate_number:data.candidateNumber } : {}), ...(data.baseElectionId ? { _base_election_id:data.baseElectionId } : {}), ...(data.uf ? { _uf:data.uf } : {}) }).range(from,to));
  // Exact weighted aggregations need vote counts, not rounded municipal share multiplied back into totals.
  const counts = preset.kind === 'bars' && (preset.id === 'states' || preset.id === 'income-bands') ? await selectAllPages((from,to) => sb.from('municipal_results').select('ibge_code, votes, valid_votes, candidates!inner(number)').eq('election_id',data.electionId).eq('candidates.number',data.candidateNumber ?? -1).order('ibge_code').range(from,to)) : [];
  const voteMap = new Map(counts.map(r => [r.ibge_code,r]));
  const all = raw.filter(r => r.uf !== 'ZZ').map(r => exploreRowSchema.parse({ ibge_code:r.ibge_code, name:r.name, uf:r.uf, x:r.x, y:preset.metric === 'indicator' || preset.id === 'leader-bands' ? r.x : r.y, eligible:r.eligible, votes:voteMap.get(r.ibge_code)?.votes ?? null, valid:voteMap.get(r.ibge_code)?.valid_votes ?? null }));
  const rows = all.filter(r => r.y != null && ((preset.kind !== 'scatter' && preset.id !== 'income-bands') || r.x != null));
  const values = rows.map(r => r.y ?? 0);
  setResponseHeader('Cache-Control','public, max-age=600');
  const usesIndicator=preset.metric==='indicator'||preset.kind==='scatter'||preset.id==='income-bands'||preset.id==='leader-bands';
  return { rows:preset.kind === 'bars' && preset.id !== 'leader-bands' ? [] : preset.id === 'leader-bands' ? all : rows, bars:preset.kind === 'bars' && preset.id !== 'leader-bands' ? aggregateBars(rows,preset.id,data.minimum) : [], coverage:rows.length, missing:all.length-rows.length, source:`${preset.metric === 'indicator' ? '' : `TSE ${election.year} · ${election.round}º turno${delta?' + TSE 2022':''}`}${usesIndicator?`${preset.metric==='indicator'?'':' · '}${variable.source}`:''}`, unitX:variable.unit, labelX:variable.label, min:values.length ? Math.min(...values) : null, max:values.length ? Math.max(...values) : null, unavailable:rows.length ? null : 'Sem observações completas para esta seleção. Nenhum valor foi estimado.', updated:election.updated_at };
});
