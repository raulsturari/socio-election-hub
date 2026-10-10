import { z } from "zod";
import { ELECTION_YEARS, UFS } from "./constants";

/** Shared URL search state (survives refresh, shareable). */
export const filtersSchema = z.object({
  ano: z.coerce.number().refine((y) => (ELECTION_YEARS as readonly number[]).includes(y)).optional().catch(undefined),
  turno: z.coerce.number().refine((t) => t === 1 || t === 2).optional().catch(undefined),
  uf: z.enum(UFS).optional().catch(undefined),
  mun: z.string().regex(/^\d{7}$/).optional().catch(undefined),
  cand: z.coerce.number().int().optional().catch(undefined),
});
export type FiltersSearch = z.infer<typeof filtersSchema>;

export interface Filters { ano: number; turno: number; uf: string | null; mun: string | null; cand: number | null }

export function resolveFilters(s: FiltersSearch): Filters {
  // Padrão global: 1º turno de 2026 (última eleição validada). Escolhas explícitas na URL sempre vencem.
  return { ano: s.ano ?? 2026, turno: s.turno ?? 1, uf: s.uf ?? null, mun: s.uf ? s.mun ?? null : null, cand: s.cand ?? null };
}
