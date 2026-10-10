import type { ReactNode } from 'react';
import { candidateSeries, type CandidateIdentity } from '@/lib/series-identity';
export function SeriesScope({ candidate, electoral = true, children }: { candidate?: CandidateIdentity | null; electoral?: boolean; children: ReactNode }) {
  return <div data-series={electoral ? candidateSeries(candidate) : 'indicator'}>
    {electoral && <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Legenda da série"><span className="size-3 shrink-0 rounded-full bg-series" aria-hidden/>{candidate ? `${candidate.ballot_name} · ${candidate.party ?? '—'}` : 'Série indisponível'} · cinza: sem dados</p>}
    {children}
  </div>;
}