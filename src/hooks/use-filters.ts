import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { resolveFilters, type FiltersSearch } from "@/lib/filters";
import { electionsQuery, summaryQuery } from "@/services/queries";

/** Reads the shared URL filters and resolves the validated election + selected candidate. */
export function useFilters() {
  const search = useSearch({ strict: false }) as FiltersSearch;
  const navigate = useNavigate();
  const f = resolveFilters(search);
  const { data: elections } = useSuspenseQuery(electionsQuery());
  const election = elections.find((e) => e.year === f.ano && e.round === f.turno) ?? null;
  const summary = useQuery({ ...summaryQuery(election?.id ?? 0, f.uf, f.mun), enabled: !!election });
  const candidates = summary.data ?? [];
  const candidate = candidates.find((c) => c.number === f.cand) ?? candidates[0] ?? null;

  const set = (patch: Partial<FiltersSearch>) =>
    navigate({ to: ".", search: (prev: FiltersSearch) => ({ ...prev, ...patch }), replace: true });

  return { f, elections, election, summary, candidates, candidate, set };
}
