import { queryOptions } from "@tanstack/react-query";
import { getElections, getMunicipalities, getProvenance, getScatter, getShares, getSummary } from "@/lib/data.functions";

const LONG = 10 * 60_000;

export const electionsQuery = () =>
  queryOptions({ queryKey: ["elections"], queryFn: () => getElections(), staleTime: LONG });

export const municipalitiesQuery = (uf: string) =>
  queryOptions({ queryKey: ["municipalities", uf], queryFn: () => getMunicipalities({ data: { uf } }), staleTime: LONG });

export const summaryQuery = (electionId: number, uf: string | null, ibge: string | null) =>
  queryOptions({ queryKey: ["summary", electionId, uf, ibge], queryFn: () => getSummary({ data: { electionId, uf, ibge } }), staleTime: LONG });

export const sharesQuery = (electionId: number, candidateId: number, uf: string | null) =>
  queryOptions({ queryKey: ["shares", electionId, candidateId, uf], queryFn: () => getShares({ data: { electionId, candidateId, uf } }), staleTime: LONG });

export const scatterQuery = (electionId: number, candidateId: number, uf: string | null) =>
  queryOptions({ queryKey: ["scatter", electionId, candidateId, uf], queryFn: () => getScatter({ data: { electionId, candidateId, uf } }), staleTime: LONG });

export const provenanceQuery = () =>
  queryOptions({ queryKey: ["provenance"], queryFn: () => getProvenance(), staleTime: 60_000 });

/** Official municipal mesh (IBGE Malhas API v3), fetched directly from IBGE. */
export const meshQuery = (uf: string) =>
  queryOptions({
    queryKey: ["mesh", uf],
    staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${uf}?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio`,
      );
      if (!res.ok) throw new Error(`Malha IBGE indisponível (${res.status})`);
      return (await res.json()) as GeoCollection;
    },
  });

export interface GeoFeature {
  properties: { codarea: string };
  geometry: { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };
}
export interface GeoCollection { features: GeoFeature[] }
