import { queryOptions } from "@tanstack/react-query";
import { getMunicipalWinners } from "@/lib/municipal-winners.functions";

export const winnersQuery = (electionId: number, uf: string | null) => queryOptions({
  queryKey: ["municipal-winners", electionId, uf],
  queryFn: () => getMunicipalWinners({ data: { electionId, uf } }),
  staleTime: 10 * 60_000,
});