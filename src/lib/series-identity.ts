export type SeriesIdentity = 'bolsonaro' | 'pt' | 'neutral-1' | 'neutral-2' | 'neutral-3' | 'missing' | 'indicator';
export interface CandidateIdentity { ballot_name: string; party?: string }
/** Identity only: ballot numbers and political positioning never determine colors. */
export function candidateSeries(candidate: CandidateIdentity | null | undefined): SeriesIdentity {
  if (!candidate) return 'missing';
  const name = candidate.ballot_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (/\bBOLSONARO\b/.test(name)) return 'bolsonaro';
  if (candidate.party?.trim().toUpperCase() === 'PT' || /\bLULA\b/.test(name)) return 'pt';
  const hash = [...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return (['neutral-1', 'neutral-2', 'neutral-3'] as const)[hash % 3] ?? 'neutral-1';
}