import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import type { SourceId } from "@/lib/constants";

/**
 * Harmonized data contract. Every row is keyed by IBGE municipality code + year
 * and carries provenance. No dataset is bundled: until official files are
 * ingested and verified, services return empty arrays and the UI shows empty states.
 */
export const provenanceSchema = z.object({
  source: z.custom<SourceId>(),
  fileName: z.string(),
  fetchedAt: z.string(),
  checksum: z.string(),
  verified: z.boolean(),
});

export const municipalResultSchema = z.object({
  ibgeCode: z.string().length(7),
  year: z.number().int(),
  candidate: z.string(),
  votes: z.number().int().nonnegative(),
  validVotes: z.number().int().nonnegative(),
  provenance: provenanceSchema,
});
export type MunicipalResult = z.infer<typeof municipalResultSchema>;

export interface DatasetStatus {
  source: SourceId;
  loaded: boolean;
  rows: number | null;
  lastVerifiedAt: string | null;
}

// Placeholder repository: returns nothing until ingestion is connected.
async function fetchResults(_params: { year: number; uf: string | null }): Promise<MunicipalResult[]> {
  return [];
}

async function fetchStatuses(): Promise<DatasetStatus[]> {
  const sources: SourceId[] = ["TSE", "IBGE_SIDRA", "IPEA", "INEP", "DATASUS"];
  return sources.map((source) => ({ source, loaded: false, rows: null, lastVerifiedAt: null }));
}

export const resultsQuery = (year: number, uf: string | null) =>
  queryOptions({ queryKey: ["results", year, uf], queryFn: () => fetchResults({ year, uf }), staleTime: 300_000 });

export const statusesQuery = () =>
  queryOptions({ queryKey: ["dataset-statuses"], queryFn: fetchStatuses, staleTime: 60_000 });
