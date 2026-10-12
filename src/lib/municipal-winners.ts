import { z } from "zod";
import { candidateSeries, type CandidateIdentity } from "./series-identity";

export const winnerVoteSchema = z.object({
  ibge_code: z.string().regex(/^\d{7}$/),
  candidate_id: z.number().int(), votes: z.number().nonnegative(),
  municipalities: z.object({ name: z.string(), uf: z.string() }),
});
export type WinnerVote = z.infer<typeof winnerVoteSchema>;
export interface WinnerCandidate extends CandidateIdentity { candidate_id: number }
export interface MunicipalWinner {
  ibge_code: string; name: string; uf: string; votes: number; valid: number;
  candidates: WinnerCandidate[];
  series: "bolsonaro" | "pt" | "outros" | "tie" | "missing";
}

/** Compare raw candidacies, not the aggregated Others group. Source integers have no rounding tolerance. */
export function municipalWinners(rows: readonly WinnerVote[], candidates: readonly WinnerCandidate[]): MunicipalWinner[] {
  const identities = new Map(candidates.map((c) => [c.candidate_id, c]));
  const totals = new Map<string, MunicipalWinner>();
  for (const row of rows) {
    const candidate = identities.get(row.candidate_id);
    if (!candidate) throw new Error("Candidatura sem identificação na eleição.");
    const current = totals.get(row.ibge_code) ?? {
      ibge_code: row.ibge_code, ...row.municipalities, votes: -1, valid: 0,
      candidates: [], series: "missing" as const,
    };
    current.valid += row.votes;
    if (row.votes > current.votes) { current.votes = row.votes; current.candidates = [candidate]; }
    else if (row.votes === current.votes) current.candidates.push(candidate);
    totals.set(row.ibge_code, current);
  }
  return [...totals.values()].map((m) => ({
    ...m, series: m.valid <= 0 ? "missing" : m.candidates.length > 1 ? "tie" :
      candidateSeries(m.candidates[0]) as "bolsonaro" | "pt" | "outros",
  }));
}