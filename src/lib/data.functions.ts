import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RENDA_INDICATOR = "renda_domiciliar_pc_media_2022";

export interface ElectionDTO { id: number; year: number; round: number; office: string; election_date: string | null }
export interface CandidateRow { candidate_id: number; number: number; ballot_name: string; party: string; votes: number; share: number | null }
export interface MunicipalityDTO { ibge_code: string; name: string; uf: string }
export interface ShareDTO { ibge_code: string; share: number | null; votes: number; valid_votes: number }
export interface ScatterPoint { ibge_code: string; name: string; uf: string; income: number; share: number }

/** Only elections whose reconciliation passed are exposed. */
export const getElections = createServerFn({ method: "GET" }).handler(async (): Promise<ElectionDTO[]> => {
  const { publicClient } = await import("./supabase-public.server");
  const { data, error } = await publicClient()
    .from("elections")
    .select("id, year, round, office, election_date")
    .eq("validated", true)
    .order("year")
    .order("round");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getMunicipalities = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ uf: z.string().length(2) }).parse(d))
  .handler(async ({ data }): Promise<MunicipalityDTO[]> => {
    const { publicClient } = await import("./supabase-public.server");
    const { data: rows, error } = await publicClient()
      .from("municipalities").select("ibge_code, name, uf").eq("uf", data.uf).order("name").limit(1000);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const summaryInput = z.object({
  electionId: z.number().int(),
  uf: z.string().length(2).nullable(),
  ibge: z.string().regex(/^\d{7}$/).nullable(),
});

export const getSummary = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => summaryInput.parse(d))
  .handler(async ({ data }): Promise<CandidateRow[]> => {
    const { publicClient } = await import("./supabase-public.server");
    const sb = publicClient();
    if (data.ibge) {
      const { data: rows, error } = await sb
        .from("municipal_results")
        .select("votes, share, candidates(id, number, ballot_name, party)")
        .eq("election_id", data.electionId)
        .eq("ibge_code", data.ibge)
        .order("votes", { ascending: false });
      if (error) throw new Error(error.message);
      return (rows ?? []).flatMap((r) =>
        r.candidates
          ? [{ candidate_id: r.candidates.id, number: r.candidates.number, ballot_name: r.candidates.ballot_name,
               party: r.candidates.party, votes: r.votes, share: r.share }]
          : [],
      );
    }
    const { data: rows, error } = await sb.rpc("election_summary", data.uf ? { _election_id: data.electionId, _uf: data.uf } : { _election_id: data.electionId });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ ...r, votes: Number(r.votes) }));
  });

const shareInput = z.object({ electionId: z.number().int(), candidateId: z.number().int(), uf: z.string().length(2).nullable() });

async function fetchShares(electionId: number, candidateId: number, uf: string | null) {
  const { publicClient, selectAllPages } = await import("./supabase-public.server");
  const sb = publicClient();
  return selectAllPages((from, to) => {
    let q = sb
      .from("municipal_results")
      .select("ibge_code, share, votes, valid_votes, municipalities!inner(name, uf)")
      .eq("election_id", electionId)
      .eq("candidate_id", candidateId)
      .order("ibge_code");
    if (uf) q = q.eq("municipalities.uf", uf);
    return q.range(from, to);
  });
}

export const getShares = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => shareInput.parse(d))
  .handler(async ({ data }): Promise<ShareDTO[]> => {
    const rows = await fetchShares(data.electionId, data.candidateId, data.uf);
    return rows.map((r) => ({ ibge_code: r.ibge_code, share: r.share, votes: r.votes, valid_votes: r.valid_votes }));
  });

export const getScatter = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => shareInput.parse(d))
  .handler(async ({ data }): Promise<ScatterPoint[]> => {
    const { publicClient, selectAllPages } = await import("./supabase-public.server");
    const sb = publicClient();
    const [shares, incomes] = await Promise.all([
      fetchShares(data.electionId, data.candidateId, data.uf),
      selectAllPages((from, to) =>
        sb.from("indicator_values").select("ibge_code, value").eq("indicator_id", RENDA_INDICATOR)
          .eq("year", 2022).not("value", "is", null).order("ibge_code").range(from, to),
      ),
    ]);
    const income = new Map(incomes.map((i) => [i.ibge_code, Number(i.value)]));
    return shares.flatMap((s) => {
      const inc = income.get(s.ibge_code);
      return inc === undefined || s.share === null
        ? []
        : [{ ibge_code: s.ibge_code, name: s.municipalities.name, uf: s.municipalities.uf, income: inc, share: Number(s.share) }];
    });
  });

export interface JobDTO {
  id: string; source_id: string; kind: string; status: string; source_url: string; file_name: string | null;
  file_sha256: string | null; source_last_modified: string | null; rows_read: number | null; rows_written: number | null;
  /** JSON-encoded reports (kept as strings to stay serializable). */
  coverage: string; integrity: string; error: string | null; started_at: string; finished_at: string | null;
}

export const getProvenance = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./supabase-public.server");
  const sb = publicClient();
  const [sources, jobs, indicators] = await Promise.all([
    sb.from("data_sources").select("id, name, url, description").order("id"),
    sb.from("import_jobs").select("id, source_id, kind, status, source_url, file_name, file_sha256, source_last_modified, rows_read, rows_written, coverage, integrity, error, started_at, finished_at")
      .order("started_at", { ascending: false }).limit(30),
    sb.from("indicators").select("id, name, unit, source_table, source_variable, methodology").order("id"),
  ]);
  const err = sources.error ?? jobs.error ?? indicators.error;
  if (err) throw new Error(err.message);
  const jobRows: JobDTO[] = (jobs.data ?? []).map((j) => ({
    ...j, coverage: JSON.stringify(j.coverage, null, 1), integrity: JSON.stringify(j.integrity, null, 1),
  }));
  return { sources: sources.data ?? [], jobs: jobRows, indicators: indicators.data ?? [] };
});

export interface TurnoutDTO {
  eligible: number; turnout: number; abstentions: number; valid_votes: number;
  blank_votes: number; null_votes: number; municipalities: number;
}

/** Turnout/abstention/blank/null from TSE detalhe_votacao_munzona; null when not imported. */
export const getTurnout = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => summaryInput.parse(d))
  .handler(async ({ data }): Promise<TurnoutDTO | null> => {
    const { publicClient } = await import("./supabase-public.server");
    const { data: rows, error } = await publicClient().rpc("turnout_summary", {
      _election_id: data.electionId, ...(data.uf ? { _uf: data.uf } : {}), ...(data.ibge ? { _ibge: data.ibge } : {}),
    });
    if (error) throw new Error(error.message);
    const r = rows?.[0];
    if (!r || !r.municipalities) return null;
    return {
      eligible: Number(r.eligible), turnout: Number(r.turnout), abstentions: Number(r.abstentions),
      valid_votes: Number(r.valid_votes), blank_votes: Number(r.blank_votes), null_votes: Number(r.null_votes),
      municipalities: Number(r.municipalities),
    };
  });
