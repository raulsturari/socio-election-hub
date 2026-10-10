export type SeriesIdentity = 'bolsonaro' | 'pt' | 'outros' | 'missing' | 'indicator';
export interface CandidateIdentity { ballot_name: string; party?: string }
/** Identity only: ballot numbers and political positioning never determine colors. Every other candidacy is the single gray "Outros" group. */
export function candidateSeries(candidate: CandidateIdentity | null | undefined): SeriesIdentity {
  if (!candidate) return 'missing';
  const name = candidate.ballot_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (/\bBOLSONARO\b/.test(name)) return 'bolsonaro';
  if (candidate.party?.trim().toUpperCase() === 'PT' || /\bLULA\b/.test(name)) return 'pt';
  return 'outros';
}
