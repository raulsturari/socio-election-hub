import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { labInputSchema, REGIONS, X_VARIABLES } from "./lab-variables";
import { analyze, type LabAnalysis, type LabRow } from "./lab-analysis";

/** Statistics computed server-side over every municipality; the phone receives only points + results. */
export const getLab = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => labInputSchema.parse(d))
  .handler(async ({ data }): Promise<LabAnalysis | { unavailable: string }> => {
    const xv = X_VARIABLES.find((v) => v.id === data.x);
    if (!xv?.indicatorId) return { unavailable: `${xv?.label ?? data.x}: fonte ainda não importada.` };
    const { publicClient, selectAllPages } = await import("./supabase-public.server");
    const sb = publicClient();
    const rows = await selectAllPages((from, to) =>
      sb.rpc("lab_dataset", {
        _election_id: data.electionId, _metric: data.metric, _x: xv.indicatorId!,
        ...(data.candidateNumber != null ? { _candidate_number: data.candidateNumber } : {}),
        ...(data.baseElectionId != null ? { _base_election_id: data.baseElectionId } : {}),
        ...(data.uf ? { _uf: data.uf } : {}),
      }).range(from, to),
    );
    const prefix = REGIONS.find((r) => r.id === data.region)?.prefix;
    const typed: LabRow[] = rows
      .filter((r) => !prefix || r.ibge_code.startsWith(prefix))
      .map((r) => ({
        ibge_code: r.ibge_code, name: r.name, uf: r.uf,
        y: r.y == null ? null : Number(r.y), x: r.x == null ? null : Number(r.x),
        renda: r.renda == null ? null : Number(r.renda), superior: r.superior == null ? null : Number(r.superior),
        populacao: r.populacao == null ? null : Number(r.populacao),
      }));
    setResponseHeader("Cache-Control", "public, max-age=600");
    return analyze(typed, xv, !data.uf);
  });

export interface AuditDTO {
  validated: boolean; resultsReconciled: boolean | null; turnoutReconciled: boolean | null;
  municipalitiesInResults: number; municipalitiesRegistered: number; exteriorExcludedVotes: number | null;
  resultsJobAt: string | null;
}

/** Audit seal: validated flag + reconciliation recorded by the importer for this election's files. */
export const getAudit = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ electionId: z.number().int() }).parse(d))
  .handler(async ({ data }): Promise<AuditDTO | null> => {
    const { publicClient } = await import("./supabase-public.server");
    const sb = publicClient();
    const { data: el, error } = await sb.from("elections").select("year, round, validated").eq("id", data.electionId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!el) return null;
    const [jobs, turnout, muns] = await Promise.all([
      sb.from("import_jobs").select("kind, integrity, finished_at").eq("status", "succeeded")
        .like("kind", `%_${el.year}_%`).order("finished_at", { ascending: false }).limit(20),
      sb.from("municipal_turnout").select("ibge_code", { count: "exact", head: true }).eq("election_id", data.electionId),
      sb.from("municipalities").select("ibge_code", { count: "exact", head: true }),
    ]);
    const err = jobs.error ?? turnout.error ?? muns.error;
    if (err) throw new Error(err.message);
    const roundOf = (kind: string) => {
      const j = (jobs.data ?? []).find((x) => x.kind.startsWith(kind));
      const integ = j?.integrity as Record<string, { reconciled?: boolean; exterior_excluded?: number } | undefined> | undefined;
      return { job: j, r: integ?.[`round_${el.round}`] };
    };
    const res = roundOf("votacao_candidato_munzona"), det = roundOf("detalhe_votacao_munzona");
    return {
      validated: el.validated, resultsReconciled: res.r?.reconciled ?? null, turnoutReconciled: det.r?.reconciled ?? null,
      municipalitiesInResults: turnout.count ?? 0, municipalitiesRegistered: muns.count ?? 0,
      exteriorExcludedVotes: res.r?.exterior_excluded ?? null, resultsJobAt: res.job?.finished_at ?? null,
    };
  });
