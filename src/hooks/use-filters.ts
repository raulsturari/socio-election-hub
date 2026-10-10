import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { resolveFilters, type FiltersSearch } from "@/lib/filters";
import { modeFrom, resolveDuel } from "@/lib/duel";
import { electionsQuery, summaryQuery } from "@/services/queries";

/** Reads the shared URL filters and resolves the validated election, the Bolsonaro × Lula pair and the analytical mode. */
export function useFilters() {
  const search = useSearch({ strict: false }) as FiltersSearch;
  const navigate = useNavigate();
  const f = resolveFilters(search);
  const { data: elections } = useSuspenseQuery(electionsQuery());
  const election = elections.find((e) => e.year === f.ano && e.round === f.turno) ?? null;
  const summary = useQuery({ ...summaryQuery(election?.id ?? 0, f.uf, f.mun), enabled: !!election });
  const candidates = summary.data ?? [];
  const duel = resolveDuel(candidates);
  const mode = modeFrom(f.modo ?? undefined, f.cand, duel);
  // Single-series consumers get the focused candidate; in comparison mode Bolsonaro is the primary series and Lula is read from `duel`.
  const candidate = mode === "lula" ? duel.lula : duel.bolsonaro ?? duel.lula;

  const set = (patch: Partial<FiltersSearch>) =>
    // Every content route validates the same filtersSchema, so a loose reducer is safe here.
    navigate({ to: ".", search: ((prev: FiltersSearch) => ({ ...prev, ...patch })) as never, replace: true });

  return { f, elections, election, summary, candidates, candidate, duel, mode, set };
}
export type FiltersCtx = ReturnType<typeof useFilters>;
