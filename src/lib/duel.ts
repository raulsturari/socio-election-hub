import { z } from "zod";
import { candidateSeries, type CandidateIdentity } from "./series-identity";

/** Analytical grouping: Bolsonaro, Lula/PT, everyone else summed as "Outros". Raw candidates stay intact in the database. */
export type DuelMode = "comparar" | "bolsonaro" | "lula";
export const DUEL_MODES = ["comparar", "bolsonaro", "lula"] as const;
export type DuelGroup = "bolsonaro" | "pt" | "outros";

export interface DuelCandidate extends CandidateIdentity { candidate_id: number; number: number; party: string }
export interface DuelPair<C extends DuelCandidate = DuelCandidate> { bolsonaro: C | null; lula: C | null }

/** Resolves the two focus candidacies by explicit identity inside one election (never by ballot number). */
export function resolveDuel<C extends DuelCandidate>(candidates: readonly C[]): DuelPair<C> {
  return {
    bolsonaro: candidates.find((c) => candidateSeries(c) === "bolsonaro") ?? null,
    lula: candidates.find((c) => candidateSeries(c) === "pt") ?? null,
  };
}

/** Explicit legacy `cand` links map to a mode; secondary candidates fall back to comparison. */
export function modeFrom(explicit: DuelMode | undefined, cand: number | null, pair: DuelPair): DuelMode {
  if (explicit) return explicit;
  if (cand != null && pair.bolsonaro?.number === cand) return "bolsonaro";
  if (cand != null && pair.lula?.number === cand) return "lula";
  return "comparar";
}

/** Correct person per year: Jair (2022) and Flávio (2026) are never merged under one name. */
export function bolsonaroName(year: number): string {
  return year >= 2026 ? "Flávio Bolsonaro" : year === 2022 || year === 2018 ? "Jair Bolsonaro" : "Bolsonaro";
}
export function displayName(group: DuelGroup, year: number, candidate?: CandidateIdentity | null): string {
  if (group === "outros") return "Outros";
  if (group === "pt") return "Lula";
  const raw = candidate?.ballot_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() ?? "";
  if (raw.includes("FLAVIO")) return "Flávio Bolsonaro";
  if (raw.includes("JAIR")) return "Jair Bolsonaro";
  return bolsonaroName(year);
}
export const duelTitle = (year: number) => `${bolsonaroName(year)} × Lula`;

export interface GroupShare { group: DuelGroup; votes: number | null; share: number | null }
export interface DuelSummary { valid: number; bolsonaro: GroupShare; lula: GroupShare; outros: GroupShare }

const share = (votes: number | null, valid: number) => (votes == null || valid <= 0 ? null : (100 * votes) / valid);

/**
 * Groups a full candidate list of one cut. Denominator = sum of ALL candidates' valid votes,
 * Outros = sum of every other candidacy's votes (ratio of sums, never an average of percentages).
 */
export function groupSummary(rows: readonly { ballot_name: string; party?: string; votes: number }[]): DuelSummary | null {
  if (!rows.length) return null;
  let valid = 0, b: number | null = null, l: number | null = null, o = 0;
  for (const r of rows) {
    valid += r.votes;
    const s = candidateSeries(r);
    if (s === "bolsonaro") b = (b ?? 0) + r.votes;
    else if (s === "pt") l = (l ?? 0) + r.votes;
    else o += r.votes;
  }
  return {
    valid,
    bolsonaro: { group: "bolsonaro", votes: b, share: share(b, valid) },
    lula: { group: "pt", votes: l, share: share(l, valid) },
    outros: { group: "outros", votes: o, share: share(o, valid) },
  };
}

export const duelRowSchema = z.object({
  ibge_code: z.string(), name: z.string(), uf: z.string(),
  b_votes: z.coerce.number().nullable(), l_votes: z.coerce.number().nullable(), valid_votes: z.coerce.number().nullable(),
});
export type DuelRow = z.infer<typeof duelRowSchema>;

export interface DuelMunicipality { ibge_code: string; name: string; uf: string; valid: number | null; b: GroupShare; l: GroupShare; o: GroupShare; advantage: number | null }

/** Per-municipality grouping; advantage = Bolsonaro share − Lula share in p.p. Missing stays null, never zero. */
export function duelMunicipality(r: DuelRow): DuelMunicipality {
  const valid = r.valid_votes;
  const o = valid == null || r.b_votes == null || r.l_votes == null ? null : valid - r.b_votes - r.l_votes;
  const b = { group: "bolsonaro" as const, votes: r.b_votes, share: valid == null ? null : share(r.b_votes, valid) };
  const l = { group: "pt" as const, votes: r.l_votes, share: valid == null ? null : share(r.l_votes, valid) };
  return {
    ibge_code: r.ibge_code, name: r.name, uf: r.uf, valid, b, l,
    o: { group: "outros", votes: o, share: valid == null ? null : share(o, valid) },
    advantage: b.share == null || l.share == null ? null : b.share - l.share,
  };
}

/** Ratio-of-sums aggregation of municipal duel rows, e.g. by UF. */
export function aggregateDuel(rows: readonly DuelRow[], keyOf: (r: DuelRow) => string | null) {
  const acc = new Map<string, { b: number; l: number; valid: number; count: number }>();
  for (const r of rows) {
    const k = keyOf(r);
    if (k == null || r.valid_votes == null || r.b_votes == null || r.l_votes == null) continue;
    const g = acc.get(k) ?? { b: 0, l: 0, valid: 0, count: 0 };
    g.b += r.b_votes; g.l += r.l_votes; g.valid += r.valid_votes; g.count++;
    acc.set(k, g);
  }
  return [...acc].map(([key, g]) => ({
    key, count: g.count, valid: g.valid,
    b: share(g.b, g.valid) ?? 0, l: share(g.l, g.valid) ?? 0, o: share(g.valid - g.b - g.l, g.valid) ?? 0,
  }));
}
